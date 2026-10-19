'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function DMPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 대화방 목록 및 선택된 방 상태
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  // 채팅 메시지 및 멤버 데이터
  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 모바일 레이아웃 상태 (목록 보기 / 채팅창 보기)
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // 그룹 채팅 개설 모달 상태
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [followList, setFollowList] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupNameInput, setGroupNameInput] = useState('');

  // 1. 유저 인증 확인
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

  // 2. 참여 중인 대화방 목록 불러오기
  const fetchMyRooms = useCallback(async () => {
    if (!currentUser) return;

    try {
      // 내가 속한 방 멤버 정보 조회
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

      // 해당 방들의 상세 정보 및 참여 멤버 조회
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          members:chat_room_members(*, profiles:user_id(*))
        `)
        .in('id', roomIds)
        .order('created_at', { ascending: false });

      if (roomData) {
        setRooms(roomData);
      }
    } catch (err) {
      console.error('대화방 목록 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  // 3. 현재 방의 메시지 및 멤버 정보 로드 + 읽음 처리(last_read_at)
  const updateLastRead = useCallback(async (roomId) => {
    if (!currentUser || !roomId) return;
    await supabase
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', currentUser.id);
  }, [currentUser]);

  const loadRoomDetails = useCallback(async (room) => {
    setActiveRoom(room);
    setShowMobileSidebar(false); // 모바일에서 채팅창으로 전환

    // 메시지 목록 조회
    const { data: msgData } = await supabase
      .from('chat_messages')
      .select('*, profiles:sender_id(*)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });

    if (msgData) setMessages(msgData);

    // 최신 멤버 정보 조회
    const { data: memData } = await supabase
      .from('chat_room_members')
      .select('*, profiles:user_id(*)')
      .eq('room_id', room.id);

    if (memData) setRoomMembers(memData);

    // 읽음 타임스탬프 갱신
    updateLastRead(room.id);
  }, [updateLastRead]);

  // 4. 실시간 수신 (신규 메시지 및 멤버 읽음 변경 감지)
  useEffect(() => {
    if (!activeRoom) return;

    const channel = supabase
      .channel(`room-${activeRoom.id}`)
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

          // 내 메시지가 아닐 경우 읽음 업데이트
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

  // 메시지 스크롤 하단 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. 메시지 전송
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
            }).catch((err) => console.error('푸시 발송 에러:', err));
          }
        });
      }
    } catch (err) {
      console.error('메시지 전송 오류:', err);
    } finally {
      setSending(false);
    }
  };

  // 6. 새 그룹 채팅 만들기 모달 열기
  const openGroupModal = async () => {
    if (!currentUser) return;
    setIsGroupModalOpen(true);

    // 팔로워/팔로잉 유저 리스트 가져오기
    const { data: follows } = await supabase
      .from('follows')
      .select('*, follower:follower_id(*), following:following_id(*)')
      .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);

    if (follows) {
      const userMap = new Map();
      follows.forEach((f) => {
        if (f.follower && f.follower.id !== currentUser.id) userMap.set(f.follower.id, f.follower);
        if (f.following && f.following.id !== currentUser.id) userMap.set(f.following.id, f.following);
      });
      setFollowList(Array.from(userMap.values()));
    }
  };

  // 그룹 채팅방 생성 실행
  const createGroupChat = async () => {
    if (selectedUserIds.length < 1) return alert('최소 1명 이상의 상대를 선택해주세요.');

    const name = groupNameInput.trim() || `그룹 채팅 (${selectedUserIds.length + 1}명)`;
    const allMemberIds = [...new Set([...selectedUserIds, currentUser.id])];

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
      setSelectedUserIds([]);
      setGroupNameInput('');
      fetchMyRooms();
      loadRoomDetails(newRoom);
    } catch (err) {
      console.error('그룹 채팅 생성 실패:', err);
      alert('그룹 채팅 생성에 실패했습니다.');
    }
  };

  // 안 읽은 인원 수 계산 (카카오톡 "1" 표시 로직)
  const getUnreadCount = (msg) => {
    if (!roomMembers || roomMembers.length === 0) return 0;
    const msgTime = new Date(msg.created_at).getTime();

    // 나를 제외하고, last_read_at이 메시지 작성 시각보다 이전인 멤버 수 계산
    const unreadMembers = roomMembers.filter((m) => {
      if (m.user_id === msg.sender_id) return false;
      const lastReadTime = new Date(m.last_read_at).getTime();
      return lastReadTime < msgTime - 1000; // 1초 오차 범위 보정
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
      {/* 2단 메인 레이아웃 */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-xl h-[82vh] flex overflow-hidden">
        
        {/* 👈 [좌측] 대화방 목록 (모바일 접기/펼치기) */}
        <div
          className={`${
            showMobileSidebar ? 'flex' : 'hidden md:flex'
          } w-full md:w-80 flex-col border-r border-gray-100 bg-gray-50/50 shrink-0`}
        >
          {/* 좌측 상단 헤더 */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h1 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
              💬 DM / 채팅함
            </h1>
            <button
              onClick={openGroupModal}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-[10.5px] transition shadow-xs"
            >
              + 그룹 채팅
            </button>
          </div>

          {/* 대화방 목록 리스트 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-medium text-[11px]">
                참여 중인 대화방이 없습니다.
              </div>
            ) : (
              rooms.map((room) => {
                const isActive = activeRoom?.id === room.id;
                
                // 1:1 채팅일 경우 상대방 프로필명 찾기
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
              {/* 상단 방 정보 헤더 */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* 모바일 목록 보기 버튼 */}
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

              {/* 채팅 메시지 영역 */}
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
                          {/* 내가 보낸 메시지 시 읽음 숫자 및 시간 표시 */}
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

                          {/* 말풍선 */}
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed break-words ${
                              isMine
                                ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
                            }`}
                          >
                            {msg.content}
                          </div>

                          {/* 상대방이 보낸 메시지 시 읽음 숫자 및 시간 표시 */}
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

              {/* 하단 메시지 입력창 */}
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
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-full text-xs disabled:opacity-30 transition shrink-0"
                >
                  전송
                </button>
              </form>
            </>
          ) : (
            /* 선택된 채팅방이 없을 때 메인 화면 */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
              <span className="text-5xl">💬</span>
              <h3 className="font-bold text-gray-700 text-sm">대화방을 선택해 주세요</h3>
              <p className="text-xs max-w-xs text-gray-400">
                좌측 목록에서 참여 중인 대화방을 누르거나 새 그룹 채팅을 시작해 보세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🚀 그룹 채팅 생성 모달 */}
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
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="block text-[10px] font-bold text-gray-500">대화상대 선택 ({selectedUserIds.length}명)</label>
              {followList.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-[11px]">
                  팔로우 중인 유저가 없습니다.
                </div>
              ) : (
                followList.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  const name = u.display_name || u.nickname || '익명';

                  return (
                    <div
                      key={u.id}
                      onClick={() =>
                        setSelectedUserIds((prev) =>
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
              disabled={selectedUserIds.length < 1}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-40"
            >
              채팅방 만들기 ({selectedUserIds.length + 1}명)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
