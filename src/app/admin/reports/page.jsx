'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import AdminBadge from '@/components/AdminBadge';

export default function AdminReportsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser && isAdminEmail(currentUser.email)) {
        fetchReports();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      }
    } catch (err) {
      console.error('신고 내역 로드 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  // 신고된 원본 게시글/댓글 삭제 및 신고 완료 처리
  const handleDeleteTarget = async (report) => {
    if (!confirm('신고된 원본 콘텐츠를 삭제하시겠습니까?')) return;
    setActionLoading(report.id);

    try {
      // 1. Target 삭제 (target_type: 'post' 또는 'comment')
      const targetTable = report.target_type === 'comment' ? 'comments' : 'posts';
      await supabase.from(targetTable).delete().eq('id', report.target_id);

      // 2. 신고 상태 resolved 변경
      await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', report.id);

      alert('삭제 및 신고 처리가 완료되었습니다.');
      fetchReports();
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 신고 기각 처리
  const handleDismiss = async (reportId) => {
    setActionLoading(reportId);
    try {
      await supabase
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);

      fetchReports();
    } catch {
      alert('기각 처리 실패');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto my-20 text-center text-gray-400 font-bold text-xs">📄 신고 목록 로딩 중...</div>;
  }

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-rose-100 rounded-3xl text-center space-y-4 text-xs font-sans">
        <p className="font-bold text-rose-600">🚫 관리자만 접근할 수 있는 페이지입니다.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-xl">메인으로</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🚨 신고 게시글/댓글 관리</h1>
          <p className="text-gray-400 text-[11px] mt-0.5">사용자들이 신고한 내용을 확인하고 조치를 취합니다.</p>
        </div>
        <Link href="/admin" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl">
          ← 대시보드
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {reports.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-bold">접수된 신고 내역이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((item) => (
              <div key={item.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-gray-50">
                <div className="col-span-2 font-bold text-gray-800">
                  [{item.target_type === 'comment' ? '댓글' : '게시글'}] ID #{item.target_id}
                </div>
                <div className="col-span-4 text-rose-600 font-medium truncate">
                  사유: {item.reason}
                </div>
                <div className="col-span-3 text-gray-400 text-[11px] flex items-center">
                  신고자: {item.reporter_email || '익명'}
                  <AdminBadge email={item.reporter_email} />
                </div>
                <div className="col-span-3 text-right space-x-1.5">
                  {item.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleDeleteTarget(item)}
                        disabled={actionLoading === item.id}
                        className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
                      >
                        원글 삭제
                      </button>
                      <button
                        onClick={() => handleDismiss(item.id)}
                        disabled={actionLoading === item.id}
                        className="px-2.5 py-1.5 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200"
                      >
                        기각
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400 font-bold">
                      {item.status === 'resolved' ? '✓ 조치 완료' : '✕ 기각됨'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
