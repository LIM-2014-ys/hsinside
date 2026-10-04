'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminReportsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      // 1. 현재 로그인 유저 및 어드민 권한 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert('관리자 로그인 후 접근 가능합니다.');
        router.replace('/login');
        return;
      }

      const userRole = session.user.user_metadata?.role;
      const userEmail = session.user.email;

      // role이 'admin'이거나 어드민 이메일 계정인지 검사 (필요 시 이메일 추가 가능)
      const isAdminUser = userRole === 'admin' || userEmail?.endsWith('@admin.com');

      if (!isAdminUser) {
        alert('접근 권한이 없습니다. 관리자 계정으로 로그인해 주세요.');
        router.replace('/');
        return;
      }

      setIsAdmin(true);

      // 2. 신고 내역 조회
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      }
      setLoading(false);
    };

    checkAdminAndFetch();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-10 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        🔒 관리자 권한 및 신고 내역을 확인하는 중입니다...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 관리자 상단 네비게이션 탭 */}
      <div className="border-b pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">⚙️ 관리자 센터</h1>
          <Link
            href="/"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
          >
            메인으로 돌아가기
          </Link>
        </div>

        {/* 탭 구분 */}
        <div className="flex gap-2 pt-2">
          <Link
            href="/admin/reports"
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md text-xs"
          >
            🚨 신고 내역 관리
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
          >
            👥 유저 관리
          </Link>
        </div>
      </div>

      {/* 신고 내역 리스트 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-800">전체 신고 접수 건 ({reports.length}건)</h2>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-medium border border-gray-100 rounded-2xl">
            접수된 신고 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-100 rounded-2xl divide-y divide-gray-100">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 font-bold text-gray-500 text-[11px]">
              <div className="col-span-2">신고 분류</div>
              <div className="col-span-5">신고 내용 / 대상</div>
              <div className="col-span-3 text-center">신고자</div>
              <div className="col-span-2 text-right">신고일시</div>
            </div>

            {reports.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-gray-50/50">
                <div className="col-span-2 font-bold text-rose-600 truncate">
                  {item.reason || '기타 신고'}
                </div>
                <div className="col-span-5 truncate pr-2 text-gray-800 font-medium">
                  {item.target_title || item.content || '상세 내용 없음'}
                </div>
                <div className="col-span-3 text-center text-gray-500 truncate text-[11px]">
                  {item.reporter_email || item.reporter_name || '익명'}
                </div>
                <div className="col-span-2 text-right text-gray-400 text-[10px]">
                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
