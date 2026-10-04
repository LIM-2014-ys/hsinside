'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const checkAdminAndFetchUsers = async () => {
      // 1. 관리자 권한 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('관리자 로그인 후 접근 가능합니다.');
        router.replace('/login');
        return;
      }

      const userRole = session.user.user_metadata?.role;
      const userEmail = session.user.email;
      const isAdminUser = userRole === 'admin' || userEmail?.endsWith('@admin.com');

      if (!isAdminUser) {
        alert('접근 권한이 없습니다. 관리자 계정으로 로그인해 주세요.');
        router.replace('/');
        return;
      }

      setIsAdmin(true);

      // 2. 유저 활동 정보 목록 (posts 데이터를 그룹화하거나 유저 프로필 조회)
      const { data, error } = await supabase
        .from('posts')
        .select('author_name, author_email, user_id, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // 작성자 이메일 기준으로 고유 유저 목록 생성
        const userMap = new Map();
        data.forEach((item) => {
          const key = item.author_email || item.author_name;
          if (key && !userMap.has(key)) {
            userMap.set(key, {
              id: item.user_id || key,
              email: item.author_email || '이메일 없음',
              name: item.author_name || '익명',
              lastActive: item.created_at,
              status: '정상',
            });
          }
        });

        setUsers(Array.from(userMap.values()));
      }
      setLoading(false);
    };

    checkAdminAndFetchUsers();
  }, [router]);

  // 검색 필터링
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // 계정 제재 / 해제 토글
  const handleToggleStatus = (targetEmail) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.email === targetEmail) {
          const nextStatus = u.status === '정상' ? '이용정지' : '정상';
          alert(`${u.name}(${u.email}) 님의 상태가 [${nextStatus}] 상태로 변경되었습니다.`);
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-10 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        🔒 관리자 권한 및 유저 데이터를 조회하는 중입니다...
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
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
          >
            🚨 신고 내역 관리
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md text-xs"
          >
            👥 유저 관리
          </Link>
        </div>
      </div>

      {/* 유저 검색 및 리스트 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-sm text-gray-800">
            등록 유저 목록 ({filteredUsers.length}명)
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="닉네임 또는 이메일 검색"
            className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-medium border border-gray-100 rounded-2xl">
            조회된 유저가 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-100 rounded-2xl divide-y divide-gray-100">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 font-bold text-gray-500 text-[11px]">
              <div className="col-span-3">닉네임</div>
              <div className="col-span-4">이메일</div>
              <div className="col-span-2 text-center">최근 활동</div>
              <div className="col-span-3 text-right">상태 관리</div>
            </div>

            {/* 유저 행 */}
            {filteredUsers.map((user) => (
              <div key={user.email} className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-gray-50/50">
                <div className="col-span-3 font-bold text-gray-900 truncate">
                  {user.name}
                </div>
                <div className="col-span-4 text-gray-600 truncate">
                  {user.email}
                </div>
                <div className="col-span-2 text-center text-gray-400 text-[10px]">
                  {new Date(user.lastActive).toLocaleDateString('ko-KR')}
                </div>
                <div className="col-span-3 text-right flex items-center justify-end gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      user.status === '정상'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {user.status}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(user.email)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition text-[10px]"
                  >
                    {user.status === '정상' ? '정지' : '해제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
