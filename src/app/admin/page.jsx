'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import AdminBadge from '@/components/AdminBadge';

export default function AdminDashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-20 text-center text-gray-400 font-bold text-xs">
        🛡️ 관리자 권한 확인 중...
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-rose-100 rounded-3xl shadow-xl text-center space-y-4 font-sans text-xs">
        <div className="text-4xl">🚫</div>
        <h2 className="text-lg font-black text-gray-900">관리자 전용 페이지</h2>
        <p className="text-gray-500 text-[11px]">
          지정된 관리자 계정만 접근 권한이 있습니다.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs"
        >
          메인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-10 px-4 font-sans text-xs space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-black text-gray-900">🛡️ hsinside 통합 관리자 대시보드</h1>
          <AdminBadge email={user.email} />
        </div>
        <p className="text-gray-400 text-[11px] mt-1">
          현재 로그인: <span className="font-bold text-gray-700">{user.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/gallery-requests"
          className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition space-y-2 group"
        >
          <div className="text-2xl">📋</div>
          <h3 className="font-bold text-sm text-gray-900 group-hover:text-emerald-600 transition">
            갤러리 개설 신청 관리 →
          </h3>
          <p className="text-gray-400 text-[11px]">
            사용자들이 신청한 신규 갤러리 요청을 검토 및 승인합니다.
          </p>
        </Link>

        <Link
          href="/admin/reports"
          className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition space-y-2 group"
        >
          <div className="text-2xl">🚨</div>
          <h3 className="font-bold text-sm text-gray-900 group-hover:text-rose-600 transition">
            신고 및 모니터링 관리 →
          </h3>
          <p className="text-gray-400 text-[11px]">
            접수된 신고 게시글/댓글을 확인하고 삭제 또는 조치를 취합니다.
          </p>
        </Link>
      </div>
    </div>
  );
}
