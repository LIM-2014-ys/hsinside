'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/');
        return;
      }
      setUser(user);
      setNickname(user.user_metadata?.display_name || '');
      setLoading(false);
    }
    loadUserData();
  }, [router]);

  // 1. 닉네임 변경
  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return alert('닉네임을 입력해 주세요.');

    const { error } = await supabase.auth.updateUser({
      data: { display_name: nickname.trim() },
    });

    if (error) {
      alert('닉네임 변경 실패: ' + error.message);
    } else {
      alert('닉네임이 성공적으로 변경되었습니다.');
    }
  };

  // 2. 비밀번호 변경
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return alert('비밀번호는 최소 6자리 이상이어야 합니다.');
    if (password !== confirmPassword) return alert('새 비밀번호가 일치하지 않습니다.');

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      alert('비밀번호 변경 실패: ' + error.message);
    } else {
      alert('비밀번호가 변경되었습니다.');
      setPassword('');
      setConfirmPassword('');
    }
  };

  // 3. 회원탈퇴
  const handleWithdraw = async () => {
    const confirmed = confirm(
      '정말로 탈퇴하시겠습니까?\n탈퇴 시 계정 정보가 완전히 삭제되며 복구할 수 없습니다.'
    );

    if (!confirmed || !user) return;

    try {
      const res = await fetch('/api/auth/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await supabase.auth.signOut();
        alert('회원탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
        router.push('/');
        router.refresh();
      } else {
        alert('탈퇴 처리 실패: ' + (data.error || '오류가 발생했습니다.'));
      }
    } catch (err) {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="max-w-md mx-auto my-12 text-center text-xs text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white border rounded-xl shadow-sm space-y-8 text-xs">
      <h1 className="text-base font-bold text-gray-900 border-b pb-3">👤 마이페이지</h1>

      {/* 계정 기본 정보 */}
      <div className="bg-gray-50 p-3 rounded-lg text-gray-600">
        <p><span className="font-semibold text-gray-800">이메일:</span> {user?.email}</p>
      </div>

      {/* 닉네임 수정 폼 */}
      <form onSubmit={handleUpdateNickname} className="space-y-3">
        <h2 className="font-bold text-gray-800 text-sm">닉네임 수정</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="새 닉네임 입력"
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition"
          >
            수정
          </button>
        </div>
      </form>

      <hr />

      {/* 비밀번호 변경 폼 */}
      <form onSubmit={handleUpdatePassword} className="space-y-3">
        <h2 className="font-bold text-gray-800 text-sm">비밀번호 변경</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호 (6자리 이상)"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="새 비밀번호 확인"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full py-2 bg-gray-800 text-white font-bold rounded-md hover:bg-gray-900 transition"
        >
          비밀번호 변경하기
        </button>
      </form>

      <hr />

      {/* 회원탈퇴 버튼 */}
      <div className="pt-2">
        <button
          onClick={handleWithdraw}
          className="w-full py-2 bg-red-50 text-red-600 font-bold border border-red-200 rounded-md hover:bg-red-100 transition"
        >
          ⚠️ 회원탈퇴
        </button>
      </div>
    </div>
  );
}
