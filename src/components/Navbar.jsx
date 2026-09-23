'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // 세션 정보 확인
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    // 로그인/로그아웃 상태 변경 감지
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black text-blue-600 tracking-tight">hsinside</span>
        </Link>

        {/* 우측 메뉴 (로그인 여부에 따른 표시) */}
        <nav className="flex items-center gap-4 text-xs font-medium">
          {user ? (
            <>
              <span className="text-gray-600 hidden sm:inline">
                <strong className="text-gray-900">{user.user_metadata?.name || '회원'}</strong> 님
              </span>
              <Link
                href="/mypage"
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                마이페이지
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-gray-700 hover:text-blue-600 transition"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
