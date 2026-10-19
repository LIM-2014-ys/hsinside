'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GroupChatModal({ roomId, roomTitle, currentUser, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [members, setMembers] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!roomId || !isOpen) return;

    // 메시지 및 참여 멤버 로드
    const fetchGroupData = async () => {
      const { data: msgData } = await supabase
        .from('chat_messages')
        .select('*, profiles:sender_id(display_name, nickname)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (msgData) setMessages(msgData);

      const { data: memData } = await supabase
        .from('chat_room_members')
        .select('*, profiles:user_id(display_name, nickname)')
        .eq('room_id', roomId);

      if (memData) setMembers(memData);
    };

    fetchGroupData();

    // Realtime 실시간 수신
    const channel = supabase
      .channel(`group-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, nickname')
            .eq('id', payload.new.sender_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, profiles: senderProfile }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentUser || sending) return;

    setSending(true);
    const text = input.trim();
    setInput('');

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            room_id: roomId,
            sender_id: currentUser.id,
            content: text,
          },
        ])
        .select('*, profiles:sender_id(display_name, nickname)')
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error('그룹 메시지 전송 실패:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const memberNames = members
    .map((m) => m.profiles?.display_name || m.profiles?.nickname || '익명')
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans text-xs">
      <div className="bg-white w-full max-w-sm h-[85vh] max-h-[650px] rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-black text-xs text-gray-900 truncate">{roomTitle || '그룹 채팅'}</h3>
            <p className="text-[9px] text-gray-400 truncate mt-0.5">참여: {memberNames}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* 메시지 구역 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const senderName = msg.profiles?.display_name || msg.profiles?.nickname || '익명';

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}>
                {!isMe && <span className="text-[9.5px] font-bold text-gray-500 ml-1">{senderName}</span>}
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl leading-relaxed break-words ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-gray-400 px-1">
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-3.5 py-2 text-emerald-600 active:text-emerald-800 font-bold text-xs disabled:opacity-30 transition shrink-0"
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
