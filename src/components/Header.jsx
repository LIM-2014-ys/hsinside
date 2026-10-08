'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setNickname(
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          '사용자'
        );
      } else {
        setUser(null);
        setNickname('');
      }
    };

    getInitialSession();

    <Link href="/gallery-request" className="text-gray-700 font-bold hover:text-emerald-600 transition">
      갤러리 신청
    </Link>

    // 마이페이지 등의 닉네임 수정 시 상단 헤더 동기화
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setNickname(
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          '사용자'
        );
      } else {
        setUser(null);
        setNickname('');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNickname('');
    router.push('/');
    router.refresh();
  };

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-black text-emerald-600 tracking-tight">
          hsinside
        </Link>

        <nav className="flex items-center gap-4 text-xs font-bold">
          {user ? (
            <>
              <Link href="/mypage" className="text-gray-800 hover:text-emerald-600 transition flex items-center gap-1">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-extrabold border border-emerald-100">
                  {nickname}
                </span>
                <span>님</span>
              </Link>
              <Link href="/admin/reports" className="text-gray-500 hover:text-gray-900 transition">
                관리자
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
