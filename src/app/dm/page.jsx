'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function DMPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 대화방 목록 및 현재 선택된 방
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  // 메시지 및 멤버 상태
  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 모바일 사이드바 접기/펼치기
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // 🔍 친구 검색 & 1:1 대화 모달
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 👥 새 그룹 채팅 모달
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState([]); // 맞팔 유저만 저장
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState([]);
  const [groupNameInput, setGroupNameInput] = useState('');

  // 로그인 인증 확인
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요한 페이지입니다.');
        router.push('/login');
        return;
      }
      setCurrentUser(user);
    };
    initUser();
  }, [router]);

  // 참여 중인 대화방 로드
  const fetchMyRooms = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data: myMemberships } = await supabase
        .from('chat_room_members')
        .select('room_id')
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
          members:chat_room_members(*, profiles:user_id(*))
        `)
        .in('id', roomIds)
        .order('created_at', { ascending: false });

      if (roomData) setRooms(roomData);
    } catch (err) {
      console.error('대화방 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  // 읽음 타임스탬프 업데이트
  const updateLastRead = useCallback(async (roomId) => {
    if (!currentUser || !roomId) return;
    await supabase
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', currentUser.id);
  }, [currentUser]);

  // 채팅방 변경 및 메시지 로드
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

    updateLastRead(room.id);
  }, [updateLastRead]);

  // Realtime 메시지 수신
  useEffect(() => {
    if (!activeRoom) return;

    const channel = supabase
      .channel(`dm-room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoom.id}` },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, profiles: senderProfile }];
          });

          if (payload.new.sender_id !== currentUser?.id) {
            updateLastRead(activeRoom.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_room_members', filter: `room_id=eq.${activeRoom.id}` },
        (payload) => {
          setRoomMembers((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom, currentUser, updateLastRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 전송
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

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        updateLastRead(activeRoom.id);

        // 푸시 발송
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
    } finally {
      setSending(false);
    }
  };

  // 🔍 유저 검색 및 맞팔로우 상태 조회
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

      // 내 팔로잉 및 팔로워 목록 확인
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

        return {
          ...u,
          iFollow,
          theyFollow,
          isMutual: iFollow && theyFollow, // 🌟 맞팔로우 상태 체크
        };
      });

      setSearchResults(processedResults);
    } catch (err) {
      console.error('유저 검색 에러:', err);
    } finally {
      setSearching(false);
    }
  };

  // 검색 결과 내 팔로우 / 언팔로우 토글
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

      // 검색 결과 상태 실시간 갱신
      setSearchResults((prev) =>
        prev.map((u) => {
          if (u.id === targetUser.id) {
            const nextIFollow = !u.iFollow;
            return {
              ...u,
              iFollow: nextIFollow,
              isMutual: nextIFollow && u.theyFollow,
            };
          }
          return u;
        })
      );
    } catch (err) {
      console.error('팔로우 처리 에러:', err);
    }
  };

  // 🌟 맞팔 유저와 1:1 대화 시작하기
  const startOneOnOneChat = async (targetUser) => {
    if (!targetUser.isMutual) {
      alert('상대방과 서로 팔로우(맞팔) 상태여야 채팅을 할 수 있습니다.');
      return;
    }

    try {
      // 이미 기존 1:1 방이 존재하는지 확인
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

      // 새 1:1 방 생성
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
      alert('채팅방을 생성할 수 없습니다.');
    }
  };

  // 👥 그룹 채팅 생성 모달 열기 (맞팔 유저만 추출)
  const openGroupModal = async () => {
    if (!currentUser) return;
    setIsGroupModalOpen(true);

    // 내 팔로잉 및 팔로워 동시 조회하여 맞팔 유저만 필터링
    const { data: myFollowings } = await supabase
      .from('follows')
      .select('following_id, profiles:following_id(*)')
      .eq('follower_id', currentUser.id);

    const { data: myFollowers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', currentUser.id);

    const followerSet = new Set(myFollowers?.map((f) => f.follower_id));

    const mutuals = myFollowings
      ?.filter((f) => followerSet.has(f.following_id))
      .map((f) => f.profiles) || [];

    setMutualFollowers(mutuals);
  };

  // 그룹 채팅 생성
  const createGroupChat = async () => {
    if (selectedGroupUserIds.length < 1) return alert('최소 1명 이상의 맞팔 유저를 선택해주세요.');

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
      alert('그룹 채팅을 생성할 수 없습니다.');
    }
  };

  // 카톡 "1" 읽음 안 한 인원 수 계산
  const getUnreadCount = (msg) => {
    if (!roomMembers || roomMembers.length === 0) return 0;
    const msgTime = new Date(msg.created_at).getTime();

    const unreadMembers = roomMembers.filter((m) => {
      if (m.user_id === msg.sender_id) return false;
      const lastReadTime = new Date(m.last_read_at).getTime();
      return lastReadTime < msgTime - 1000;
    });

    return unreadMembers.length;
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
                    className={`p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 ${
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
                        {room.is_group && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {room.members?.length}명
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        대화 참여 중...
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 👉 [우측] 채팅 화면 */}
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
                    const unreadCount = getUnreadCount(msg);

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
                            <div className="flex flex-col items-end shrink-0">
                              {unreadCount > 0 && (
                                <span className="text-[10px] font-black text-amber-500 leading-none mb-0.5">
                                  {unreadCount}
                                </span>
                              )}
                              <span className="text-[8.5px] text-gray-400">
                                {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
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
                            <div className="flex flex-col items-start shrink-0">
                              {unreadCount > 0 && (
                                <span className="text-[10px] font-black text-amber-500 leading-none mb-0.5">
                                  {unreadCount}
                                </span>
                              )}
                              <span className="text-[8.5px] text-gray-400">
                                {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
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
                좌측 상단 '🔍 찾기'에서 친구를 팔로우하고 맞팔로우 상태에서 1:1 대화를 시작해 보세요!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🔍 유저 검색 & 맞팔 대화 시작 모달 */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">🔍 친구 검색 및 DM 신청</h3>
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

            {/* 검색 결과 */}
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
                            {u.isMutual
                              ? '🟢 서로 팔로우 함 (맞팔)'
                              : u.iFollow
                              ? '🟡 내가 팔로우 함 (상대방 미팔로우)'
                              : '⚪ 팔로우 안 함'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 팔로우 버튼 */}
                        <button
                          onClick={() => toggleFollowInSearch(u)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${
                            u.iFollow
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {u.iFollow ? '팔로잉' : '+ 팔로우'}
                        </button>

                        {/* 🌟 1:1 대화 버튼 (맞팔 시만 가능) */}
                        {u.isMutual ? (
                          <button
                            onClick={() => startOneOnOneChat(u)}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-[10px]"
                          >
                            💬 채팅
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1 bg-gray-100 text-gray-400 font-bold rounded-lg text-[10px] cursor-not-allowed"
                            title="상대방과 서로 팔로우해야 대화가 가능합니다."
                          >
                            🔒 맞팔 필요
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

      {/* 👥 그룹 채팅 생성 모달 (맞팔 유저만 초대) */}
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
                맞팔로우 유저 선택 ({selectedGroupUserIds.length}명)
              </label>
              {mutualFollowers.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-[11px]">
                  서로 팔로우(맞팔) 중인 유저가 없습니다.
                </div>
              ) : (
                mutualFollowers.map((u) => {
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
