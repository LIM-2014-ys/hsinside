'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// 🎨 SVG 아이콘
function ReplyIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}

function ClipIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

// 💾 로컬 스토리지 데이터 관리 헬퍼 (데이터 소비 절감 & 로딩 최소화)
const getLocalMessages = (roomId) => {
  try {
    const data = localStorage.getItem(`dm_msgs_${roomId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalMessages = (roomId, msgs) => {
  try {
    // 용량 관리를 위해 최근 200개 메시지만 보관
    const sliced = msgs.slice(-200);
    localStorage.setItem(`dm_msgs_${roomId}`, JSON.stringify(sliced));
  } catch (e) {
    console.error('로컬 스토리지 저장 실패:', e);
  }
};

const getLocalRooms = () => {
  try {
    const data = localStorage.getItem('dm_rooms_list');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalRooms = (rooms) => {
  try {
    localStorage.setItem('dm_rooms_list', JSON.stringify(rooms));
  } catch (e) {}
};

export default function DMPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  const [activePresenceUserIds, setActivePresenceUserIds] = useState(new Set());

  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [actionMenuMsg, setActionMenuMsg] = useState(null);
  const [isMemberListOpen, setIsMemberListOpen] = useState(false);

  // 🏷️ @멘션 태그 자동완성 상태
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });

  // 검색 & 초대 모달 상태
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [availableGroupUsers, setAvailableGroupUsers] = useState([]);
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

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

  // 2. 대화방 목록 로드 (로컬 스토리지 우선 로딩으로 0초 반응)
  const fetchMyRooms = useCallback(async () => {
    if (!currentUser) return;

    // 캐시된 대화방 목록 먼저 즉시 표시
    const cachedRooms = getLocalRooms();
    if (cachedRooms.length > 0) {
      setRooms(cachedRooms);
      setLoading(false);
    }

    try {
      const { data: myMemberships } = await supabase
        .from('chat_room_members')
        .select('room_id, last_read_at')
        .eq('user_id', currentUser.id);

      if (!myMemberships || myMemberships.length === 0) {
        setRooms([]);
        setLocalRooms([]);
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
        setLocalRooms(processedRooms);
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

  // 3. 읽은 시각 업데이트
  const updateLastRead = useCallback(async (roomId) => {
    if (!currentUser || !roomId) return;
    const nowISO = new Date().toISOString();

    setRooms((prev) => {
      const next = prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r));
      setLocalRooms(next);
      return next;
    });

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

  // ⚡ 실시간 Presence 감지
  useEffect(() => {
    if (!activeRoom || !currentUser) return;

    updateLastRead(activeRoom.id);

    const presenceChannel = supabase.channel(`presence-room-${activeRoom.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = Object.keys(state);
        setActivePresenceUserIds(new Set(activeIds));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      setActivePresenceUserIds(new Set());
    };
  }, [activeRoom, currentUser, updateLastRead]);

  // 4. 대화방 선택 및 증분 데이터 로드 (로컬 캐시 + 신규 데이터만 가져와서 네트워크 절약)
  const loadRoomDetails = useCallback(async (room) => {
    setActiveRoom(room);
    setShowMobileSidebar(false);
    setReplyingTo(null);
    setEditingMsg(null);

    // ⚡ 1단계: 로컬 스토리지에 저장된 메시지 즉시 렌더링 (대기시간 0초)
    const cachedMsgs = getLocalMessages(room.id);
    setMessages(cachedMsgs);
    setTimeout(() => scrollToBottomIfNear(true), 10);

    // ⚡ 2단계: 최신 메시지 시각 이후의 '새로운 메시지만' Supabase에서 가져오기 (데이터 사용량 급감)
    let query = supabase
      .from('chat_messages')
      .select('*, profiles:sender_id(*)')
      .eq('room_id', room.id);

    if (cachedMsgs.length > 0) {
      const lastMsgTime = cachedMsgs[cachedMsgs.length - 1].created_at;
      query = query.gt('created_at', lastMsgTime);
    }

    const { data: newMsgData } = await query.order('created_at', { ascending: true });

    if (newMsgData && newMsgData.length > 0) {
      setMessages((prev) => {
        const map = new Map();
        [...prev, ...newMsgData].forEach((m) => map.set(m.id, m));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setLocalMessages(room.id, merged);
        return merged;
      });
    }

    // 멤버 정보 로드
    const { data: memData } = await supabase
      .from('chat_room_members')
      .select('*, profiles:user_id(*)')
      .eq('room_id', room.id);

    if (memData) setRoomMembers(memData);

    updateLastRead(room.id);
    setTimeout(() => scrollToBottomIfNear(true), 50);
  }, [updateLastRead, scrollToBottomIfNear]);

  // 5. 실시간 메시지 처리
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
              const next = [...prev, fullMsg].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              setLocalMessages(activeRoom.id, next);
              return next;
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
          if (activeRoom && activeRoom.id === payload.new.room_id) {
            setMessages((prev) => {
              const next = prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m));
              setLocalMessages(activeRoom.id, next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (activeRoom) {
            setMessages((prev) => {
              const next = prev.filter((m) => m.id !== payload.old.id);
              setLocalMessages(activeRoom.id, next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_room_members' },
        async (payload) => {
          if (activeRoom) {
            if (payload.eventType === 'DELETE' && payload.old.user_id === currentUser.id && payload.old.room_id === activeRoom.id) {
              setActiveRoom(null);
              setMessages([]);
              setRoomMembers([]);
              setShowMobileSidebar(true);
              showToast('채팅방에서 퇴장되었거나 강퇴되었습니다.');
              fetchMyRooms();
              return;
            }

            const { data: memData } = await supabase
              .from('chat_room_members')
              .select('*, profiles:user_id(*)')
              .eq('room_id', activeRoom.id);

            if (memData) setRoomMembers(memData);
          }
          fetchMyRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeRoom, fetchMyRooms, updateLastRead, scrollToBottomIfNear]);

  const isOwner = activeRoom && currentUser && activeRoom.owner_id === currentUser.id;

  // 🎯 멘션 옵션 (오직 '방장(isOwner)'에게만 @all 옵션 제공)
  const filteredMentionMembers = roomMembers.filter((m) => {
    const name = m.profiles?.display_name || m.profiles?.nickname || '';
    return name.toLowerCase().includes(mentionSearch.toLowerCase());
  });

  const mentionOptions = [
    ...(isOwner && 'all'.includes(mentionSearch.toLowerCase())
      ? [{ isAll: true, id: 'all-option' }]
      : []),
    ...filteredMentionMembers,
  ];

  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [mentionSearch, showMentionMenu]);

  // 📁 파일 업로드
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom || !currentUser || uploading) return;

    setUploading(true);
    showToast('파일 업로드 중...', 'success');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${activeRoom.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      const isImage = file.type.startsWith('image/');
      const contentStr = isImage
        ? `🖼️ [IMAGE]: ${publicUrl}`
        : `📎 [FILE]: ${file.name}|${publicUrl}`;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ room_id: activeRoom.id, sender_id: currentUser.id, content: contentStr }])
        .select('*, profiles:sender_id(*)')
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => {
          const next = [...prev, data];
          setLocalMessages(activeRoom.id, next);
          return next;
        });
        updateLastRead(activeRoom.id);
        setTimeout(() => scrollToBottomIfNear(true), 50);
        showToast('파일 전송 완료', 'success');
      }
    } catch (err) {
      console.error('파일 업로드 오류:', err);
      showToast('파일 업로드 실패 (SQL 버킷 설정을 확인해 주세요)');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 멘션 감지
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

  // 멘션 삽입
  const insertMention = (target) => {
    if (!target) return;
    const name = target.isAll
      ? 'all'
      : target.profiles?.display_name || target.profiles?.nickname || '익명';

    const cursor = inputRef.current?.selectionStart || inputMessage.length;
    const lastAt = inputMessage.lastIndexOf('@', cursor - 1);

    if (lastAt !== -1) {
      const before = inputMessage.slice(0, lastAt);
      const after = inputMessage.slice(cursor);
      const newText = `${before}@${name} ${after}`;
      setInputMessage(newText);
    }
    setShowMentionMenu(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  // 키보드 내비게이션 및 자동완성
  const handleKeyDown = (e) => {
    if (showMentionMenu && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % mentionOptions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        insertMention(mentionOptions[mentionSelectedIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
      }
    }
  };

  // 🗑️ 메시지 삭제
  const handleDeleteMessage = async (msgId) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;

      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== msgId);
        setLocalMessages(activeRoom.id, next);
        return next;
      });
      setActionMenuMsg(null);
      showToast('메시지가 삭제되었습니다.', 'success');
    } catch (err) {
      console.error('삭제 에러:', err);
      showToast('삭제 권한이 없습니다.');
    }
  };

  // ⛔ 강퇴 기능 (정상 작동 보장)
  const handleKickMember = async (targetMember) => {
    if (!activeRoom || !currentUser || !isOwner) return;
    const targetName = targetMember.profiles?.display_name || targetMember.profiles?.nickname || '익명';

    try {
      const { error } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('room_id', activeRoom.id)
        .eq('user_id', targetMember.user_id);

      if (error) throw error;

      await supabase.from('chat_messages').insert([
        {
          room_id: activeRoom.id,
          sender_id: currentUser.id,
          content: `📢 ${targetName}님이 방장에 의해 강퇴되었습니다.`,
        },
      ]);

      showToast(`${targetName}님을 강퇴했습니다.`, 'success');
      setRoomMembers((prev) => prev.filter((m) => m.user_id !== targetMember.user_id));
      fetchMyRooms();
    } catch (err) {
      console.error('강퇴 에러:', err);
      showToast('강퇴 실패: SQL RLS 권한을 확인해 주세요.');
    }
  };

  // ➕ 멤버 초대 기능 (정상 작동 보장)
  const handleInviteMembers = async () => {
    if (selectedInviteUserIds.length === 0 || !activeRoom) {
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

      const inviterName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.nickname || '누군가';
      const invitedUserNames = invitableUsers
        .filter((u) => selectedInviteUserIds.includes(u.id))
        .map((u) => u.display_name || u.nickname || '익명')
        .join(', ');

      await supabase.from('chat_messages').insert([
        {
          room_id: activeRoom.id,
          sender_id: currentUser.id,
          content: `📢 ${inviterName}님이 ${invitedUserNames}님을 초대하셨습니다.`,
        },
      ]);

      showToast('멤버를 초대했습니다!', 'success');
      setIsInviteModalOpen(false);

      // 멤버 목록 새로고침
      const { data: updatedMem } = await supabase
        .from('chat_room_members')
        .select('*, profiles:user_id(*)')
        .eq('room_id', activeRoom.id);
      if (updatedMem) setRoomMembers(updatedMem);

      fetchMyRooms();
    } catch (err) {
      console.error('초대 에러:', err);
      showToast('멤버 초대 실패');
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

  // 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeRoom || !currentUser || sending) return;

    setSending(true);

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

        setMessages((prev) => {
          const next = prev.map((m) => (m.id === editingMsg.id ? { ...m, content: updatedContent } : m));
          setLocalMessages(activeRoom.id, next);
          return next;
        });
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
        setMessages((prev) => {
          const next = [...prev, data];
          setLocalMessages(activeRoom.id, next);
          return next;
        });
        updateLastRead(activeRoom.id);
        setTimeout(() => scrollToBottomIfNear(true), 50);

        const otherMembers = roomMembers.filter((m) => m.user_id !== currentUser.id);
        const myName = currentUser.user_metadata?.display_name || '누군가';

        otherMembers.forEach((m) => {
          const isCurrentlyInRoom = activePresenceUserIds.has(m.user_id);

          if (!isCurrentlyInRoom && m.profiles?.email) {
            fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetEmail: m.profiles.email,
                title: `💬 ${activeRoom.is_group ? activeRoom.name : myName}`,
                body: finalContent,
                tag: `room-${activeRoom.id}`,
                renotify: true,
                url: `/dm`,
              }),
            }).catch((err) => console.error('푸시 에러:', err));
          }
        });
      }
    } catch (err) {
      console.error('메시지 전송 오류:', err);
      showToast('메시지 전송 실패');
    } finally {
      setSending(false);
    }
  };

  // 메시지 내용 렌더링
  const renderMessageContent = (content, isMine = false) => {
    if (content.startsWith('🖼️ [IMAGE]: ')) {
      const imageUrl = content.replace('🖼️ [IMAGE]: ', '').trim();
      return (
        <div className="py-1">
          <img
            src={imageUrl}
            alt="첨부 이미지"
            className="max-w-xs max-h-60 rounded-xl object-cover cursor-pointer shadow-xs hover:opacity-95 transition"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        </div>
      );
    }

    if (content.startsWith('📎 [FILE]: ')) {
      const fileData = content.replace('📎 [FILE]: ', '').trim();
      const [fileName, fileUrl] = fileData.split('|');
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 bg-black/10 rounded-xl flex items-center gap-2 hover:bg-black/20 transition text-xs font-bold"
        >
          <ClipIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">{fileName || '다운로드 파일'}</span>
        </a>
      );
    }

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
          <div className="p-2 bg-black/10 rounded-lg border-l-2 border-emerald-400 text-[10px] space-y-0.5 opacity-90 truncate flex items-center gap-1.5">
            <ReplyIcon className="w-3 h-3 text-emerald-300 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-emerald-300">{replyHeader.sender}에게 답장</div>
              <div className="truncate italic">{replyHeader.text}</div>
            </div>
          </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed break-all break-words overflow-hidden">
          {parts.map((part, idx) => {
            if (part.startsWith('@')) {
              const isAllMention = part.toLowerCase() === '@all';

              let badgeStyle = '';
              if (isMine) {
                badgeStyle = isAllMention
                  ? 'bg-amber-300 text-gray-900 font-extrabold px-1.5 py-0.5 rounded shadow-xs'
                  : 'bg-white/20 text-amber-200 font-bold px-1.5 py-0.5 rounded border border-white/20';
              } else {
                badgeStyle = isAllMention
                  ? 'bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs'
                  : 'bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200/60';
              }

              return (
                <span key={idx} className={badgeStyle}>
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

  // 초대 가능 팔로워 로드
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center text-gray-400 font-bold text-xs">
        💬 DM 로딩 중...
      </div>
    );
  }

  const activePartner =
    roomMembers.find((m) => m.user_id !== currentUser?.id)?.profiles ||
    rooms.find((r) => r.id === activeRoom?.id)?.members?.find((m) => m.user_id !== currentUser?.id)?.profiles;

  const activeRoomTitle = activeRoom?.is_group
    ? activeRoom.name
    : activePartner?.display_name || activePartner?.nickname || '상대방';

  const filteredInviteUsers = invitableUsers.filter((u) => {
    const name = u.display_name || u.nickname || '';
    return name.toLowerCase().includes(inviteSearchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-white w-screen h-screen h-[100dvh] flex flex-col font-sans text-xs overflow-hidden select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {toastMsg.text && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-lg ${
            toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

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
              {/* 헤더 바 */}
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
                          👑 방장
                        </span>
                      )}
                      <button
                        onClick={() => setIsMemberListOpen(true)}
                        className="text-[10px] text-emerald-700 hover:underline font-bold bg-emerald-50 px-2 py-0.5 rounded-full"
                      >
                        👥 멤버 ({roomMembers.length}명)
                      </button>
                    </h2>
                    <p className="text-[9px] text-emerald-600 font-semibold">● 실시간 캐시 연결됨</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={openInviteModal}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-[10px] transition"
                  >
                    + 초대
                  </button>

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

                    const readCount = roomMembers.filter((m) => {
                      if (activePresenceUserIds.has(m.user_id)) return true;
                      const lastRead = m.last_read_at ? new Date(m.last_read_at).getTime() : 0;
                      const msgTime = new Date(msg.created_at).getTime();
                      return lastRead >= msgTime - 500;
                    }).length;

                    const unreadCount = Math.max(0, roomMembers.length - readCount);

                    return (
                      <MessageItem
                        key={msg.id}
                        msg={msg}
                        isMine={isMine}
                        senderName={senderName}
                        unreadCount={unreadCount}
                        onReply={(m, name) => setReplyingTo({ id: m.id, senderName: name, content: m.content })}
                        onLongPress={(m, mine, name) => setActionMenuMsg({ msg: m, isMine: mine, senderName: name })}
                        renderContent={renderMessageContent}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 하단 입력 폼 */}
              <div className="relative bg-white border-t border-gray-100">
                {/* @멘션 팝오버 (오직 방장에게만 @all 표시) */}
                {showMentionMenu && mentionOptions.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto p-1.5 z-20">
                    <div className="text-[9.5px] font-bold text-gray-400 px-2 py-1 flex items-center justify-between border-b border-gray-100 mb-1">
                      <span>멤버 선택 (Space/Enter로 자동완성)</span>
                      {isOwner && <span className="text-amber-600 font-extrabold">👑 방장 모드 (@all 가능)</span>}
                    </div>
                    {mentionOptions.map((item, idx) => {
                      const isSelected = idx === mentionSelectedIndex;

                      if (item.isAll) {
                        return (
                          <div
                            key="all-option"
                            onClick={() => insertMention(item)}
                            className={`px-2.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-2 text-xs font-black transition mb-1 ${
                              isSelected
                                ? 'bg-amber-400 text-gray-900 shadow-xs'
                                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center text-[9px]">
                              📢
                            </span>
                            <span>@all (전체 멘션 - 방장 전용)</span>
                          </div>
                        );
                      }

                      const name = item.profiles?.display_name || item.profiles?.nickname || '익명';
                      return (
                        <div
                          key={item.user_id}
                          onClick={() => insertMention(item)}
                          className={`px-2.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-gray-800 hover:bg-emerald-50'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                              isSelected ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {name[0]}
                          </span>
                          <span>@{name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

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

                {replyingTo && !editingMsg && (
                  <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 truncate pr-2 flex items-center gap-1.5">
                      <ReplyIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-emerald-800">{replyingTo.senderName}에게 답장: </span>
                        <span className="text-gray-600 italic">{replyingTo.content}</span>
                      </div>
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition shrink-0"
                    title="사진/파일 첨부"
                  >
                    <ClipIcon className="w-4 h-4" />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      editingMsg
                        ? "수정할 내용 입력..."
                        : isOwner
                        ? "메시지 입력... (@로 멘션, @all 가능)"
                        : "메시지 입력... (@로 멘션)"
                    }
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
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

      {/* 📱 액션 메뉴 모달 (본인 또는 방장 삭제 지원) */}
      {actionMenuMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActionMenuMsg(null)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-2 border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
              <ReplyIcon className="w-4 h-4" /> 답장하기
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

      {/* 👥 멤버 관리 & 강퇴 모달 */}
      {isMemberListOpen && activeRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900 flex items-center gap-1.5">
                <span>👥 대화방 멤버 목록</span>
                <span className="text-emerald-600">({roomMembers.length}명)</span>
              </h3>
              <button
                onClick={() => setIsMemberListOpen(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {roomMembers.map((member) => {
                const name = member.profiles?.display_name || member.profiles?.nickname || '익명';
                const isRoomOwner = activeRoom.owner_id === member.user_id;
                const isMe = currentUser?.id === member.user_id;

                return (
                  <div
                    key={member.user_id}
                    className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0 overflow-hidden">
                        {member.profiles?.avatar_url ? (
                          <img src={member.profiles.avatar_url} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          name[0]
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-xs truncate flex items-center gap-1">
                          <span>{name}</span>
                          {isMe && <span className="text-[9px] text-emerald-600 font-extrabold">(나)</span>}
                          {isRoomOwner && <span className="text-[9px] text-amber-500 font-black">👑 방장</span>}
                        </div>
                      </div>
                    </div>

                    {/* ⛔ 오직 방장만 타인 강퇴 가능 */}
                    {isOwner && !isMe && (
                      <button
                        onClick={() => handleKickMember(member)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-[10px] transition shrink-0"
                      >
                        ⛔ 강퇴
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ➕ 멤버 추가 모달 */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3 max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">➕ 대화방에 멤버 추가</h3>
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
                초대 가능한 친구 ({selectedInviteUserIds.length}명 선택)
              </label>

              {filteredInviteUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[11px]">
                  {inviteSearchQuery ? '검색된 친구가 없습니다.' : '초대 가능한 친구가 없습니다.'}
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
              선택한 멤버 추가하기 ({selectedInviteUserIds.length}명)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 개별 메시지 컴포넌트
function MessageItem({ msg, isMine, senderName, unreadCount, onReply, onLongPress, renderContent }) {
  const formattedTime = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-0.5 select-none`}>
      {!isMine && (
        <span className="text-[9.5px] font-bold text-gray-500 ml-1">
          {senderName}
        </span>
      )}

      <div
        className="relative flex items-end gap-1.5 max-w-[85%]"
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress(msg, isMine, senderName);
        }}
      >
        {isMine && (
          <div className="flex flex-col items-end text-[9px] text-gray-400 shrink-0 select-none leading-tight">
            {unreadCount > 0 && (
              <span className="font-extrabold text-amber-500 text-[10px]">{unreadCount}</span>
            )}
            <span>{formattedTime}</span>
          </div>
        )}

        <div
          className={`px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed break-all break-words overflow-hidden ${
            isMine
              ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
          }`}
        >
          {renderContent(msg.content, isMine)}
        </div>

        {!isMine && (
          <div className="flex flex-col items-start text-[9px] text-gray-400 shrink-0 select-none leading-tight">
            {unreadCount > 0 && (
              <span className="font-extrabold text-amber-500 text-[10px]">{unreadCount}</span>
            )}
            <span>{formattedTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}
