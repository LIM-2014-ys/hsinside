'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function UserPublicProfilePage() {
  const params = useParams();
  const router = useRouter();

  // URL에서 전달된 식별자 (이메일 또는 유저 ID)
  const targetUserIdentifier = decodeURIComponent(params.id || '');

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [receivedDms, setReceivedDms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // DM 보내기 모달 상태 (타인 프로필용)
  const [isDmOpen, setIsDmOpen] = useState(false);
  const [dmContent, setDmContent] = useState('');
  const [sendingDm, setSendingDm] = useState(false);
  const [dmStatus, setDmStatus] = useState({ type: '', message: '' });

  // 내 프로필 수정 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // 1. 현재 접속 중인 로그인 유저 정보
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUser(authUser);

        // 2. 대상 프로필 데이터 조회
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.eq.${targetUserIdentifier},id.eq.${targetUserIdentifier}`)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
          setEditBio(profileData.bio || '');
          setEditAvatarUrl(profileData.avatar_url || '');
        } else {
          // profiles 테이블에 없는 경우 기본 프로필 객체 생성
          const defaultNickname = targetUserIdentifier.includes('@')
            ? targetUserIdentifier.split('@')[0]
            : targetUserIdentifier;

          setProfile({
            email: targetUserIdentifier.includes('@') ? targetUserIdentifier : null,
            nickname: defaultNickname,
            avatar_url: null,
            bio: '안녕하세요!',
          });
        }

        // 3. 본인 마이페이지인 경우, 받은 DM 목록 조회
        const isUserSelf = authUser && (
          authUser.email === targetUserIdentifier ||
          authUser.id === targetUserIdentifier ||
          (profileData && authUser.email === profileData.email)
        );

        if (isUserSelf && authUser.email) {
          const { data: dmData } = await supabase
            .from('direct_messages')
            .select('*')
            .eq('receiver_email', authUser.email)
            .order('created_at', { ascending: false });

          if (dmData) {
            setReceivedDms(dmData);
          }
        }
      } catch (err) {
        console.error('프로필 및 DM 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    if (targetUserIdentifier) {
      fetchUserData();
    }
  }, [targetUserIdentifier]);

  const isSelf = currentUser && (
    currentUser.email === profile?.email ||
    currentUser.id === targetUserIdentifier ||
    currentUser.email === targetUserIdentifier
  );

  // 이미지 파일 직접 업로드 처리 함수
  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // 파일 용량 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 가능합니다.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${currentUser.id}_${Date.now()}.${fileExt}`;

      // Supabase Storage 'avatars' 버킷에 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        alert(`이미지 업로드 실패: ${uploadError.message}\n(URL 직접 입력도 이용 가능합니다)`);
      } else {
        // 업로드된 이미지 Public URL 가져오기
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setEditAvatarUrl(publicUrl);
      }
    } catch (err) {
      console.error('이미지 업로드 예외:', err);
      alert('이미지 업로드 처리 중 오류가 발생했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  // 프로필 저장 함수 (소개 메시지 & 프사)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setUpdatingProfile(true);
    try {
      const userNickname =
        currentUser.user_metadata?.nickname ||
        currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        '익명';

      const { error } = await supabase
        .from('profiles')
        .upsert([
          {
            id: currentUser.id,
            email: currentUser.email,
            nickname: userNickname,
            avatar_url: editAvatarUrl.trim(),
            bio: editBio.trim(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (!error) {
        setProfile((prev) => ({
          ...prev,
          avatar_url: editAvatarUrl.trim(),
          bio: editBio.trim(),
        }));
        setIsEditing(false);
      } else {
        alert(`프로필 저장 실패: ${error.message}`);
      }
    } catch {
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // 1:1 DM 전송 함수 (타인에게)
  const handleSendDm = async (e) => {
    e.preventDefault();
    if (!dmContent.trim() || !currentUser) return;

    setSendingDm(true);
    setDmStatus({ type: '', message: '' });

    try {
      const senderName =
        currentUser.user_metadata?.nickname ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        '익명';

      const { error } = await supabase
        .from('direct_messages')
        .insert([
          {
            sender_email: currentUser.email,
            sender_name: senderName,
            receiver_email: profile?.email || targetUserIdentifier,
            content: dmContent.trim(),
          },
        ]);

      if (error) {
        setDmStatus({ type: 'error', message: `전송 실패: ${error.message}` });
      } else {
        setDmStatus({ type: 'success', message: '✉️ 메시지를 성공적으로 보냈습니다!' });
        setDmContent('');
        setTimeout(() => {
          setIsDmOpen(false);
          setDmStatus({ type: '', message: '' });
        }, 1500);
      }
    } catch {
      setDmStatus({ type: 'error', message: '메시지 전송 중 오류가 발생했습니다.' });
    } finally {
      setSendingDm(false);
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
      {/* 뒤로 가기 */}
      <button
        onClick={() => router.back()}
        className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px] touch-manipulation"
      >
        ← 뒤로 가기
      </button>

      {/* 메인 프로필 카드 */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-center space-y-4 relative">
        {/* 프로필 이미지 (프사) */}
        <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center shadow-xs">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="프로필 이미지"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">👤</span>
          )}
        </div>

        {/* 닉네임 및 관리자 배지 */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-base font-black text-gray-900">
              {profile?.nickname || '익명'}
            </h1>
            <AdminBadge email={profile?.email} />
          </div>
          {profile?.email && (
            <p className="text-[11px] text-gray-400 font-medium">{profile.email}</p>
          )}
        </div>

        {/* 소개 메시지 (바이오) */}
        <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 text-gray-700 text-[11px] leading-relaxed break-words whitespace-pre-wrap text-left min-h-[50px]">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">💬 소개 메시지</span>
          {profile?.bio || '작성된 소개 메시지가 없습니다.'}
        </div>

        {/* 액션 버튼 */}
        <div className="pt-2">
          {isSelf ? (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full py-2.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs touch-manipulation"
            >
              {isEditing ? '취소' : '⚙️ 프로필 이미지 & 소개글 수정'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (!currentUser) {
                  alert('DM을 보내려면 먼저 로그인해야 합니다.');
                  return;
                }
                setIsDmOpen(true);
              }}
              className="w-full py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-xs shadow-xs touch-manipulation flex items-center justify-center gap-1.5"
            >
              💬 1:1 DM 보내기
            </button>
          )}
        </div>

        {/* 프로필 수정 폼 (본인 전용) */}
        {isSelf && isEditing && (
          <form onSubmit={handleUpdateProfile} className="text-left pt-4 border-t border-gray-100 space-y-3.5">
            {/* 프로필 이미지 파일 업로드 */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">
                📸 프로필 이미지 변경 (파일 업로드)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                disabled={uploadingImage}
                className="w-full text-[11px] text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 touch-manipulation"
              />
              {uploadingImage && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">⏳ 이미지 업로드 중...</p>
              )}
            </div>

            {/* 이미지 URL 직접 입력 (선택) */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">
                🔗 또는 이미지 URL 직접 입력
              </label>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 touch-manipulation"
              />
            </div>

            {/* 소개 메시지 작성 */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">
                ✏️ 소개 메시지
              </label>
              <textarea
                rows={3}
                placeholder="자기소개 또는 나를 표현하는 문구를 작성해 보세요!"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-800 touch-manipulation resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile || uploadingImage}
              className="w-full py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50 touch-manipulation"
            >
              {updatingProfile ? '저장 중...' : '프로필 저장하기'}
            </button>
          </form>
        )}
      </div>

      {/* 받은 DM 목록 섹션 (내 마이페이지인 경우에만 표시) */}
      {isSelf && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h2 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
              📥 내가 받은 DM 목록
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px]">
                {receivedDms.length}개
              </span>
            </h2>
          </div>

          {receivedDms.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-medium text-[11px]">
              도착한 DM이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
              {receivedDms.map((dm) => (
                <div key={dm.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-gray-900 truncate max-w-[160px]">
                      보낸사람: {dm.sender_name || '익명'} ({dm.sender_email})
                    </span>
                    <span className="text-gray-400 shrink-0">
                      {new Date(dm.created_at).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl text-gray-800 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                    {dm.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DM 전송 모달 (타인에게 보낼 때) */}
      {isDmOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-bold text-xs text-gray-900">
                💬 {profile?.nickname}님에게 DM 보내기
              </h3>
              <button
                onClick={() => setIsDmOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs p-1"
              >
                ✕
              </button>
            </div>

            {dmStatus.message && (
              <div
                className={`p-2.5 rounded-xl text-[11px] font-semibold ${
                  dmStatus.type === 'error'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {dmStatus.message}
              </div>
            )}

            <form onSubmit={handleSendDm} className="space-y-3">
              <textarea
                rows={4}
                placeholder="전송할 메시지 내용을 입력하세요..."
                value={dmContent}
                onChange={(e) => setDmContent(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-gray-800 touch-manipulation resize-none leading-relaxed"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDmOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px] touch-manipulation"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={sendingDm || !dmContent.trim()}
                  className="px-4 py-1.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px] disabled:opacity-50 touch-manipulation"
                >
                  {sendingDm ? '전송 중...' : '보내기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
