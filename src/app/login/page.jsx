'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(`로그인 실패: ${error.message}`);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white border rounded-xl shadow-sm space-y-5">
      <h1 className="text-xl font-bold text-gray-900 border-b pb-3">🔑 로그인</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            placeholder="example@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            placeholder="비밀번호 입력"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 pt-2 border-t">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-blue-600 font-bold hover:underline">
          회원가입하기
        </Link>
      </div>
    </div>
  );
}
