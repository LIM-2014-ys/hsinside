'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert('로그인이 필요합니다.');
        router.replace('/login');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        🔒 어드민 접근 권한을 확인하는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-8 text-xs font-sans">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">⚙️ 어드민 대시보드</h1>
          <p className="text-gray-400 mt-1 text-[11px]">
            접속 계정: <strong className="text-gray-700">{user?.email}</strong>
          </p>
        </div>
        <Link
          href="/"
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
        >
          ← 메인으로
        </Link>
      </div>

      {/* 메뉴 카드 이동 버튼 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 신고 내역 관리 버튼 */}
        <Link
          href="/admin/reports"
          className="group p-6 border border-rose-100 bg-rose-50/40 hover:bg-rose-100/60 rounded-2xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
        >
          <div className="space-y-1">
            <span className="text-2xl block">🚨</span>
            <h2 className="font-bold text-sm text-gray-900 group-hover:text-rose-600 transition">
              신고 내역 관리
            </h2>
            <p className="text-gray-500 text-[11px]">
              접수된 유저 및 게시글 신고를 확인하고 즉시 제재 및 정지 처리를 진행합니다.
            </p>
          </div>
          <span className="font-bold text-rose-600 text-[11px] self-end">바로가기 →</span>
        </Link>

        {/* 유저 관리 버튼 */}
        <Link
          href="/admin/users"
          className="group p-6 border border-blue-100 bg-blue-50/40 hover:bg-blue-100/60 rounded-2xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
        >
          <div className="space-y-1">
            <span className="text-2xl block">👥</span>
            <h2 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition">
              유저 관리
            </h2>
            <p className="text-gray-500 text-[11px]">
              등록된 커뮤니티 회원 목록을 조회하고 계정 상태 및 권한을 관리합니다.
            </p>
          </div>
          <span className="font-bold text-blue-600 text-[11px] self-end">바로가기 →</span>
        </Link>
      </div>
    </div>
  );
}
