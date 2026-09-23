'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_ACCOUNTS = {
  admin_lim: 'c8fa216c5914be797968ff2506b3a0e1b933824f92d4090c2921a48c347f3ec8',
  admin_kim: 'c8fa216c5914be797968ff2506b3a0e1b933824f92d4090c2921a48c347f3ec8'
};

async function hashPassword(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}

export default function AdminPage() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // 갤러리 신청 관리 상태
  const [requests, setRequests] = useState([]);
  const [rejectComments, setRejectComments] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const savedAdmin = localStorage.getItem('hsinside_admin_user');
    if (savedAdmin) {
      setCurrentAdmin(savedAdmin);
      setIsLoggedIn(true);
      fetchRequests();
    }
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('gallery_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const inputId = adminId.trim().toLowerCase();
    const inputPw = password.trim();

    if (!ADMIN_ACCOUNTS[inputId]) {
      setLoginError('존재하지 않는 어드민 계정입니다.');
      return;
    }

    setLoading(true);

    try {
      const inputHash = await hashPassword(inputPw);
      setLoading(false);

      if (inputHash !== ADMIN_ACCOUNTS[inputId]) {
        setLoginError('어드민 비밀번호가 일치하지 않습니다.');
        return;
      }

      const adminDisplayName = inputId === 'admin_lim' ? 'admin_LIM' : 'admin_KIM';
      localStorage.setItem('hsinside_admin_user', adminDisplayName);
      setCurrentAdmin(adminDisplayName);
      setIsLoggedIn(true);
      setAdminId('');
      setPassword('');
      fetchRequests();
    } catch (err) {
      setLoading(false);
      setLoginError('인증 처리 중 오류가 발생했습니다.');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('hsinside_admin_user');
    setIsLoggedIn(false);
    setCurrentAdmin('');
  };

  // 갤러리 신청 승인
  const handleApprove = async (reqItem) => {
    setActionLoading((prev) => ({ ...prev, [reqItem.id]: true }));

    // 1. galleries 테이블에 새 갤러리 생성
    const { error: createError } = await supabase.from('galleries').insert([
      {
        name: reqItem.gallery_name,
        description: reqItem.reason
      }
    ]);

    if (createError) {
      alert(`갤러리 생성 실패: ${createError.message}`);
      setActionLoading((prev) => ({ ...prev, [reqItem.id]: false }));
      return;
    }

    // 2. 신청 상태를 approved로 변경
    await supabase
      .from('gallery_requests')
      .update({ status: 'approved' })
      .eq('id', reqItem.id);

    setActionLoading((prev) => ({ ...prev, [reqItem.id]: false }));
    fetchRequests();
  };

  // 갤러리 신청 거절 (코멘트 포함)
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <span className="text-4xl">🔐</span>
            <h2 className="mt-3 text-center text-2xl font-extrabold text-white">
              hsinside 어드민 관리자 로그인
            </h2>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
            <form className="space-y-5" onSubmit={handleAdminLogin}>
              {loginError && (
                <div className="bg-red-900/50 border-l-4 border-red-500 p-3 rounded text-xs text-red-200">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">어드민 아이디</label>
                <input
                  type="text"
                  required
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="admin_LIM 또는 admin_KIM"
                  className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">어드민 비밀번호</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition"
              >
                {loading ? '인증 처리 중...' : '어드민 로그인'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white rounded-lg shadow p-5 flex justify-between items-center border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🛡️ hsinside 어드민 대시보드</h1>
            <p className="text-xs text-gray-500 mt-1">
              접속 관리자: <strong className="text-blue-600">{currentAdmin}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border">
              메인으로
            </Link>
            <button onClick={handleAdminLogout} className="px-3 py-1.5 text-xs bg-red-600 text-white font-medium rounded">
              로그아웃
            </button>
          </div>
        </header>

        {/* 갤러리 신청 관리 섹션 */}
        <section className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">📩 갤러리 개설 신청 목록</h2>
            <button onClick={fetchRequests} className="text-xs text-blue-600 hover:underline">
              새로고침
            </button>
          </div>

          {requests.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">접수된 갤러리 개설 신청이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
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
                        {req.status === 'approved' ? '승인됨' : req.status === 'rejected' ? '거절됨' : '대기중'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">신청 사유: {req.reason}</p>
                    <p className="text-[11px] text-gray-400">신청자: {req.applicant_email}</p>
                    {req.reject_reason && (
                      <p className="text-xs text-red-600 font-medium">거절 사유: {req.reject_reason}</p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <input
                        type="text"
                        placeholder="거절 사유 코멘트"
                        value={rejectComments[req.id] || ''}
                        onChange={(e) =>
                          setRejectComments({ ...rejectComments, [req.id]: e.target.value })
                        }
                        className="px-2.5 py-1.5 border rounded text-xs w-full sm:w-48 focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading[req.id]}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition font-medium"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading[req.id]}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition font-medium"
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
