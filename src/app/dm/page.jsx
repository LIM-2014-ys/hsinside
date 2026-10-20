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

  // ↩️ 답장 상태
  const [replyingTo, setReplyingTo] = useState(null);

  // ✏️ 메시지 수정 상태
  const [editingMsg, setEditingMsg] = useState(null);

  // 📱 메시지 길게 누르기(Long Press) / 우클릭 액션 모달 상태
  const [actionMenuMsg, setActionMenuMsg] = useState(null);

  // 🏷️ @멘션 태그 자동완성 상태
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 모바일 레이아웃 상태
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // 토스트 알림 메시지 상태
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });

  // 🔍 유저 전체 검색 모달
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 👥 그룹 채팅 생성 모달 + 친구 검색
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [availableGroupUsers, setAvailableGroupUsers] = useState([]);
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // ➕ 멤버 추가 초대 모달 + 친구 검색
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitableUsers, setInvitableUsers] = useState([]);
  const [selectedInviteUserIds, setSelectedInviteUserIds] = useState([]);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');

  const showToast = (text, type = 'error') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg({ type: '', text: '' }), 3000);
  };

  const scrollToBottomIfNear = useCallback((force = false) => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

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

  // 2. 대화방 목록 조회
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
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const latestMsgObj = sortedMsgs[0];

          const myMember = room.members?.find((m) => m.user_id === currentUser.id);
          const lastReadTime = myMember?.last_read_at
            ? new Date(myMember.last_read_at).getTime()
            : 0;

          const unreadCount = sortedMsgs.filter(
            (m) =>
              m.sender_id !== currentUser.id &&
              new Date(m.created_at).getTime() > lastReadTime + 500
          ).length;

          return {
            ...room,
            latestMsg: latestMsgObj?.content || '새로운 대화방입니다.',
            latestMsgTime: latestMsgObj?.created_at || room.created_at,
            unreadCount,
          };
        });

        processedRooms.sort(
          (a, b) => new Date(b.latestMsgTime).getTime() - new Date(a.latestMsgTime).getTime()
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

  // 3. 읽은 시간 업데이트 함수
  const updateLastRead = useCallback(async (roomId) => {
    if (!currentUser || !roomId) return;
    const nowISO = new Date().toISOString();

    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r))
    );

    setRoomMembers((prev) =>
      prev.map((m) =>
        m.user_id === currentUser.id ? { ...m, last_read_at: nowISO } : m
      )
    );

    await supabase
      .from('chat_room_members')
      .update({ last_read_at: nowISO })
      .eq('room_id', roomId)
      .eq('user_id', currentUser.id);
  }, [currentUser]);

  // 🔔 [카카오톡 방식] 대화방을 열어보고 있는 동안 10초마다 읽음 상태 최신화 (알림 차단 기준)
  useEffect(() => {
    if (!activeRoom || !currentUser) return;

    updateLastRead(activeRoom.id);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateLastRead(activeRoom.id);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeRoom, currentUser, updateLastRead]);

  // 4. 대화방 선택 및 상세 로드
  const loadRoomDetails = useCallback(async (room) => {
    setActiveRoom(room);
    setShowMobileSidebar(false);
    setReplyingTo(null);
    setEditingMsg(null);

    const { data: msgData } = await supabase
      .from('chat_messages')
      .select('*, profiles:sender_id(*)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });

    if (msgData) {
      const sorted = [...msgData].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
    }

    const { data: memData } = await supabase
      .from('chat_room_members')
      .select('*, profiles:user_id(*)')
      .eq('room_id', room.id);

    if (memData) setRoomMembers(memData);

    updateLastRead(room.id);
    setTimeout(() => scrollToBottomIfNear(true), 100);
  }, [updateLastRead, scrollToBottomIfNear]);

  // 5. 실시간 데이터베이스 이벤트 구독
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('global-realtime-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMsg = payload.new;

          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single();

          const fullMsg = { ...newMsg, profiles: senderProfile };

          if (activeRoom && activeRoom.id === newMsg.room_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const next = [...prev, fullMsg];
              return next.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });

            if (newMsg.sender_id !== currentUser.id) {
              updateLastRead(newMsg.room_id);
              scrollToBottomIfNear(false);
            } else {
              scrollToBottomIfNear(true);
            }
          }

          fetchMyRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_room_members' },
        (payload) => {
          setRoomMembers((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
          );
          fetchMyRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_rooms' },
        (payload) => {
          if (activeRoom && activeRoom.id === payload.old.id) {
            setActiveRoom(null);
            setMessages([]);
            setRoomMembers([]);
            setShowMobileSidebar(true);
            showToast('방장에 의해 채팅방이 삭제되었습니다.');
          }
          fetchMyRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeRoom, fetchMyRooms, updateLastRead, scrollToBottomIfNear]);

  // 입력창 변경 시 @ 태그 감지
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);

    const cursor = e.target.selectionStart;
    const lastAt = val.lastIndexOf('@', cursor - 1);

    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const query = val.slice(lastAt + 1, cursor);
      if (!query.includes(' ')) {
        setShowMentionMenu(true);
        setMentionSearch(query);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  // 멘션 태그 자동완성 선택
  const insertMention = (member) => {
    const name = member.profiles?.display_name || member.profiles?.nickname || '익명';
    const cursor = inputRef.current?.selectionStart || inputMessage.length;
    const lastAt = inputMessage.lastIndexOf('@', cursor - 1);

    if (lastAt !== -1) {
      const before = inputMessage.slice(0, lastAt);
      const after = inputMessage.slice(cursor);
      const newText = `${before}@${name} ${after}`;
      setInputMessage(newText);
    }
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  // 메시지 삭제 처리
  const handleDeleteMessage = async (msgId) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setActionMenuMsg(null);
      showToast('메시지가 삭제되었습니다.', 'success');
    } catch (err) {
      console.error('메시지 삭제 에러:', err);
      showToast('메시지 삭제 실패');
    }
  };

  // 메시지 수정 시작
  const startEditingMessage = (msg) => {
    const cleanContent = msg.content.replace(/^↩️ \[.*?\]: ".*?"\n\n/, '');
    setEditingMsg(msg);
    setInputMessage(cleanContent);
    setReplyingTo(null);
    setActionMenuMsg(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // 메시지 전송 및 수정
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeRoom || !currentUser || sending) return;

    setSending(true);

    // ✏️ 수정 모드인 경우
    if (editingMsg) {
      let updatedContent = inputMessage.trim();
      const replyMatch = editingMsg.content.match(/^↩️ \[(.*?)\]: "(.*?)"\n\n/);
      if (replyMatch) {
        updatedContent = `${replyMatch[0]}${updatedContent}`;
      }

      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({ content: updatedContent })
          .eq('id', editingMsg.id);

        if (error) throw error;

        setMessages((prev) =>
          prev.map((m) => (m.id === editingMsg.id ? { ...m, content: updatedContent } : m))
        );
        showToast('메시지가 수정되었습니다.', 'success');
      } catch (err) {
        console.error('메시지 수정 에러:', err);
        showToast('메시지 수정 실패');
      } finally {
        setEditingMsg(null);
        setInputMessage('');
        setSending(false);
      }
      return;
    }

    // 💬 일반 신규 메시지 전송 모드
    let finalContent = inputMessage.trim();
    if (replyingTo) {
      const cleanReplyContent = replyingTo.content.replace(/^↩️ \[.*?\]: ".*?"\n\n/, '');
      finalContent = `↩️ [${replyingTo.senderName}]: "${cleanReplyContent}"\n\n${finalContent}`;
    }

    setInputMessage('');
    setReplyingTo(null);
    setShowMentionMenu(false);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ room_id: activeRoom.id, sender_id: currentUser.id, content: finalContent }])
        .select('*, profiles:sender_id(*)')
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
        updateLastRead(activeRoom.id);
        setTimeout(() => scrollToBottomIfNear(true), 50);

        const otherMembers = roomMembers.filter((m) => m.user_id !== currentUser.id);
        const myName = currentUser.user_metadata?.display_name || '누군가';
        const now = Date.now();

        // 🔕 [카카오톡 방식 스마트 푸시]
        // 1) 상대방이 대화방을 보고 있으면(최근 25초 이내 읽음 갱신) 푸시 발송 생략
        // 2) 부재 중인 상대에게는 tag: "room-${activeRoom.id}"로 발송하여 기존 알림을 덮어씀 (단일 알림 유지)
        otherMembers.forEach((m) => {
          const lastReadTime = m.last_read_at ? new Date(m.last_read_at).getTime() : 0;
          const isCurrentlyReading = now - lastReadTime < 25000; // 대화방 보고 있는 중

          if (!isCurrentlyReading && m.profiles?.email) {
            fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetEmail: m.profiles.email,
                title: `💬 ${activeRoom.is_group ? activeRoom.name : myName}`,
                body: finalContent,
                tag: `room-${activeRoom.id}`, // 👈 카톡 방식: 이전 알림을 지우고 1개로 덮어쓰기
                renotify: true,               // 👈 덮어쓰며 새 알람 소리/진동 울리기
                url: `/dm`,
              }),
            }).catch((err) => console.error('푸시 에러:', err));
          }
        });
      }
    } catch (err) {
      console.error('메시지 전송 오류:', err);
      showToast('메시지 전송 실패: DB 권한을 확인해 주세요.');
    } finally {
      setSending(false);
    }
  };

  // 메시지 내용 렌더링
  const renderMessageContent = (content) => {
    let replyHeader = null;
    let mainContent = content;

    const replyMatch = content.match(/^↩️ \[(.*?)\]: "(.*?)"\n\n([\s\S]*)$/);
    if (replyMatch) {
      replyHeader = { sender: replyMatch[1], text: replyMatch[2] };
      mainContent = replyMatch[3];
    }

    const parts = mainContent.split(/(@[^\s,.:;!?"'()\[\]{}]+)/g);

    return (
      <div className="space-y-1.5 min-w-0 break-all break-words">
        {replyHeader && (
          <div className="p-2 bg-black/10 rounded-lg border-l-2 border-emerald-400 text-[10px] space-y-0.5 opacity-90 truncate">
            <div className="font-bold text-emerald-300">↩️ {replyHeader.sender}에게 답장</div>
            <div className="truncate italic">{replyHeader.text}</div>
          </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed break-all break-words overflow-hidden">
          {parts.map((part, idx) => {
            if (part.startsWith('@')) {
              return (
                <span key={idx} className="font-bold bg-emerald-500/20 text-emerald-200 px-1 py-0.5 rounded">
                  {part}
                </span>
              );
            }
            return part;
          })}
        </div>
      </div>
    );
  };

  // 방 삭제
  const handleDestroyRoom = async () => {
    if (!activeRoom || !currentUser) return;
    if (activeRoom.owner_id !== currentUser.id) {
      showToast('방장만 채팅방을 삭제할 수 있습니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', activeRoom.id);

      if (error) throw error;

      showToast('채팅방이 삭제되었습니다.', 'success');
      setActiveRoom(null);
      setMessages([]);
      setRoomMembers([]);
      setShowMobileSidebar(true);
      fetchMyRooms();
    } catch (err) {
      console.error('삭제 오류:', err);
      showToast('채팅방 삭제 실패');
    }
  };

  // 방 나가기
  const handleLeaveRoom = async () => {
    if (!activeRoom || !currentUser) return;

    try {
      const { error } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('room_id', activeRoom.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      showToast('채팅방에서 나갔습니다.', 'success');
      setActiveRoom(null);
      setMessages([]);
      setRoomMembers([]);
      setShowMobileSidebar(true);
      fetchMyRooms();
    } catch (err) {
      console.error('나가기 에러:', err);
      showToast('채팅방 나가기 실패');
    }
  };

  // 멤버 초대 모달 열기
  const openInviteModal = async () => {
    if (!activeRoom || !currentUser) return;

    const { data: myFollowers } = await supabase
      .from('follows')
      .select('follower_id, profiles:follower_id(*)')
      .eq('following_id', currentUser.id);

    const existingMemberUserIds = new Set(roomMembers.map((m) => m.user_id));
    const validUsers = (myFollowers || [])
      .map((f) => f.profiles)
      .filter((p) => p && !existingMemberUserIds.has(p.id));

    setInvitableUsers(validUsers);
    setSelectedInviteUserIds([]);
    setInviteSearchQuery('');
    setIsInviteModalOpen(true);
  };

  // 멤버 초대 실행
  const handleInviteMembers = async () => {
    if (selectedInviteUserIds.length === 0) {
      showToast('초대할 유저를 선택해 주세요.');
      return;
    }

    try {
      const payload = selectedInviteUserIds.map((uid) => ({
        room_id: activeRoom.id,
        user_id: uid,
      }));

      const { error } = await supabase.from('chat_room_members').insert(payload);
      if (error) throw error;

      const invitedUserNames = invitableUsers
        .filter((u) => selectedInviteUserIds.includes(u.id))
        .map((u) => u.display_name || u.nickname || '익명')
        .join(', ');

      await supabase.from('chat_messages').insert([
        {
          room_id: activeRoom.id,
          sender_id: currentUser.id,
          content: `📢 ${invitedUserNames}님이 초대되었습니다.`,
        },
      ]);

      showToast('멤버를 초대했습니다!', 'success');
      setIsInviteModalOpen(false);
      fetchMyRooms();
    } catch (err) {
      console.error('초대 에러:', err);
      showToast('멤버 초대 실패');
    }
  };

  // 그룹 채팅 생성 모달 열기
  const openGroupModal = async () => {
    if (!currentUser) return;
    setIsGroupModalOpen(true);

    const { data: myFollowers } = await supabase
      .from('follows')
      .select('follower_id, profiles:follower_id(*)')
      .eq('following_id', currentUser.id);

    const validUsers = myFollowers?.map((f) => f.profiles).filter(Boolean) || [];
    setAvailableGroupUsers(validUsers);
    setGroupSearchQuery('');
  };

  // 그룹 채팅 만들기
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
        .insert([{ name, is_group: true, owner_id: currentUser.id }])
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
      console.error('그룹 생성 실패:', err);
      showToast('그룹 채팅 생성 실패');
    }
  };

  // 전체 유저 검색
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

      const { data: myFollowers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUser.id);

      const followerSet = new Set(myFollowers?.map((f) => f.follower_id));

      setSearchResults(
        users.map((u) => ({
          ...u,
          canDM: followerSet.has(u.id),
        }))
      );
    } catch (err) {
      console.error('검색 에러:', err);
    } finally {
      setSearching(false);
    }
  };

  // 1:1 채팅 생성
  const startOneOnOneChat = async (targetUser) => {
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
        .insert([{ name: targetName, is_group: false, owner_id: currentUser.id }])
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
      console.error('채팅 개설 에러:', err);
      showToast('채팅방을 생성할 수 없습니다.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center text-gray-400 font-bold text-xs">
        💬 DM 로딩 중...
      </div>
    );
  }

  const isOwner = activeRoom && currentUser && activeRoom.owner_id === currentUser.id;

  const activePartner =
    roomMembers.find((m) => m.user_id !== currentUser?.id)?.profiles ||
    rooms.find((r) => r.id === activeRoom?.id)?.members?.find((m) => m.user_id !== currentUser?.id)?.profiles;

  const activeRoomTitle = activeRoom?.is_group
    ? activeRoom.name
    : activePartner?.display_name || activePartner?.nickname || '상대방';

  // 필터링된 유저 목록
  const filteredGroupUsers = availableGroupUsers.filter((u) => {
    const name = u.display_name || u.nickname || '';
    return name.toLowerCase().includes(groupSearchQuery.toLowerCase());
  });

  const filteredInviteUsers = invitableUsers.filter((u) => {
    const name = u.display_name || u.nickname || '';
    return name.toLowerCase().includes(inviteSearchQuery.toLowerCase());
  });

  const filteredMentionMembers = roomMembers.filter((m) => {
    const name = m.profiles?.display_name || m.profiles?.nickname || '';
    return name.toLowerCase().includes(mentionSearch.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-white w-screen h-screen h-[100dvh] flex flex-col font-sans text-xs overflow-hidden select-none">
      {/* 토스트 알림 */}
      {toastMsg.text && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-lg ${
            toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* 메인 뷰포트 레이아웃 */}
      <div className="flex-1 flex overflow-hidden w-full h-full">
        {/* 👈 [좌측] 대화방 목록 */}
        <div
          className={`${
            showMobileSidebar ? 'flex' : 'hidden md:flex'
          } w-full md:w-80 flex-col border-r border-gray-100 bg-gray-50/50 shrink-0 h-full`}
        >
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
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
                      <div className="flex items-center justify-between gap-1">
                        <h2 className="font-bold text-xs truncate flex items-center gap-1">
                          <span>{roomDisplayName}</span>
                          {room.is_group && room.owner_id === currentUser?.id && (
                            <span className="text-[9px] font-extrabold text-amber-400">👑</span>
                          )}
                        </h2>
                        <span
                          className={`text-[9px] shrink-0 ${
                            isActive ? 'text-emerald-100' : 'text-gray-400'
                          }`}
                        >
                          {new Date(room.latestMsgTime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? 'text-emerald-100' : 'text-gray-400'
                          }`}
                        >
                          {room.latestMsg}
                        </p>

                        {room.unreadCount > 0 && !isActive && (
                          <span className="bg-amber-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0 shadow-xs">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
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
          } flex-1 flex-col bg-white h-full overflow-hidden`}
        >
          {activeRoom ? (
            <>
              {/* 상단 헤더 바 */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="md:hidden px-2.5 py-1 bg-gray-100 text-gray-700 rounded-xl font-bold text-[11px]"
                  >
                    ← 목록
                  </button>

                  <div>
                    <h2 className="font-black text-xs text-gray-900 truncate flex items-center gap-1.5">
                      <span>{activeRoomTitle}</span>
                      {isOwner && activeRoom.is_group && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                          👑 내가 방장
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-bold">
                        ({roomMembers.length}명)
                      </span>
                    </h2>
                    <p className="text-[9px] text-emerald-600 font-semibold">● 실시간 연결됨</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={openInviteModal}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-[10px] transition"
                  >
                    + 초대
                  </button>

                  {isOwner && activeRoom.is_group ? (
                    <button
                      onClick={handleDestroyRoom}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[10px] transition shadow-xs"
                    >
                      🗑️ 채팅방 삭제
                    </button>
                  ) : (
                    <button
                      onClick={handleLeaveRoom}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-[10px] transition"
                    >
                      🚪 나가기
                    </button>
                  )}

                  <Link
                    href="/"
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-[10px]"
                  >
                    홈으로
                  </Link>
                </div>
              </div>

              {/* 메시지 스크롤 영역 */}
              <div
                ref={chatContainerRef}
                className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/40"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-gray-400">
                    <span className="text-3xl">💬</span>
                    <p className="text-[11px] font-medium">첫 메시지를 보내 대화를 시작해보세요!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.content.startsWith('📢')) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="px-3 py-1 bg-gray-200/80 text-gray-600 font-bold rounded-full text-[10px] shadow-2xs">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    const isMine = msg.sender_id === currentUser?.id;
                    const senderName = msg.profiles?.display_name || msg.profiles?.nickname || '익명';

                    return (
                      <MessageItem
                        key={msg.id}
                        msg={msg}
                        isMine={isMine}
                        senderName={senderName}
                        onReply={(m, name) => setReplyingTo({ id: m.id, senderName: name, content: m.content })}
                        onLongPress={(m, mine, name) => setActionMenuMsg({ msg: m, isMine: mine, senderName: name })}
                        renderContent={renderMessageContent}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 하단 메시지 입력 폼 및 레이어 */}
              <div className="relative bg-white border-t border-gray-100">
                {/* 🏷️ @멘션 자동완성 팝오버 */}
                {showMentionMenu && filteredMentionMembers.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-36 overflow-y-auto p-1.5 z-20">
                    <div className="text-[9.5px] font-bold text-gray-400 px-2 py-1">멘션할 멤버 선택</div>
                    {filteredMentionMembers.map((m) => {
                      const name = m.profiles?.display_name || m.profiles?.nickname || '익명';
                      return (
                        <div
                          key={m.user_id}
                          onClick={() => insertMention(m)}
                          className="px-2.5 py-1.5 hover:bg-emerald-50 rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold text-gray-800"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-black">
                            {name[0]}
                          </span>
                          <span>@{name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ✏️ 메시지 수정 상태 레이어 */}
                {editingMsg && (
                  <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 truncate pr-2">
                      <span className="font-bold text-amber-800">✏️ 메시지 수정 중: </span>
                      <span className="text-gray-600 italic">{editingMsg.content}</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMsg(null);
                        setInputMessage('');
                      }}
                      className="text-gray-400 hover:text-gray-600 font-bold px-1.5 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* ↩️ 답장 모드 레이어 */}
                {replyingTo && !editingMsg && (
                  <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 truncate pr-2">
                      <span className="font-bold text-emerald-800">↩️ {replyingTo.senderName}에게 답장: </span>
                      <span className="text-gray-600 italic">{replyingTo.content}</span>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-gray-600 font-bold px-1.5 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="p-3 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={editingMsg ? "수정할 내용 입력..." : "메시지 입력... (@로 멘션)"}
                    value={inputMessage}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 select-text"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || sending}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs disabled:opacity-30 transition shrink-0"
                  >
                    {editingMsg ? '수정' : '전송'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
              <span className="text-5xl">💬</span>
              <h3 className="font-bold text-gray-700 text-sm">대화방을 선택해 주세요</h3>
            </div>
          )}
        </div>
      </div>

      {/* 📱 메시지 길게 누르기(Long Press) / 우클릭 액션 모달 */}
      {actionMenuMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActionMenuMsg(null)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-2 border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center pb-2 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 truncate px-2">
                "{actionMenuMsg.msg.content.replace(/^↩️ \[.*?\]: ".*?"\n\n/, '')}"
              </p>
            </div>

            <button
              onClick={() => {
                setReplyingTo({
                  id: actionMenuMsg.msg.id,
                  senderName: actionMenuMsg.senderName,
                  content: actionMenuMsg.msg.content,
                });
                setActionMenuMsg(null);
              }}
              className="w-full py-2.5 px-3 bg-gray-50 hover:bg-emerald-50 text-gray-800 hover:text-emerald-700 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2"
            >
              <span>↩️</span> 답장하기
            </button>

            <button
              onClick={() => {
                const cleanText = actionMenuMsg.msg.content.replace(/^↩️ \[.*?\]: ".*?"\n\n/, '');
                navigator.clipboard.writeText(cleanText);
                setActionMenuMsg(null);
                showToast('클립보드에 복사되었습니다.', 'success');
              }}
              className="w-full py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2"
            >
              <span>📋</span> 텍스트 복사
            </button>

            {actionMenuMsg.isMine && (
              <button
                onClick={() => startEditingMessage(actionMenuMsg.msg)}
                className="w-full py-2.5 px-3 bg-gray-50 hover:bg-amber-50 text-gray-800 hover:text-amber-700 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2"
              >
                <span>✏️</span> 메시지 수정
              </button>
            )}

            {(actionMenuMsg.isMine || isOwner) && (
              <button
                onClick={() => handleDeleteMessage(actionMenuMsg.msg.id)}
                className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2"
              >
                <span>🗑️</span> 메시지 삭제
              </button>
            )}

            <button
              onClick={() => setActionMenuMsg(null)}
              className="w-full py-2 px-3 bg-gray-100 text-gray-500 font-bold rounded-2xl transition text-xs mt-1"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ➕ 멤버 초대 모달 (친구 검색 포함) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">➕ 대화방에 멤버 초대하기</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="친구 닉네임 검색..."
              value={inviteSearchQuery}
              onChange={(e) => setInviteSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="block text-[10px] font-bold text-gray-500">
                초대 가능한 팔로워 ({selectedInviteUserIds.length}명 선택)
              </label>

              {filteredInviteUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[11px]">
                  {inviteSearchQuery ? '검색된 친구가 없습니다.' : '초대 가능한 팔로워가 없습니다.'}
                </div>
              ) : (
                filteredInviteUsers.map((u) => {
                  const isChecked = selectedInviteUserIds.includes(u.id);
                  const name = u.display_name || u.nickname || '익명';

                  return (
                    <div
                      key={u.id}
                      onClick={() =>
                        setSelectedInviteUserIds((prev) =>
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
              onClick={handleInviteMembers}
              disabled={selectedInviteUserIds.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-40"
            >
              선택한 멤버 초대하기 ({selectedInviteUserIds.length}명)
            </button>
          </div>
        </div>
      )}

      {/* 👥 그룹 채팅 생성 모달 (친구 검색 포함) */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3 max-h-[80vh] flex flex-col border border-gray-100">
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

            <input
              type="text"
              placeholder="친구 닉네임 검색..."
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="block text-[10px] font-bold text-gray-500">
                초대 유저 선택 ({selectedGroupUserIds.length}명)
              </label>
              {filteredGroupUsers.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-[11px]">
                  {groupSearchQuery ? '검색된 친구가 없습니다.' : '나를 팔로우 중인 유저가 없습니다.'}
                </div>
              ) : (
                filteredGroupUsers.map((u) => {
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
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
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
    </div>
  );
}

// 📱 스와이프 및 길게 누르기(Long Press) 지원 개별 메시지 컴포넌트
function MessageItem({ msg, isMine, senderName, onReply, onLongPress, renderContent }) {
  const [translateX, setTranslateX] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const timerRef = useRef(null);
  const isSwiping = useRef(false);

  // 터치 시작 (Long Press 타이머 설정)
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isSwiping.current = false;

    timerRef.current = setTimeout(() => {
      if (!isSwiping.current) {
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(40);
        }
        onLongPress(msg, isMine, senderName);
      }
    }, 500);
  };

  // 터치 이동
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      isSwiping.current = true;
      clearTimeout(timerRef.current);
    }

    if (deltaX > 0 && deltaX < 100 && Math.abs(deltaY) < 30) {
      setTranslateX(deltaX);
    }
  };

  // 터치 종료
  const handleTouchEnd = () => {
    clearTimeout(timerRef.current);
    if (translateX > 50) {
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
      onReply(msg, senderName);
    }
    setTranslateX(0);
  };

  // 마우스 우클릭
  const handleContextMenu = (e) => {
    e.preventDefault();
    onLongPress(msg, isMine, senderName);
  };

  return (
    <div className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-0.5 select-none touch-pan-y`}>
      {!isMine && (
        <span className="text-[9.5px] font-bold text-gray-500 ml-1">
          {senderName}
        </span>
      )}

      <div
        className="relative flex items-end gap-1.5 max-w-[85%] transition-transform duration-75 ease-out"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {translateX > 15 && (
          <div
            className="absolute -left-7 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-bold transition-opacity"
            style={{ opacity: Math.min(translateX / 50, 1) }}
          >
            ↩️
          </div>
        )}

        {isMine && (
          <button
            onClick={() => onReply(msg, senderName)}
            className="opacity-0 group-hover:opacity-100 transition text-[10px] text-gray-400 hover:text-emerald-600 p-1 shrink-0"
            title="답장하기"
          >
            ↩️
          </button>
        )}

        <div
          className={`px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed break-all break-words overflow-hidden ${
            isMine
              ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
          }`}
        >
          {renderContent(msg.content)}
        </div>

        {!isMine && (
          <button
            onClick={() => onReply(msg, senderName)}
            className="opacity-0 group-hover:opacity-100 transition text-[10px] text-gray-400 hover:text-emerald-600 p-1 shrink-0"
            title="답장하기"
          >
            ↩️
          </button>
        )}
      </div>
    </div>
  );
}
