'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// 어드민 접근 허용 이메일
const ADMIN_EMAIL = 'treetowood@goedu.kr';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 갤러리 신청 관리 상태
  const [requests, setRequests] = useState([]);
  const [rejectComments, setRejectComments] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    setCheckingAuth(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 어드민 계정으로 로그인되어 있을 때만 신청 목록 불러오기
    if (user && user.email === ADMIN_EMAIL) {
      fetchRequests();
    }
    setCheckingAuth(false);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('gallery_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
  };

  // 갤러리 신청 승인 처리 (승인 시 galleries 테이블에 신규 생성)
  const handleApprove = async (reqItem) => {
    setActionLoading((prev) => ({ ...prev, [reqItem.id]: true }));

    // 1. galleries 테이블에 새 갤러리 추가
    const { error: createError } = await supabase.from('galleries').insert([
      {
        name: reqItem.gallery_name,
        description: reqItem.reason
      }
    ]);

    if (createError) {
      alert(`갤러리 개설 처리 실패: ${createError.message}`);
      setActionLoading((prev) => ({ ...prev, [reqItem.id]: false }));
      return;
    }

    // 2. gallery_requests 상태를 approved로 변경
    await supabase
      .from('gallery_requests')
      .update({ status: 'approved' })
      .eq('id', reqItem.id);

    setActionLoading((prev) => ({ ...prev, [reqItem.id]: false }));
    fetchRequests();
  };

  // 갤러리 신청 거절 처리 (거절 사유 포함)
  const handleReject = async (reqId) => {
    const comment = rejectComments[reqId]?.trim() || '사유 미기재';

    setActionLoading((prev) => ({ ...prev, [reqId]: true }));

    const { error } = await supabase
      .from('gallery_requests')
      .update({
        status: 'rejected',
        reject_reason: comment
      })
      .eq('id', reqId);

    setActionLoading((prev) => ({ ...prev, [reqId]: false }));

    if (error) {
      alert(`거절 처리 실패: ${error.message}`);
    } else {
      fetchRequests();
    }
  };

  // 1. 로딩 중일 때
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-sm">
        관리자 권한 확인 중...
      </div>
    );
  }

  // 2. 어드민 계정이 아닐 때 (로그인 안 됨 또는 다른 이메일)
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gray-800 py-8 px-6 shadow-2xl rounded-lg border border-gray-700 text-center space-y-4">
            <span className="text-5xl">🚫</span>
            <h2 className="text-xl font-bold text-white">어드민 접근 권한 없음</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              어드민 대시보드는 <strong className="text-blue-400">{ADMIN_EMAIL}</strong> 계정으로 로그인한 경우에만 비밀번호 없이 자동 접속됩니다.
            </p>
            {user ? (
              <p className="text-xs text-red-400">
                현재 접속된 계정: {user.email} (권한 없음)
              </p>
            ) : (
              <p className="text-xs text-yellow-400">
                현재 로그인되어 있지 않습니다.
              </p>
            )}
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
              >
                {ADMIN_EMAIL} 계정으로 로그인
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded transition"
              >
                메인으로
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. 어드민 인증 성공 시 대시보드 화면
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white rounded-lg shadow p-5 flex justify-between items-center border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🛡️</span> hsinside 어드민 대시보드
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              관리자 계정: <strong className="text-blue-600">{user.email}</strong> (자동 인증됨)
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition">
              메인 바로가기
            </Link>
          </div>
        </header>

        {/* 갤러리 개설 신청 관리 전용 구역 */}
        <section className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📩 갤러리 개설 신청 목록</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                사용자가 신청한 갤러리를 검토 후 승인/거절 조치할 수 있습니다.
              </p>
            </div>
            <button
              onClick={fetchRequests}
              className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition font-medium"
            >
              새로고침
            </button>
          </div>

          {requests.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">접수된 갤러리 개설 신청이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 border rounded-lg bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{req.gallery_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          req.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : req.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {req.status === 'approved' ? '승인 완료' : req.status === 'rejected' ? '거절 처리' : '검토 대기중'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <strong>신청 사유:</strong> {req.reason}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      신청자 이메일: {req.applicant_email}
                    </p>
                    {req.reject_reason && (
                      <p className="text-xs text-red-600 font-medium">
                        <strong>거절 사유:</strong> {req.reject_reason}
                      </p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <input
                        type="text"
                        placeholder="거절 코멘트 작성"
                        value={rejectComments[req.id] || ''}
                        onChange={(e) =>
                          setRejectComments({ ...rejectComments, [req.id]: e.target.value })
                        }
                        className="px-2.5 py-1.5 border border-gray-300 rounded text-xs w-full sm:w-48 focus:outline-none focus:border-red-500 bg-white"
                      />
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading[req.id]}
                        className="px-3.5 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition font-bold disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading[req.id]}
                        className="px-3.5 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition font-bold disabled:opacity-50"
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
