'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 세션 정보 로드
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const nickname =
    user?.user_metadata?.nickname ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-2xs">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
        {/* 로고 영역 (절대 줄바꿈되지 않음) */}
        <Link 
          href="/" 
          className="flex items-center gap-1.5 shrink-0 font-black text-sm sm:text-base text-emerald-600 tracking-tight active:scale-95 transition"
        >
          <span>💚</span>
          <span>HSinside</span>
        </Link>

        {/* 내비게이션 & 사용자 메뉴 (모바일 대응 컴팩트 사이즈) */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold">
          {user ? (
            <>
              <span className="text-gray-700 max-w-[90px] sm:max-w-[140px] truncate hidden xs:inline-block">
                {nickname}님
              </span>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-600 rounded-lg transition shrink-0 touch-manipulation"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-lg transition shrink-0 shadow-xs touch-manipulation"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
