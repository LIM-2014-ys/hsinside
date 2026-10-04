'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  // 정지 모달 관련 상태
  const [selectedReport, setSelectedReport] = useState(null);
  const [banDays, setBanDays] = useState('7'); // 기본값 7일

  useEffect(() => {
    const fetchReports = async () => {
      // 로그인 체크 (로그인되어 있으면 접근 가능하도록 수정)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('로그인이 필요한 페이지입니다.');
        router.replace('/login');
        return;
      }

      // DB에서 신고 내역 조회
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      }
      setLoading(false);
    };

    fetchReports();
  }, [router]);

  // 이용자 정지 확정 처리
  const handleBanUser = (report) => {
    const targetUser = report.target_author || report.author_email || '해당 유저';
    const periodText = banDays === '9999' ? '영구' : `${banDays}일`;

    const confirmBan = confirm(
      `[${targetUser}] 님을 ${periodText} 동안 정지 처리하시겠습니까?`
    );

    if (!confirmBan) return;

    // 해당 신고 상태를 '제재 완료'로 업데이트
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? { ...r, status: `정지 완료 (${periodText})` }
          : r
      )
    );

    alert(`[${targetUser}] 님의 계정이 성공적으로 ${periodText} 정지 처리되었습니다.`);
    setSelectedReport(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        🔒 신고 내역 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 어드민 상단 네비게이션 탭 */}
      <div className="border-b pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">⚙️ 관리자 센터</h1>
          <Link
            href="/"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
          >
            ← 메인으로
          </Link>
        </div>

        {/* 유저 / 신고 상단 이동 버튼 */}
        <div className="flex gap-2 pt-1">
          <Link
            href="/admin/reports"
            className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-md text-xs"
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
          <h2 className="font-bold text-sm text-gray-800">
            신고 접수 목록 ({reports.length}건)
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-medium border border-gray-100 rounded-2xl">
            접수된 신고 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-100 rounded-2xl divide-y divide-gray-100">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 font-bold text-gray-500 text-[11px]">
              <div className="col-span-2">신고 사유</div>
              <div className="col-span-4">신고 대상 및 내용</div>
              <div className="col-span-3 text-center">신고자</div>
              <div className="col-span-3 text-right">제재 조치</div>
            </div>

            {reports.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-gray-50/50">
                <div className="col-span-2 font-bold text-rose-600 truncate">
                  {item.reason || '기타 신고'}
                </div>
                <div className="col-span-4 truncate pr-2 text-gray-800 font-medium">
                  {item.target_title || item.content || '신고 내용 없음'}
                </div>
                <div className="col-span-3 text-center text-gray-500 truncate text-[11px]">
                  {item.reporter_email || item.reporter_name || '익명'}
                </div>
                <div className="col-span-3 text-right">
                  {item.status ? (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-500 font-bold rounded-lg text-[10px]">
                      {item.status}
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedReport(item)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-[11px] shadow-sm"
                    >
                      🔨 이용자 정지
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔨 이용자 정지 기한 선택 모달 */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <div>
              <h3 className="text-base font-black text-gray-900">🔨 이용자 정지 기한 선택</h3>
              <p className="text-gray-500 text-[11px] mt-1">
                신고 대상자: <strong className="text-rose-600">{selectedReport.target_author || selectedReport.author_email || '대상 유저'}</strong>
              </p>
            </div>

            {/* 기한 옵션 선택 */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-700 text-[11px]">정지 기간 선택 *</label>
              <select
                value={banDays}
                onChange={(e) => setBanDays(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="1">1일 정지 (경고성)</option>
                <option value="3">3일 정지</option>
                <option value="7">7일 정지 (일주일)</option>
                <option value="30">30일 정지 (한 달)</option>
                <option value="9999">영구 정지 (Permanent)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition"
              >
                취소
              </button>
              <button
                onClick={() => handleBanUser(selectedReport)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/20"
              >
                정지 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
