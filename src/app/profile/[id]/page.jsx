'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function UserPublicProfilePage() {
  const params = useParams();
  const router = useRouter();

  const targetUserIdentifier = decodeURIComponent(params.id || '');

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 채팅방(인스타 DM 스타일) 상태
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 내 프로필 수정 및 회원 탈퇴 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // 유저 데이터 및 프로필 조회
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUser(authUser);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.eq.${targetUserIdentifier},id.eq.${targetUserIdentifier}`)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
          setEditNickname(profileData.nickname || '');
          setEditBio(profileData.bio || '');
          setEditAvatarUrl(profileData.avatar_url || '');
        } else {
          const defaultNickname = targetUserIdentifier.includes('@')
            ? targetUserIdentifier.split('@')[0]
            : targetUserIdentifier;

          const initialNickname =
            authUser?.user_metadata?.nickname ||
            authUser?.user_metadata?.display_name ||
            authUser?.user_metadata?.name ||
            defaultNickname;

          setProfile({
            email: targetUserIdentifier.includes('@') ? targetUserIdentifier : null,
            nickname: initialNickname,
            avatar_url: null,
            bio: '안녕하세요!',
          });
          setEditNickname(initialNickname);
        }
      } catch (err) {
        console.error('프로필 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    if (targetUserIdentifier) {
      fetchUserData();
    }
  }, [targetUserIdentifier]);

  const targetEmail = profile?.email || (targetUserIdentifier.includes('@') ? targetUserIdentifier : null);
  const isSelf = currentUser && (currentUser.email === targetEmail || currentUser.id === targetUserIdentifier);

  // 채팅 메시지 목록 로드 & 실시간(Realtime) 감지
  useEffect(() => {
    if (!isChatOpen || !currentUser?.email || !targetEmail) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_email.eq.${currentUser.email},receiver_email.eq.${targetEmail}),and(sender_email.eq.${targetEmail},receiver_email.eq.${currentUser.email})`
        )
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`dm-chat-${currentUser.email}-${targetEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newDm = payload.new;
          const isRelated =
            (newDm.sender_email === currentUser.email && newDm.receiver_email === targetEmail) ||
            (newDm.sender_email === targetEmail && newDm.receiver_email === currentUser.email);

          if (isRelated) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newDm.id)) return prev;
              return [...prev, newDm];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isChatOpen, currentUser, targetEmail]);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentUser?.email || !targetEmail || sending) return;

    setSending(true);
    const contentToSend = inputMessage.trim();
    setInputMessage('');

    try {
      const senderName =
        profile?.nickname ||
        currentUser.user_metadata?.nickname ||
        currentUser.email?.split('@')[0] ||
        '익명';

      const { data, error } = await supabase
        .from('direct_messages')
        .insert([
          {
            sender_email: currentUser.email,
            sender_name: senderName,
            receiver_email: targetEmail,
            content: contentToSend,
          },
        ])
        .select('*')
        .single();

      if (!error && data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error('메시지 전송 오류:', err);
    } finally {
      setSending(false);
    }
  };

  // 프사 로컬 이미지 변환
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('프로필 이미지는 2MB 이하의 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 내 프로필 업데이트
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!editNickname.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([
          {
            id: currentUser.id,
            email: currentUser.email,
            nickname: editNickname.trim(),
            avatar_url: editAvatarUrl,
            bio: editBio.trim(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (!error) {
        setProfile((prev) => ({
          ...prev,
          nickname: editNickname.trim(),
          avatar_url: editAvatarUrl,
          bio: editBio.trim(),
        }));
        setIsEditing(false);
        alert('프로필 정보가 성공적으로 변경되었습니다!');
      } else {
        alert(`저장 실패: ${error.message}`);
      }
    } catch {
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // 회원 탈퇴 처리 함수
  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    setDeletingAccount(true);
    try {
      // 1. profiles 테이블에서 내 프로필 제거
      await supabase
        .from('profiles')
        .delete()
        .eq('id', currentUser.id);

      // 2. Supabase Auth 로그아웃 처리
      await supabase.auth.signOut();

      alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      router.push('/');
    } catch (err) {
      console.error('회원 탈퇴 오류:', err);
      alert('회원 탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto my-12 text-center text-gray-400 font-bold text-xs px-4">
        👤 프로필 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-6 px-4 font-sans text-xs space-y-5">
      <button
        onClick={() => router.back()}
        className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px] touch-manipulation"
      >
        ← 뒤로 가기
      </button>

      {/* 메인 프로필 카드 */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-center space-y-4 relative">
        <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center shadow-xs">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="프로필" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">👤</span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-base font-black text-gray-900">{profile?.nickname || '익명'}</h1>
            <AdminBadge email={profile?.email} />
          </div>
          {profile?.email && <p className="text-[11px] text-gray-400 font-medium">{profile.email}</p>}
        </div>

        <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 text-gray-700 text-[11px] leading-relaxed break-words whitespace-pre-wrap text-left min-h-[50px]">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">💬 소개 메시지</span>
          {profile?.bio || '작성된 소개 메시지가 없습니다.'}
        </div>

        <div className="pt-2 space-y-2">
          {isSelf ? (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full py-2.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs touch-manipulation"
              >
                {isEditing ? '취소' : '⚙️ 프로필 수정'}
              </button>

              {/* 회원 탈퇴 버튼 */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 text-rose-500 hover:text-rose-700 font-semibold transition text-[11px] touch-manipulation"
                >
                  🚪 회원 탈퇴하기
                </button>
              ) : (
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 space-y-2 text-left">
                  <p className="text-rose-700 font-bold text-[11px]">
                    ⚠️ 정말로 탈퇴하시겠습니까?
                  </p>
                  <p className="text-rose-600/80 text-[10px] leading-snug">
                    탈퇴 시 프로필 데이터가 삭제되며 서비스에서 로그아웃됩니다.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="flex-1 py-1.5 bg-rose-600 active:bg-rose-700 text-white font-bold rounded-xl text-[11px] transition touch-manipulation disabled:opacity-50"
                    >
                      {deletingAccount ? '탈퇴 처리 중...' : '예, 탈퇴합니다'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-1.5 bg-gray-200 active:bg-gray-300 text-gray-700 font-bold rounded-xl text-[11px] transition touch-manipulation"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                if (!currentUser) {
                  alert('DM을 보내려면 로그인해야 합니다.');
                  return;
                }
                setIsChatOpen(true);
              }}
              className="w-full py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-xs shadow-xs touch-manipulation flex items-center justify-center gap-1.5"
            >
              💬 메시지 보내기 (DM)
            </button>
          )}
        </div>

        {/* 내 프로필 수정 폼 */}
        {isSelf && isEditing && (
          <form onSubmit={handleUpdateProfile} className="text-left pt-4 border-t border-gray-100 space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">🏷️ 닉네임 설정</label>
              <input
                type="text"
                placeholder="사용할 닉네임을 입력해 주세요"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 touch-manipulation font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">📸 프로필 사진 업로드</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="w-full text-[11px] text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 touch-manipulation"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">🔗 또는 웹 이미지 URL</label>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 touch-manipulation"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">✏️ 소개 메시지</label>
              <textarea
                rows={3}
                placeholder="자기소개를 작성해 보세요!"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 touch-manipulation resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="w-full py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50 touch-manipulation"
            >
              {updatingProfile ? '저장 중...' : '프로필 저장하기'}
            </button>
          </form>
        )}
      </div>

      {/* 인스타그램 스타일 채팅창 */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white w-full max-w-sm h-[85vh] max-h-[650px] rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-50 border border-emerald-100 shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="프사" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs text-gray-900 truncate">
                    {profile?.nickname || '익명'}
                  </h3>
                  <p className="text-[9px] text-emerald-600 font-semibold">● 대화 중</p>
                </div>
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 text-gray-400 hover:text-gray-600 font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-gray-400">
                  <span className="text-3xl">💬</span>
                  <p className="text-[11px] font-medium">
                    {profile?.nickname}님에게 첫 메시지를 보내보세요!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_email === currentUser?.email;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div
                        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed break-words ${
                          isMine
                            ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-2xs'
                        }`}
                      >
                        {msg.content}
                      </div>

                      <span className="text-[9px] text-gray-400 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
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
                placeholder="메시지 보내기..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 placeholder:text-gray-400 touch-manipulation"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="px-3.5 py-2 text-emerald-600 active:text-emerald-800 font-bold text-xs disabled:opacity-30 transition touch-manipulation shrink-0"
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
