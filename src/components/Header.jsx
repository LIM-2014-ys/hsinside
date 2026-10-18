'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isAdmin = isAdminEmail(user?.email);

  const displayName =
    user?.user_metadata?.nickname ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    '회원';

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm py-3 px-4 sm:px-6 sticky top-0 z-40 font-sans">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight hover:text-blue-700 transition"
        >
          HSinside
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href={`/mypage/${user.id}`}
                className="text-gray-700 font-bold text-xs truncate max-w-[120px] sm:max-w-[180px] hover:underline"
              >
                <span className="text-blue-600 font-extrabold">{displayName}</span>님
              </Link>

              {isAdmin && (
                <span className="hidden sm:inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                  🛡️ 관리자
                </span>
              )}

              <Link
                href={`/mypage/${user.id}`}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition"
              >
                마이페이지
              </Link>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition"
              >
                회원가입
              </Link>

              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
              >
                로그인
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
