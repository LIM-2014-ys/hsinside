'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ChatModal({ roomId, roomTitle, currentUser, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!roomId || !isOpen) return;

    // 1. 메시지 목록 및 멤버 조회
    const fetchChatData = async () => {
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

    fetchChatData();

    // 2. Realtime 메시지 감지
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, nickname')
            .eq('id', payload.new.sender_id)
            .single();

          setMessages((prev) => [...prev, { ...payload.new, profiles: senderProfile }]);
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
    if (!input.trim() || !currentUser) return;

    const msgText = input.trim();
    setInput('');

    await supabase.from('chat_messages').insert([
      {
        room_id: roomId,
        sender_id: currentUser.id,
        content: msgText,
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 font-sans">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-black text-sm text-gray-900">{roomTitle || 'DM 채팅'}</h3>
            <p className="text-[10px] text-gray-400">
              참여: {members.map((m) => m.profiles?.display_name || m.profiles?.nickname || '익명').join(', ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold text-xs flex items-center justify-center text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 text-xs">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const senderName = msg.profiles?.display_name || msg.profiles?.nickname || '익명';

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[10px] text-gray-400 mb-1 ml-1">{senderName}</span>}
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl break-words leading-relaxed ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-xs'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
