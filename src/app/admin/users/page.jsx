'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('로그인이 필요한 페이지입니다.');
        router.replace('/login');
        return;
      }

      // 게시글 데이터를 기반으로 회원 목록 추출
      const { data, error } = await supabase
        .from('posts')
        .select('author_name, author_email, user_id, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
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

    fetchUsers();
  }, [router]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = (targetEmail) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.email === targetEmail) {
          const nextStatus = u.status === '정상' ? '이용정지' : '정상';
          alert(`[${u.name}] 님의 상태가 [${nextStatus}] 상태로 변경되었습니다.`);
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        🔒 유저 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 상단 네비게이션 탭 */}
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

        {/* 신고 / 유저 이동 버튼 */}
        <div className="flex gap-2 pt-1">
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

      {/* 유저 리스트 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-sm text-gray-800">
            등록 회원 목록 ({filteredUsers.length}명)
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
            조회된 회원 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-100 rounded-2xl divide-y divide-gray-100">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 font-bold text-gray-500 text-[11px]">
              <div className="col-span-3">닉네임</div>
              <div className="col-span-4">이메일</div>
              <div className="col-span-2 text-center">최근 활동일</div>
              <div className="col-span-3 text-right">계정 상태</div>
            </div>

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
