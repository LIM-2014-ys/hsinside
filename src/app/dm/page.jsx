'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function DMPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 대화방 및 선택된 방 상태
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  // 채팅 메시지 및 멤버 상태
  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 모바일 레이아웃 상태
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // 토스트 메시지 상태 (alert 대체)
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });

  // 🔍 유저 검색 모달
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 👥 그룹 채팅 모달
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [availableGroupUsers, setAvailableGroupUsers] = useState([]);
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState([]);
  const [groupNameInput, setGroupNameInput] = useState('');

  const showToast = (text, type = 'error') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg({ type: '', text: '' }), 3000);
  };

  // 1. 유저 인증 확인
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);
    };
    initUser();
  }, [router]);

  // 2. 참여 중인 대화방 목록 + 안 읽은 메시지 수 계산
  const fetchMyRooms = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data: myMemberships } = await supabase
        .from('chat_room_members')
        .select('room_id, last_read_at')
        .eq('user_id', currentUser.id);

      if (!myMemberships || myMemberships.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const roomIds = myMemberships.map((m) => m.room_id);

      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          members:chat_room_members(*, profiles:user_id(*)),
          messages:chat_messages(id, content, created_at, sender_id)
        `)
        .in('id', roomIds);

      if (roomData) {
        const processedRooms = roomData.map((room) => {
          const sortedMsgs = (room.messages || []).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          const latestMsgObj = sortedMsgs[0];

          const myMember = room.members?.find((m) => m.user_id === currentUser.id);
          const lastReadTime = myMember?.last_read_at
            ? new Date(myMember.last_read_at).getTime()
            : 0;

          // 내가 안 읽은 상대방 메시지 카운트
          const unreadCount = sortedMsgs.filter(
            (m) =>
              m.sender_id !== currentUser.id &&
              new Date(m.created_at).getTime() > lastReadTime + 500
          ).length;

          return {
            ...room,
            latestMsg: latestMsgObj?.content || '대화가 시작되었습니다.',
            latestMsgTime: latestMsgObj?.created_at || room.created_at,
            unreadCount,
          };
        });

        // 최신 메시지 순 정렬
        processedRooms.sort(
          (a, b) => new Date(b.latestMsgTime) - new Date(a.latestMsgTime)
        );

        setRooms(processedRooms);
      }
    } catch (err) {
      console.error('대화방 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  // 3. 읽음 상태(last_read_at) DB 및 로컬 즉시 업데이트 (숫자 차감)
  const updateLastRead = useCallback(async (roomId) => {
    if (!currentUser || !roomId) return;
    const nowISO = new Date().toISOString();

    // 로컬 상태 카운트 즉시 0 처리
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r))
    );

    await supabase
      .from('chat_room_members')
      .update({ last_read_at: nowISO })
      .eq('room_id', roomId)
      .eq('user_id', currentUser.id);
  }, [currentUser]);

  // 4. 채팅방 선택 & 메시지 로드
  const loadRoomDetails = useCallback(async (room) => {
    setActiveRoom(room);
    setShowMobileSidebar(false);

    const { data: msgData } = await supabase
      .from('chat_messages')
      .select('*, profiles:sender_id(*)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });

    if (msgData) setMessages(msgData);

    const { data: memData } = await supabase
      .from('chat_room_members')
      .select('*, profiles:user_id(*)')
      .eq('room_id', room.id);

    if (memData) setRoomMembers(memData);

    // 읽음 처리 (안 읽은 숫자 0으로 감소)
    updateLastRead(room.id);
  }, [updateLastRead]);

  // 5. 🔥 글로벌 Realtime 실시간 대화 수신 및 안 읽은 수 동기화
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('global-chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMsg = payload.new;

          // 발신자 프로필 가져오기
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single();

          const fullMsg = { ...newMsg, profiles: senderProfile };

          // 현재 열려 있는 방의 메시지인 경우 -> 메시지 추가 및 읽음 처리
          if (activeRoom && activeRoom.id === newMsg.room_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, fullMsg];
            });

            if (newMsg.sender_id !== currentUser.id) {
              updateLastRead(newMsg.room_id);
            }
          }

          // 대화방 목록 및 안 읽은 수 실시간 갱신
          fetchMyRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_room_members' },
        () => {
          fetchMyRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeRoom, fetchMyRooms, updateLastRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeRoom || !currentUser || sending) return;

    setSending(true);
    const content = inputMessage.trim();
    setInputMessage('');

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ room_id: activeRoom.id, sender_id: currentUser.id, content }])
        .select('*, profiles:sender_id(*)')
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
        updateLastRead(activeRoom.id);

        // 푸시 알림 발송
        const otherMembers = roomMembers.filter((m) => m.user_id !== currentUser.id);
        const myName = currentUser.user_metadata?.display_name || '누군가';

        otherMembers.forEach((m) => {
          if (m.profiles?.email) {
            fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetEmail: m.profiles.email,
                title: `💬 ${activeRoom.is_group ? activeRoom.name : myName}`,
                body: content,
                url: `/dm`,
              }),
            }).catch((err) => console.error('푸시 에러:', err));
          }
        });
      }
    } catch (err) {
      console.error('메시지 전송 오류:', err);
      showToast('메시지 전송 실패: DB 권한 설정을 확인해 주세요.');
    } finally {
      setSending(false);
    }
  };

  // 유저 검색
  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUser) return;

    setSearching(true);
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .or(`display_name.ilike.%${searchQuery.trim()}%,nickname.ilike.%${searchQuery.trim()}%`)
        .limit(10);

      if (!users) {
        setSearchResults([]);
        return;
      }

      const { data: myFollowings } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);

      const { data: myFollowers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUser.id);

      const followingSet = new Set(myFollowings?.map((f) => f.following_id));
      const followerSet = new Set(myFollowers?.map((f) => f.follower_id));

      const processedResults = users.map((u) => {
        const iFollow = followingSet.has(u.id);
        const theyFollow = followerSet.has(u.id);
        const isMutual = iFollow && theyFollow;

        return {
          ...u,
          iFollow,
          theyFollow,
          isMutual,
          canDM: theyFollow || isMutual,
        };
      });

      setSearchResults(processedResults);
    } catch (err) {
      console.error('유저 검색 에러:', err);
    } finally {
      setSearching(false);
    }
  };

  const toggleFollowInSearch = async (targetUser) => {
    if (!currentUser) return;

    try {
      if (targetUser.iFollow) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUser.id);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: targetUser.id }]);
      }

      setSearchResults((prev) =>
        prev.map((u) => {
          if (u.id === targetUser.id) {
            const nextIFollow = !u.iFollow;
            const nextMutual = nextIFollow && u.theyFollow;
            return {
              ...u,
              iFollow: nextIFollow,
              isMutual: nextMutual,
              canDM: u.theyFollow || nextMutual,
            };
          }
          return u;
        })
      );
    } catch (err) {
      console.error('팔로우 처리 에러:', err);
    }
  };

  // 1:1 대화 개설
  const startOneOnOneChat = async (targetUser) => {
    if (!targetUser.canDM) {
      showToast('상대방이 회원님을 팔로우하고 있어야 메시지를 보낼 수 있습니다.');
      return;
    }

    try {
      const { data: existingRooms } = await supabase
        .from('chat_rooms')
        .select('*, members:chat_room_members(*)')
        .eq('is_group', false);

      const foundRoom = existingRooms?.find((r) => {
        const memberIds = r.members.map((m) => m.user_id);
        return memberIds.includes(currentUser.id) && memberIds.includes(targetUser.id);
      });

      if (foundRoom) {
        setIsSearchModalOpen(false);
        fetchMyRooms();
        loadRoomDetails(foundRoom);
        return;
      }

      const targetName = targetUser.display_name || targetUser.nickname || '상대방';
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert([{ name: targetName, is_group: false }])
        .select()
        .single();

      if (roomErr) throw roomErr;

      await supabase.from('chat_room_members').insert([
        { room_id: newRoom.id, user_id: currentUser.id },
        { room_id: newRoom.id, user_id: targetUser.id },
      ]);

      setIsSearchModalOpen(false);
      fetchMyRooms();
      loadRoomDetails(newRoom);
    } catch (err) {
      console.error('1:1 채팅 개설 에러:', err);
      showToast('채팅방을 생성할 수 없습니다.');
    }
  };

  // 그룹 채팅 개설
  const openGroupModal = async () => {
    if (!currentUser) return;
    setIsGroupModalOpen(true);

    const { data: myFollowers } = await supabase
      .from('follows')
      .select('follower_id, profiles:follower_id(*)')
      .eq('following_id', currentUser.id);

    const validUsers = myFollowers?.map((f) => f.profiles).filter(Boolean) || [];
    setAvailableGroupUsers(validUsers);
  };

  const createGroupChat = async () => {
    if (selectedGroupUserIds.length < 1) {
      showToast('최소 1명 이상의 상대를 선택해 주세요.');
      return;
    }

    const name = groupNameInput.trim() || `그룹 채팅 (${selectedGroupUserIds.length + 1}명)`;
    const allMemberIds = [...new Set([...selectedGroupUserIds, currentUser.id])];

    try {
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert([{ name, is_group: true }])
        .select()
        .single();

      if (roomErr) throw roomErr;

      const memberPayload = allMemberIds.map((uid) => ({
        room_id: newRoom.id,
        user_id: uid,
      }));

      await supabase.from('chat_room_members').insert(memberPayload);

      setIsGroupModalOpen(false);
      setSelectedGroupUserIds([]);
      setGroupNameInput('');
      fetchMyRooms();
      loadRoomDetails(newRoom);
    } catch (err) {
      console.error('그룹 채팅 생성 실패:', err);
      showToast('그룹 채팅 생성 실패: DB 권한을 확인해 주세요.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-12 text-center text-gray-400 font-bold text-xs">
        💬 DM 메시지 목록을 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-4 px-2 sm:px-4 font-sans text-xs">
      {/* 토스트 안내 */}
      {toastMsg.text && (
        <div
          className={`mb-3 p-3 rounded-2xl text-xs font-bold transition shadow-xs ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-3xl shadow-xl h-[82vh] flex overflow-hidden">
        {/* 👈 [좌측] 대화방 목록 */}
        <div
          className={`${
            showMobileSidebar ? 'flex' : 'hidden md:flex'
          } w-full md:w-80 flex-col border-r border-gray-100 bg-gray-50/50 shrink-0`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h1 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
              💬 DM / 채팅함
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-[10.5px] transition"
              >
                🔍 찾기
              </button>
              <button
                onClick={openGroupModal}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10.5px] transition shadow-xs"
              >
                + 그룹
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-medium text-[11px]">
                참여 중인 대화방이 없습니다.
              </div>
            ) : (
              rooms.map((room) => {
                const isActive = activeRoom?.id === room.id;
                const partnerMember = room.members?.find((m) => m.user_id !== currentUser?.id);
                const partnerName =
                  partnerMember?.profiles?.display_name ||
                  partnerMember?.profiles?.nickname ||
                  '상대방';

                const roomDisplayName = room.is_group ? room.name : partnerName;

                return (
                  <div
                    key={room.id}
                    onClick={() => loadRoomDetails(room)}
                    className={`p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 relative ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-white active:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        isActive ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {room.is_group ? '👥' : roomDisplayName[0]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-xs truncate">{roomDisplayName}</h2>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {new Date(room.latestMsgTime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        {room.latestMsg}
                      </p>
                    </div>

                    {/* 🔥 안 읽은 메시지 배지 카운트 */}
                    {room.unreadCount > 0 && !isActive && (
                      <span className="bg-amber-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 👉 [우측] 채팅 대화창 */}
        <div
          className={`${
            !showMobileSidebar ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-white`}
        >
          {activeRoom ? (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="md:hidden px-2.5 py-1 bg-gray-100 text-gray-700 rounded-xl font-bold text-[11px]"
                  >
                    ← 목록
                  </button>

                  <div>
                    <h2 className="font-black text-xs text-gray-900 truncate">
                      {activeRoom.is_group
                        ? activeRoom.name
                        : roomMembers.find((m) => m.user_id !== currentUser?.id)?.profiles?.display_name || '1:1 DM'}
                    </h2>
                    <p className="text-[9px] text-emerald-600 font-semibold">● 실시간 연결됨</p>
                  </div>
                </div>

                <Link
                  href="/"
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-[10px]"
                >
                  메인으로
                </Link>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-gray-400">
                    <span className="text-3xl">💬</span>
                    <p className="text-[11px] font-medium">첫 메시지를 보내 대화를 시작해보세요!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === currentUser?.id;
                    const senderName = msg.profiles?.display_name || msg.profiles?.nickname || '익명';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-0.5`}
                      >
                        {!isMine && (
                          <span className="text-[9.5px] font-bold text-gray-500 ml-1">
                            {senderName}
                          </span>
                        )}

                        <div className="flex items-end gap-1.5 max-w-[80%]">
                          {isMine && (
                            <span className="text-[8.5px] text-gray-400 shrink-0">
                              {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}

                          <div
                            className={`px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed break-words ${
                              isMine
                                ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
                            }`}
                          >
                            {msg.content}
                          </div>

                          {!isMine && (
                            <span className="text-[8.5px] text-gray-400 shrink-0">
                              {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs disabled:opacity-30 transition shrink-0"
                >
                  전송
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
              <span className="text-5xl">💬</span>
              <h3 className="font-bold text-gray-700 text-sm">대화방을 선택해 주세요</h3>
              <p className="text-xs max-w-xs text-gray-400">
                좌측 상단 '🔍 찾기'에서 유저를 찾아 대화를 시작해 보세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🔍 유저 검색 모달 */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">🔍 유저 검색 및 DM 신청</h3>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearchUsers} className="flex gap-2">
              <input
                type="text"
                placeholder="닉네임 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-3.5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
              >
                {searching ? '검색중' : '검색'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[11px]">
                  검색된 유저가 없습니다.
                </div>
              ) : (
                searchResults.map((u) => {
                  const name = u.display_name || u.nickname || '익명';

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0 overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            name[0]
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-xs truncate">{name}</div>
                          <div className="text-[9px] font-semibold text-gray-400">
                            {u.theyFollow
                              ? '🟢 상대방이 나를 팔로우 함'
                              : u.iFollow
                              ? '🟡 내가 팔로우 함'
                              : '⚪ 팔로우 안 함'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleFollowInSearch(u)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${
                            u.iFollow ? 'bg-gray-200 text-gray-700' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {u.iFollow ? '팔로잉' : '+ 팔로우'}
                        </button>

                        {u.canDM ? (
                          <button
                            onClick={() => startOneOnOneChat(u)}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-[10px]"
                          >
                            💬 DM
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1 bg-gray-100 text-gray-400 font-bold rounded-lg text-[10px] cursor-not-allowed"
                          >
                            🔒 팔로워 전용
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👥 그룹 채팅 생성 모달 */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">👥 새 그룹 채팅 만들기</h3>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">그룹 채팅방 이름</label>
              <input
                type="text"
                placeholder="예: 프로젝트 팀 채팅방"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="block text-[10px] font-bold text-gray-500">
                초대 유저 선택 ({selectedGroupUserIds.length}명)
              </label>
              {availableGroupUsers.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-[11px]">
                  나를 팔로우 중인 유저가 없습니다.
                </div>
              ) : (
                availableGroupUsers.map((u) => {
                  const isChecked = selectedGroupUserIds.includes(u.id);
                  const name = u.display_name || u.nickname || '익명';

                  return (
                    <div
                      key={u.id}
                      onClick={() =>
                        setSelectedGroupUserIds((prev) =>
                          isChecked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        )
                      }
                      className="p-2.5 bg-gray-50 hover:bg-emerald-50/60 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-emerald-100 text-emerald-800 font-black rounded-full flex items-center justify-center text-[10px]">
                          {name[0]}
                        </div>
                        <span className="font-bold text-gray-800 text-[11px]">{name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={createGroupChat}
              disabled={selectedGroupUserIds.length < 1}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-40"
            >
              채팅방 만들기 ({selectedGroupUserIds.length + 1}명)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
