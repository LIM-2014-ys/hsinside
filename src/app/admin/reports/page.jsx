'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 신고 내역 불러오기
  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // 신고 대상 삭제 처리
  const handleDeleteTarget = async (report) => {
    if (!confirm(`해당 ${report.target_type === 'post' ? '게시글' : '댓글'}을 정말 삭제하시겠습니까?`)) return;

    const table = report.target_type === 'post' ? 'posts' : 'comments';
    
    // 1. 해당 게시글 또는 댓글 삭제
    const { error: deleteError } = await supabase.from(table).delete().eq('id', report.target_id);

    if (deleteError) {
      alert(`삭제 실패: ${deleteError.message}`);
      return;
    }

    // 2. 신고 상태를 'resolved'(처리완료)로 업데이트
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);

    alert('삭제 처리 및 신고 완결이 완료되었습니다.');
    fetchReports();
  };

  // 신고건 무시/완료 처리
  const handleResolveReport = async (reportId) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    fetchReports();
  };

  if (loading) return <div className="max-w-4xl mx-auto my-10 p-4 text-center text-xs text-gray-500">신고 목록 조회 중...</div>;

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h1 className="text-base font-bold text-gray-900">🚨 신고 접수 관리 대시보드</h1>
        <button onClick={fetchReports} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded">
          🔄 새로고침
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600">
              <th className="p-2.5">타입</th>
              <th className="p-2.5">대상 ID</th>
              <th className="p-2.5">신고 사유</th>
              <th className="p-2.5">신고자</th>
              <th className="p-2.5">신시 일자</th>
              <th className="p-2.5">상태</th>
              <th className="p-2.5 text-right">관리 조치</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  접수된 신고 내역이 없습니다.
                </td>
              </tr>
            ) : (
              reports.map((item) => (
                <tr key={item.id} className={item.status === 'resolved' ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${item.target_type === 'post' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.target_type === 'post' ? '게시글' : '댓글'}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">{item.target_id}</td>
                  <td className="p-2.5 max-w-xs truncate">{item.reason}</td>
                  <td className="p-2.5 text-gray-500">{item.reporter_email}</td>
                  <td className="p-2.5 text-gray-400 text-[11px]">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="p-2.5">
                    {item.status === 'pending' ? (
                      <span className="text-red-600 font-bold">대기중</span>
                    ) : (
                      <span className="text-gray-400">처리완료</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right space-x-2">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDeleteTarget(item)}
                          className="px-2.5 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
                        >
                          삭제 조치
                        </button>
                        <button
                          onClick={() => handleResolveReport(item.id)}
                          className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                        >
                          보류/종결
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
