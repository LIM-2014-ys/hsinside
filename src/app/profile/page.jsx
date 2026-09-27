'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getUserProfile();
  }, []);

  const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);
    setNickname(user.user_metadata?.display_name || user.email.split('@')[0]);
    setAvatarUrl(user.user_metadata?.avatar_url || '');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert('프로필 사진이 변경되었습니다.');
    } catch (err) {
      alert(`업로드 실패: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return alert('닉네임을 입력해 주세요.');

    const { error } = await supabase.auth.updateUser({
      data: { display_name: nickname.trim() }
    });

    if (error) alert(`저장 실패: ${error.message}`);
    else alert('프로필 정보가 저장되었습니다.');
  };

  if (!user) return <div className="p-8 text-center text-xs text-gray-500">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-6">
      <h1 className="text-base font-bold text-gray-900 border-b pb-3">👤 프로필 설정</h1>

      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 relative bg-gray-100 flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="프로필" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-gray-400 font-bold">{nickname.charAt(0)}</span>
          )}
        </div>
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-md font-medium transition">
          {uploading ? '업로드 중...' : '프로필 사진 변경'}
          <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} className="hidden" />
        </label>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">계정 이메일 (변경 불가)</label>
          <input type="text" value={user.email} disabled className="w-full px-3 py-2 border rounded-md text-xs bg-gray-50 text-gray-400" />
        </div>
        <button type="submit" className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition">
          정보 저장
        </button>
      </form>
    </div>
  );
}
