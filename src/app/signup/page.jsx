'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      alert('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!nickname.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    setLoading(true);

    try {
      // Supabase 회원가입 API 호출 (user_metadata에 display_name 저장)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: nickname.trim(),
          },
        },
      });

      if (error) {
        alert('회원가입 실패: ' + error.message);
      } else {
        // 이메일 인증 설정 여부에 따라 분기
        if (data?.session) {
          alert('회원가입이 완료되었습니다! 환영합니다.');
          router.push('/');
          router.refresh();
        } else {
          alert('회원가입 요청이 완료되었습니다!\n이메일 인증 또는 로그인해 주세요.');
          router.push('/login');
        }
      }
    } catch (err) {
      console.error(err);
      alert('회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white border rounded-xl shadow-sm space-y-6 text-xs">
      <div className="text-center border-b pb-4">
        <h1 className="text-lg font-bold text-gray-900">✨ 회원가입</h1>
        <p className="text-gray-500 mt-1">서비스 이용을 위한 계정을 생성합니다.</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block font-semibold text-gray-700 mb-1">이메일 *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">닉네임 *</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="사용하실 닉네임을 입력해 주세요"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">비밀번호 *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자리 이상)"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">비밀번호 확인 *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호를 한 번 더 입력해 주세요"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 mt-2"
        >
          {loading ? '가입 진행 중...' : '회원가입하기'}
        </button>
      </form>

      <div className="text-center border-t pt-4 text-gray-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 font-semibold hover:underline">
          로그인하기
        </Link>
      </div>
    </div>
  );
}
