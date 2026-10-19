'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function DMPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 대화 가능 유저 목록 (팔로잉 / 맞팔 유저)
  const [friends, setFriends] = useState([]);

  // 대화방 및 메시지 상태
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'group'
  const [conversationRooms, setConversationRooms] = useState([]);
  const [groupRooms, setGroupRooms] = useState([]);

  // 선택된 대화방 (1:1 또는 그룹)
  const [activeChat, setActiveChat] = useState(null); // { type: 'direct'|'group', targetUser?: {}, room?: {} }
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 그룹 채팅 개설 모달 상태
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 1. 유저 정보 및 친구(팔로잉) 목록 불러오기
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/');
        return;
      }
      setCurrentUser(user);

      // 내 팔로잉 목록 가져오기
      const { data: followingData } = await supabase
        .from('follows')
        .select('*, profiles:following_id(*)')
        .eq('follower_id', user.id);

      const friendProfiles = (followingData || [])
        .map((f) => f.profiles)
        .filter(Boolean);

      setFriends(friendProfiles);

      // 1:1 대화 내역 가져오기
      await fetchDirectMessages(user.email);

      // 그룹 채팅방 가져오기
      await fetchGroupRooms(user.id);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // 2. 1:1 메시지 목록 불러오기
  const fetchDirectMessages = async (userEmail) => {
    if (!userEmail) return;
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`receiver_email.eq.${userEmail},sender_email.eq.${userEmail}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rooms = Object.values(
        data.reduce((acc, dm) => {
          const partnerEmail = dm.sender_email === userEmail ? dm.receiver_email : dm.sender_email;
          const partnerName = dm.sender_email === userEmail ? '상대방' : dm.sender_name || partnerEmail.split('@')[0];

          if (!acc[partnerEmail]) {
            acc[partnerEmail] = {
              partner_email: partnerEmail,
              partner_name: partnerName,
              latestMessage: dm.content,
              latestTime: dm.created_at,
            };
          }
          return acc;
        }, {})
      );
      setConversationRooms(rooms);
    }
  };

  // 3. 그룹 채팅방 목록 불러오기
  const fetchGroupRooms = async (userId) => {
    if (!userId) return;
    try {
      const { data: memberRooms, error: memberErr } = await supabase
        .from('chat_room_members')
        .select('room_id, chat_rooms(*)')
        .eq('user_id', userId);

      if (!memberErr && memberRooms) {
        const rooms = memberRooms
          .map((m) => m.chat_rooms)
          .filter((r) => r && r.is_group);
        setGroupRooms(rooms);
      }
    } catch (err) {
      console.error('그룹방 로드 실패:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 4. Realtime 메시지 수신 (1:1 & 그룹)
  useEffect(() => {
    if (!currentUser?.email) return;

    const channel = supabase
      .channel(`realtime-dms-${currentUser.email}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newDm = payload.new;
          if (
            newDm.receiver_email === currentUser.email ||
            newDm.sender_email === currentUser.email
          ) {
            fetchDirectMessages(currentUser.email);
            if (activeChat?.type === 'direct' && activeChat.targetUser?.email === (newDm.sender_email === currentUser.email ? newDm.receiver_email : newDm.sender_email)) {
              setMessages((prev) => [...prev, newDm]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeChat]);

  // 5. 활성화된 채팅방 메시지 불러오기
  useEffect(() => {
    if (!activeChat || !currentUser) return;

    if (activeChat.type === 'direct') {
      const partnerEmail = activeChat.targetUser.email;
      supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_email.eq.${currentUser.email},receiver_email.eq.${partnerEmail}),and(sender_email.eq.${partnerEmail},receiver_email.eq.${currentUser.email})`
        )
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data);
        });
    } else if (activeChat.type === 'group') {
      supabase
        .from('chat_messages')
        .select('*, profiles:sender_id(*)')
        .eq('room_id', activeChat.room.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data);
        });
    }
  }, [activeChat, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending || !currentUser) return;

    setSending(true);
    const content = inputMessage.trim();
    setInputMessage('');

    try {
      if (activeChat.type === 'direct') {
        const senderName = currentUser.user_metadata?.display_name || currentUser.email.split('@')[0];
        const { data, error } = await supabase
          .from('direct_messages')
          .insert([
            {
              sender_email: currentUser.email,
              sender_name: senderName,
              receiver_email: activeChat.targetUser.email,
              content,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          setMessages((prev) => [...prev, data]);
          fetchDirectMessages(currentUser.email);
        }
      } else if (activeChat.type === 'group') {
        const { error } = await supabase
          .from('chat_messages')
          .insert([
            {
              room_id: activeChat.room.id,
              sender_id: currentUser.id,
              content,
            },
          ]);

        if (!error) {
          const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles:sender_id(*)')
            .eq('room_id', activeChat.room.id)
            .order('created_at', { ascending: true });
          if (data) setMessages(data);
        }
      }
    } catch (err) {
      console.error('메시지 전송 에러:', err);
    } finally {
      setSending(false);
    }
  };

  // 7. 그룹 채팅방 생성
  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) return alert('최소 1명의 참여자를 선택해 주세요.');
    setCreatingGroup(true);

    try {
      const allMembers = [...new Set([...selectedUsers, currentUser.id])];
      const roomTitle = groupName.trim() || `그룹 채팅 (${allMembers.length}명)`;

      // A. chat_rooms에 방 개설
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert([{ name: roomTitle, is_group: true }])
        .select()
        .single();

      if (roomErr) {
        alert(`그룹방 생성 오류: ${roomErr.message}\n(DB 테이블 chat_rooms 구조를 확인해 주세요)`);
        setCreatingGroup(false);
        return;
      }

      // B. chat_room_members에 멤버 추가
      const memberPayload = allMembers.map((uid) => ({
        room_id: newRoom.id,
        user_id: uid,
      }));

      const { error: memberErr } = await supabase
        .from('chat_room_members')
        .insert(memberPayload);

      if (memberErr) {
        alert(`멤버 추가 오류: ${memberErr.message}`);
        setCreatingGroup(false);
        return;
      }

      alert('그룹 채팅방이 성공적으로 생성되었습니다!');
      setIsGroupModalOpen(false);
      setSelectedUsers([]);
      setGroupName('');

      await fetchGroupRooms(currentUser.id);
      setActiveChat({ type: 'group', room: newRoom });
    } catch (err) {
      console.error('그룹 채팅 개설 도중 에러:', err);
      alert('그룹 채팅을 생성하는 과정에서 처리 오류가 발생했습니다.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleUserSelect = (uid) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto my-12 text-center text-gray-400 font-bold text-xs px-4">
        💬 DM 및 채팅 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-6 px-4 font-sans text-xs space-y-4">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
        >
          ← 뒤로 가기
        </button>
        <h1 className="text-sm font-black text-gray-900">💬 채팅함</h1>
        <button
          onClick={() => setIsGroupModalOpen(true)}
          className="px-3 py-1.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px] shadow-xs"
        >
          + 그룹 만들기
        </button>
      </div>

      {/* 탭 전환 */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl font-bold">
        <button
          onClick={() => setActiveTab('direct')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'direct' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500'
          }`}
        >
          1:1 DM ({conversationRooms.length})
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'group' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500'
          }`}
        >
          그룹 채팅방 ({groupRooms.length})
        </button>
      </div>

      {/* 탭 1: 1:1 대화 목록 */}
      {activeTab === 'direct' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-xs space-y-2">
          <h2 className="font-bold text-gray-800 text-[11px] mb-2">대화 목록</h2>
          {conversationRooms.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-medium text-[11px]">
              진행 중인 1:1 대화가 없습니다.
            </div>
          ) : (
            conversationRooms.map((room) => (
              <div
                key={room.partner_email}
                onClick={() =>
                  setActiveChat({
                    type: 'direct',
                    targetUser: { email: room.partner_email, display_name: room.partner_name },
                  })
                }
                className="p-3 bg-gray-50 hover:bg-emerald-50/60 active:bg-emerald-100/80 rounded-2xl border border-gray-100 cursor-pointer transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-xs">
                    {room.partner_name}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {new Date(room.latestTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{room.latestMessage}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* 탭 2: 그룹 채팅방 목록 */}
      {activeTab === 'group' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-xs space-y-2">
          <h2 className="font-bold text-gray-800 text-[11px] mb-2">그룹 대화방 목록</h2>
          {groupRooms.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-medium text-[11px]">
              참여 중인 그룹 채팅방이 없습니다. 상단의 '+ 그룹 만들기' 버튼으로 개설해 보세요!
            </div>
          ) : (
            groupRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setActiveChat({ type: 'group', room })}
                className="p-3 bg-gray-50 hover:bg-emerald-50/60 active:bg-emerald-100/80 rounded-2xl border border-gray-100 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-gray-900 text-xs">👥 {room.name}</div>
                  <div className="text-[9px] text-gray-400">
                    개설일: {new Date(room.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">입장 →</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 💬 대화창 모달 */}
      {activeChat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-sm h-[85vh] max-h-[650px] rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100">
            {/* 상단 헤더 */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                  {activeChat.type === 'direct' ? '👤' : '👥'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs text-gray-900 truncate">
                    {activeChat.type === 'direct'
                      ? activeChat.targetUser.display_name || activeChat.targetUser.email
                      : activeChat.room.name}
                  </h3>
                  <p className="text-[9px] text-emerald-600 font-semibold">● 실시간 연결됨</p>
                </div>
              </div>

              <button
                onClick={() => setActiveChat(null)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* 메시지 구역 */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-[11px]">
                  첫 메시지를 작성해 대화를 시작해 보세요!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine =
                    activeChat.type === 'direct'
                      ? msg.sender_email === currentUser?.email
                      : msg.sender_id === currentUser?.id;

                  const senderName =
                    activeChat.type === 'group'
                      ? msg.profiles?.display_name || msg.profiles?.nickname || '익명'
                      : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-0.5`}
                    >
                      {!isMine && senderName && (
                        <span className="text-[9px] text-gray-500 font-bold px-1">{senderName}</span>
                      )}
                      <div
                        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed break-words ${
                          isMine
                            ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[8px] text-gray-400 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input 폼 */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="메시지 입력..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="px-3.5 py-2 text-emerald-600 font-bold text-xs disabled:opacity-30 transition"
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 그룹 채팅 생성 모달 */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">🚀 그룹 채팅방 만들기</h3>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">방 이름 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 프로젝트 모임방"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">
                  초대할 친구 선택 ({selectedUsers.length}명)
                </label>

                {friends.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-[11px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    팔로우 중인 친구가 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {friends.map((friend) => {
                      const isChecked = selectedUsers.includes(friend.id);
                      const name = friend.display_name || friend.nickname || '익명';

                      return (
                        <label
                          key={friend.id}
                          className="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 px-1 rounded-xl transition"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleUserSelect(friend.id)}
                              className="w-4 h-4 accent-emerald-600 rounded"
                            />
                            <span className="font-bold text-gray-800 text-xs">{name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={creatingGroup || selectedUsers.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition"
            >
              {creatingGroup ? '생성 처리 중...' : '그룹방 만들기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
