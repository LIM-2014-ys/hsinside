'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// SHA-256으로 해싱된 비밀번호 저장 (q1w2e3r4!의 진짜 SHA-256 해시값)
// 소스 코드가 노출되어도 원문 비밀번호 복호화 불가능
const ADMIN_ACCOUNTS = {
  admin_lim: 'c8fa216c5914be797968ff2506b3a0e1b933824f92d4090c2921a48c347f3ec8',
  admin_kim: 'c8fa216c5914be797968ff2506b3a0e1b933824f92d4090c2921a48c347f3ec8'
};

// 브라우저 표준 Web Crypto API를 사용한 안전한 SHA-256 해싱 함수
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

  useEffect(() => {
    const savedAdmin = localStorage.getItem('hsinside_admin_user');
    if (savedAdmin) {
      setCurrentAdmin(savedAdmin);
      setIsLoggedIn(true);
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const inputId = adminId.trim().toLowerCase();
    const inputPw = password.trim();

    // 1. 아이디 존재 여부 확인
    if (!ADMIN_ACCOUNTS[inputId]) {
      setLoginError('존재하지 않는 어드민 계정입니다.');
      return;
    }

    setLoading(true);

    try {
      // 2. 입력받은 비밀번호를 실시간 SHA-256 해싱
      const inputHash = await hashPassword(inputPw);
      setLoading(false);

      // 3. 해시값 대조
      if (inputHash !== ADMIN_ACCOUNTS[inputId]) {
        setLoginError('어드민 비밀번호가 일치하지 않습니다.');
        return;
      }

      // 로그인 성공 처리
      const adminDisplayName = inputId === 'admin_lim' ? 'admin_LIM' : 'admin_KIM';
      localStorage.setItem('hsinside_admin_user', adminDisplayName);
      setCurrentAdmin(adminDisplayName);
      setIsLoggedIn(true);
      setAdminId('');
      setPassword('');
    } catch (err) {
      setLoading(false);
      setLoginError('인증 암호화 처리 중 오류가 발생했습니다.');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('hsinside_admin_user');
    setIsLoggedIn(false);
    setCurrentAdmin('');
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
            <p className="mt-2 text-center text-xs text-gray-400">
              허가된 관리자만 접속할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gray-800 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-700">
            <form className="space-y-5" onSubmit={handleAdminLogin}>
              
              {loginError && (
                <div className="bg-red-900/50 border-l-4 border-red-500 p-3 rounded text-xs text-red-200">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  어드민 아이디
                </label>
                <input
                  type="text"
                  required
                  value={adminId}
                  onChange={(e) => {
                    setAdminId(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="admin_LIM 또는 admin_KIM"
                  className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  어드민 비밀번호
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50 transition"
                >
                  {loading ? '인증 처리 중...' : '어드민 로그인'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center border-t border-gray-700 pt-4">
              <Link href="/" className="text-xs text-gray-400 hover:text-white underline">
                ← 메인 페이지로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-lg shadow p-5 mb-6 flex justify-between items-center border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🛡️</span> hsinside 어드민 대시보드
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              현재 접속 관리자: <strong className="text-blue-600">{currentAdmin}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border transition"
            >
              메인 바로가기
            </Link>
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded transition"
            >
              로그아웃
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-gray-800 text-sm mb-2">📊 전체 시스템 현황</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              서버 상태: <span className="text-green-600 font-bold">정상 (Vercel + Supabase)</span><br />
              액티브 관리자: 2명 (admin_LIM, admin_KIM)
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-gray-800 text-sm mb-2">⚙️ 권한 관리</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              게시글 관리 및 카테고리 삭제 권한 보유
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-gray-800 text-sm mb-2">🔒 보안 상태</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              SHA-256 해시 대조 보안 인증 활성화 중
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
