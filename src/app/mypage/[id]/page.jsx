'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function MyPage() {
  const params = useParams();
  const router = useRouter();

  const targetUserId = params.id;

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✍️ 작성한 게시글 및 팔로우 관련 상태
  const [userPosts, setUserPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalType, setModalType] = useState(null); // 'followers' | 'followings' | null

  // 프로필 수정 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [isNicknameChecked, setIsNicknameChecked] = useState(true);
  const [nicknameCheckMsg, setNicknameCheckMsg] = useState({ type: '', text: '' });
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // 비밀번호 변경 상태
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // 회원 탈퇴 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // 유저 데이터 및 팔로우 정보 로드
  const fetchUserData = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setCurrentUser(authUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        const currentDisplayName = profileData.display_name || profileData.nickname || '';
        setEditNickname(currentDisplayName);
        setEditBio(profileData.bio || '');
        setEditAvatarUrl(profileData.avatar_url || '');
      } else if (authUser && authUser.id === targetUserId) {
        const initialNickname =
          authUser.user_metadata?.display_name ||
          authUser.user_metadata?.nickname ||
          authUser.email?.split('@')[0] ||
          '회원';

        setProfile({
          id: authUser.id,
          email: authUser.email,
          display_name: initialNickname,
          avatar_url: null,
          bio: '안녕하세요!',
        });
        setEditNickname(initialNickname);
      }

      // 작성 글 조회
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .or(`user_id.eq.${targetUserId},author_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false });

      setUserPosts(postsData || []);

      // 팔로워 / 팔로잉 조회
      const { data: followerData } = await supabase
        .from('follows')
        .select('*, profiles:follower_id(*)')
        .eq('following_id', targetUserId);

      const { data: followingData } = await supabase
        .from('follows')
        .select('*, profiles:following_id(*)')
        .eq('follower_id', targetUserId);

      setFollowers(followerData || []);
      setFollowings(followingData || []);

      if (authUser) {
        const isFollowed = (followerData || []).some((f) => f.follower_id === authUser.id);
        setIsFollowing(isFollowed);
      }
    } catch (err) {
      console.error('마이페이지 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const isSelf = currentUser && currentUser.id === targetUserId;
  const currentDisplayName = profile?.display_name || profile?.nickname || '익명';

  // 팔로우 / 팔로우 취소 토글
  const handleFollowToggle = async () => {
    if (!currentUser) return alert('로그인이 필요합니다.');

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    if (wasFollowing) {
      setFollowers((prev) => prev.filter((f) => f.follower_id !== currentUser.id));
    } else {
      setFollowers((prev) => [...prev, { follower_id: currentUser.id, profiles: currentUser }]);
    }

    try {
      const myDisplayName =
        currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.nickname ||
        currentUser.email?.split('@')[0] ||
        '누군가';

      if (wasFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);

        // 상대방 알림 푸시
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: targetUserId,
            title: '👤 새로운 팔로워!',
            body: `${myDisplayName}님이 회원님을 팔로우하기 시작했습니다.`,
            url: `/mypage/${currentUser.id}`,
          }),
        }).catch((err) => console.error('팔로우 푸시 알림 실패:', err));
      }
    } catch (err) {
      console.error('팔로우 처리 실패:', err);
      setIsFollowing(wasFollowing);
      fetchUserData();
    }
  };

  const handleCheckNicknameDuplicate = async () => {
    if (!editNickname || !editNickname.trim()) {
      setNicknameCheckMsg({ type: 'error', text: '닉네임을 입력해 주세요.' });
      setIsNicknameChecked(false);
      return;
    }

    if (/\s/.test(editNickname)) {
      setNicknameCheckMsg({ type: 'error', text: '❌ 닉네임에 공백을 포함할 수 없습니다.' });
      setIsNicknameChecked(false);
      return;
    }

    const trimmed = editNickname.trim();

    if (trimmed.toLowerCase() === currentDisplayName.toLowerCase()) {
      setNicknameCheckMsg({ type: 'success', text: '현재 본인의 닉네임입니다.' });
      setIsNicknameChecked(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', trimmed);

      if (error) {
        setNicknameCheckMsg({ type: 'error', text: '중복 확인 중 오류가 발생했습니다.' });
        setIsNicknameChecked(false);
        return;
      }

      const otherUserMatches = data ? data.filter((item) => item.id !== currentUser?.id) : [];

      if (otherUserMatches.length > 0) {
        setNicknameCheckMsg({ type: 'error', text: '❌ 이미 사용 중인 닉네임입니다.' });
        setIsNicknameChecked(false);
      } else {
        setNicknameCheckMsg({ type: 'success', text: '✅ 사용 가능한 닉네임입니다!' });
        setIsNicknameChecked(true);
      }
    } catch {
      setNicknameCheckMsg({ type: 'error', text: '중복 확인 중 오류가 발생했습니다.' });
      setIsNicknameChecked(false);
    }
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('프로필 이미지는 2MB 이하의 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setEditAvatarUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (/\s/.test(editNickname)) {
      alert('닉네임에 공백을 포함할 수 없습니다.');
      return;
    }

    const trimmedNickname = editNickname.trim();
    if (!trimmedNickname) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    if (trimmedNickname.toLowerCase() !== currentDisplayName.toLowerCase() && !isNicknameChecked) {
      alert('닉네임 중복 확인을 진행해 주세요.');
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
            display_name: trimmedNickname,
            avatar_url: editAvatarUrl,
            bio: editBio.trim(),
            updated_at: new Date().toISOString(),
          },
        ]);

      await supabase.auth.updateUser({
        data: { display_name: trimmedNickname },
      });

      if (!error) {
        setProfile((prev) => ({
          ...prev,
          display_name: trimmedNickname,
          avatar_url: editAvatarUrl,
          bio: editBio.trim(),
        }));
        setIsEditing(false);
        setNicknameCheckMsg({ type: '', text: '' });
        alert('프로필 정보가 성공적으로 저장되었습니다!');
      } else {
        alert(`저장 실패: ${error.message}`);
      }
    } catch {
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: '비밀번호는 최소 6자리 이상이어야 합니다.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: '비밀번호 확인이 일치하지 않습니다.' });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordStatus({ type: 'error', message: `변경 실패: ${error.message}` });
      } else {
        setPasswordStatus({ type: 'success', message: '🔒 비밀번호가 성공적으로 변경되었습니다!' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordStatus({ type: '', message: '' });
        }, 1500);
      }
    } catch {
      setPasswordStatus({ type: 'error', message: '비밀번호 변경 처리 중 오류가 발생했습니다.' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    setDeletingAccount(true);
    try {
      await supabase.from('profiles').delete().eq('id', currentUser.id);
      await supabase.auth.signOut();
      alert('회원 탈퇴가 완료되었습니다.');
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
        🏠 마이페이지 정보를 불러오는 중입니다...
      </div>
    );
  }

  const modalList = modalType === 'followers' ? followers : followings;

  return (
    <div className="max-w-md mx-auto my-6 px-4 font-sans text-xs space-y-5">
      <button
        onClick={() => router.back()}
        className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
      >
        ← 뒤로 가기
      </button>

      {/* 📌 상단 프로필 카드 */}
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
            <h1 className="text-base font-black text-gray-900">{currentDisplayName}</h1>
            <AdminBadge email={profile?.email} />
          </div>
          {profile?.email && <p className="text-[11px] text-gray-400 font-medium">{profile.email}</p>}
        </div>

        {/* 팔로워/팔로잉 카운트 */}
        <div className="flex items-center justify-center gap-8 py-3 border-y border-gray-100">
          <button
            type="button"
            onClick={() => setModalType('followers')}
            className="text-center group transition active:scale-95"
          >
            <div className="font-black text-sm text-gray-900 group-hover:text-emerald-600 transition">
              {followers.length}
            </div>
            <div className="text-[10px] text-gray-400 font-bold">팔로워</div>
          </button>

          <div className="w-px h-6 bg-gray-100" />

          <button
            type="button"
            onClick={() => setModalType('followings')}
            className="text-center group transition active:scale-95"
          >
            <div className="font-black text-sm text-gray-900 group-hover:text-emerald-600 transition">
              {followings.length}
            </div>
            <div className="text-[10px] text-gray-400 font-bold">팔로잉</div>
          </button>
        </div>

        <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 text-gray-700 text-[11px] leading-relaxed break-words whitespace-pre-wrap text-left min-h-[50px]">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">💬 소개 메시지</span>
          {profile?.bio || '작성된 소개 메시지가 없습니다.'}
        </div>

        {/* 액션 버튼 */}
        <div className="pt-2 space-y-2">
          {isSelf ? (
            <>
              <Link
                href="/dm"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                💬 DM / 채팅함으로 이동
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setIsChangingPassword(false);
                    setNicknameCheckMsg({ type: '', text: '' });
                  }}
                  className="py-2.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
                >
                  {isEditing ? '수정 취소' : '⚙️ 프로필 수정'}
                </button>

                <button
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setIsEditing(false);
                  }}
                  className="py-2.5 bg-emerald-50 active:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-xs"
                >
                  {isChangingPassword ? '변경 취소' : '🔒 비번 변경'}
                </button>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 bg-red-600 active:bg-red-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
                >
                  🚪 회원 탈퇴하기
                </button>
              ) : (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-100 space-y-2 text-left">
                  <p className="text-red-700 font-bold text-[11px]">⚠️ 정말로 탈퇴하시겠습니까?</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl text-[11px]"
                    >
                      {deletingAccount ? '탈퇴 중...' : '예, 탈퇴합니다'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-[11px]"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={handleFollowToggle}
              className={`w-full py-2.5 rounded-xl font-bold transition text-xs active:scale-95 ${
                isFollowing
                  ? 'bg-gray-100 text-gray-700 border border-gray-200'
                  : 'bg-emerald-600 text-white shadow-sm'
              }`}
            >
              {isFollowing ? '팔로우 취소' : '+ 팔로우'}
            </button>
          )}
        </div>

        {/* 프로필 수정 폼 */}
        {isSelf && isEditing && (
          <form onSubmit={handleUpdateProfile} className="text-left pt-4 border-t border-gray-100 space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">🏷️ 닉네임 변경 및 중복 확인</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="새 닉네임 입력"
                  value={editNickname}
                  onChange={(e) => {
                    setEditNickname(e.target.value);
                    setIsNicknameChecked(false);
                  }}
                  required
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={handleCheckNicknameDuplicate}
                  className="px-3 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-[11px]"
                >
                  중복 확인
                </button>
              </div>
              {nicknameCheckMsg.text && (
                <p className={`text-[10px] font-semibold mt-1 ${nicknameCheckMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {nicknameCheckMsg.text}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">📸 프로필 사진 업로드</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="w-full text-[11px] text-gray-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">✏️ 소개 메시지</label>
              <textarea
                rows={3}
                placeholder="자기소개를 작성해 보세요!"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
            >
              {updatingProfile ? '저장 중...' : '프로필 저장하기'}
            </button>
          </form>
        )}

        {/* 비밀번호 변경 폼 */}
        {isSelf && isChangingPassword && (
          <form onSubmit={handleChangePassword} className="text-left pt-4 border-t border-gray-100 space-y-3">
            <h3 className="font-bold text-xs text-gray-900 mb-2">🔒 비밀번호 변경</h3>

            {passwordStatus.message && (
              <div className={`p-2.5 rounded-xl text-[11px] font-semibold ${passwordStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {passwordStatus.message}
              </div>
            )}

            <input
              type="password"
              placeholder="새 비밀번호 입력"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
            />
            <input
              type="password"
              placeholder="새 비밀번호 다시 입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
            />

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
            >
              {updatingPassword ? '변경 처리 중...' : '비밀번호 변경하기'}
            </button>
          </form>
        )}
      </div>

      {/* 작성한 게시글 카드 */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-3">
        <h2 className="font-black text-xs text-gray-900 border-b border-gray-100 pb-2.5">
          ✍️ 작성한 게시글 <span className="text-emerald-600">{userPosts.length}</span>개
        </h2>

        <div className="divide-y divide-gray-100">
          {userPosts.length === 0 ? (
            <div className="py-6 text-center text-gray-400 font-medium text-[11px]">
              작성한 게시글이 없습니다.
            </div>
          ) : (
            userPosts.map((post) => (
              <Link
                key={post.id}
                href={`/gallery/${post.gallery_id || 'free'}/${post.id}`}
                className="py-2.5 flex items-center justify-between gap-3 group block hover:bg-gray-50/50 -mx-1 px-1 rounded-xl transition"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="font-bold text-gray-800 text-[11px] truncate group-hover:text-emerald-600 transition">
                    {post.title}
                  </h3>
                  <div className="text-[9px] text-gray-400">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 shrink-0">
                  보기 →
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 👥 단순화된 팔로워 / 팔로잉 팝업 (닉네임 & 프로필 사진만 노출, DM 버튼 없음) */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 max-h-[75vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-xs text-gray-900">
                {modalType === 'followers' ? '👥 팔로워' : '👥 팔로잉'} 목록 ({modalList.length})
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full font-bold flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
              {modalList.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-medium text-[11px]">
                  목록이 비어 있습니다.
                </div>
              ) : (
                modalList.map((item) => {
                  const targetUser = item.profiles;
                  if (!targetUser) return null;

                  const targetName = targetUser.display_name || targetUser.nickname || '익명';

                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <Link
                        href={`/mypage/${targetUser.id}`}
                        onClick={() => setModalType(null)}
                        className="flex items-center gap-2.5 min-w-0 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs shrink-0 overflow-hidden">
                          {targetUser.avatar_url ? (
                            <img src={targetUser.avatar_url} alt={targetName} className="w-full h-full object-cover" />
                          ) : (
                            targetName[0]
                          )}
                        </div>
                        <span className="font-bold text-gray-800 text-xs truncate group-hover:text-emerald-600 transition">
                          {targetName}
                        </span>
                      </Link>

                      <Link
                        href={`/mypage/${targetUser.id}`}
                        onClick={() => setModalType(null)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 font-bold rounded-lg text-[10px] shrink-0 transition"
                      >
                        프로필 보기
                      </Link>
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
