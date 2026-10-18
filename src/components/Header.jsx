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

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm py-5 px-4 sm:px-8 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* 파란색 & 크게 변경된 로고 */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl sm:text-4xl">🏛️</span>
          <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight group-hover:text-blue-700 transition">
            HSinside
          </span>
        </Link>

        {/* 우측 메뉴 영역 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* 관리자일 경우 전용 배지 노출 */}
              {isAdmin && (
                <span className="hidden sm:inline-block px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200">
                  🛡️ 관리자
                </span>
              )}

              {/* 👤 마이페이지 버튼 (일반 사용자 & 어드민 모두 표시) */}
              <Link
                href="/mypage"
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                👤 마이페이지
              </Link>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
