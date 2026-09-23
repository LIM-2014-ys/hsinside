'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) return alert('이메일과 비밀번호를 입력해 주세요.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('로그인 실패: ' + error.message);
    else router.push('/');
  };

  const handleSignUp = async () => {
    if (!email || !password) return alert('이메일과 비밀번호를 입력해 주세요.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` }
    });
    if (error) alert('회원가입 실패: ' + error.message);
    else alert('가입 확인 메일을 보냈습니다. 이메일을 확인해 주세요!');
  };

  return (
    <div className="flex flex-col items-center justify-center pt-12">
      <div className="w-full max-w-md bg-white border border-gray-200 p-8 rounded-xl shadow-sm text-center">
        <h1 className="text-3xl font-bold mb-2">🏫 hsinside</h1>
        <p className="text-gray-500 text-sm mb-6">서비스 이용을 위해 로그인해 주세요.</p>
        
        <input
          type="email"
          placeholder="이메일 입력"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md mb-3 text-sm focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md mb-4 text-sm focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium text-sm mb-2 transition"
        >
          로그인
        </button>
        <button
          onClick={handleSignUp}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md font-medium text-sm transition"
        >
          회원가입
        </button>
      </div>
    </div>
  );
}
