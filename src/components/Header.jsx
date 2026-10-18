'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 로그인 사용자 정보 세션 가져오기
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();

    // 로그인/로그아웃 상태 실시간 감지
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

  // 사용자 닉네임/이름 추출
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
        {/* 이모지 없는 슬림한 파란색 로고 */}
        <Link
          href="/"
          className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight hover:text-blue-700 transition"
        >
          HSinside
        </Link>

        {/* 우측 메뉴 영역 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* OOO님 표기 */}
              <span className="text-gray-700 font-bold text-xs truncate max-w-[120px] sm:max-w-[180px]">
                <span className="text-blue-600 font-extrabold">{displayName}</span>님
              </span>

              {/* 관리자 전용 배지 */}
              {isAdmin && (
                <span className="hidden sm:inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                  🛡️ 관리자
                </span>
              )}

              {/* 마이페이지 버튼 (일반/어드민 공통 노출) */}
              <Link
                href="/mypage"
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition"
              >
                마이페이지
              </Link>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
