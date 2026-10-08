'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 닉네임 변경 관련 상태
  const [newNickname, setNewNickname] = useState('');
  const [isDuplicateChecked, setIsDuplicateChecked] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('로그인이 필요한 페이지입니다.');
        router.replace('/login');
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);
      setNewNickname(currentUser.user_metadata?.display_name || '');
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  // 🔍 마이페이지 닉네임 중복 확인 (data.length > 0)
  const handleCheckDuplicate = async () => {
    const trimmed = newNickname.trim();

    if (!trimmed) {
      alert('변경할 닉네임을 입력해 주세요.');
      return;
    }

    if (trimmed === user?.user_metadata?.display_name) {
      alert('현재 사용 중인 닉네임과 동일합니다.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', trimmed);

      if (!error && data && data.length > 0) {
        alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
        setIsDuplicateChecked(false);
      } else {
        alert('사용 가능한 닉네임입니다.');
        setIsDuplicateChecked(true);
        setVerifiedNickname(trimmed);
      }
    } catch {
      alert('중복 확인 중 오류가 발생했습니다.');
    }
  };

  // ✏️ 닉네임 업데이트 처리
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const trimmed = newNickname.trim();

    if (!trimmed) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    if (trimmed !== user?.user_metadata?.display_name && (!isDuplicateChecked || verifiedNickname !== trimmed)) {
      alert('닉네임 중복 확인을 완료해 주세요.');
      return;
    }

    setUpdating(true);

    try {
      // 1. Supabase Auth 메타데이터 변경 (헤더에 반영됨)
      const { data, error } = await supabase.auth.updateUser({
        data: {
          display_name: trimmed,
        },
      });

      if (error) {
        alert('닉네임 변경 실패: ' + error.message);
      } else {
        // 2. profiles 테이블 동기화 (존재할 경우)
        await supabase.from('profiles').upsert([
          {
            id: user.id,
            display_name: trimmed,
            email: user.email,
          },
        ]);

        alert('닉네임이 정상적으로 변경되었습니다!');
        setUser(data.user);
        setIsDuplicateChecked(false);
      }
    } catch {
      alert('프로필 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        👤 마이페이지 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">👤 마이페이지</h1>
        <Link
          href="/"
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
        >
          ← 메인으로
        </Link>
      </div>

      {/* 회원 정보 카드 */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400 font-medium">이메일 계정</span>
          <span className="font-bold text-gray-800">{user?.email}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400 font-medium">계정 상태</span>
          <span className="font-bold text-emerald-600">
            {user?.user_metadata?.status || '정상'}
          </span>
        </div>
      </div>

      {/* 닉네임 변경 폼 */}
      <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2 border-t">
        <h2 className="font-bold text-sm text-gray-900">✏️ 닉네임 수정</h2>

        <div>
          <label className="block font-bold text-gray-700 mb-1">닉네임 설정 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNickname}
              onChange={(e) => {
                setNewNickname(e.target.value);
                setIsDuplicateChecked(false);
              }}
              placeholder="새로운 닉네임 입력"
              required
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleCheckDuplicate}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs shrink-0 transition"
            >
              중복 확인
            </button>
          </div>
          {isDuplicateChecked && verifiedNickname === newNickname.trim() && (
            <p className="text-emerald-600 font-bold text-[10px] mt-1">✓ 변경 가능한 닉네임입니다.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={updating}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 disabled:bg-gray-200 text-xs"
        >
          {updating ? '변경 내용 저장 중...' : '닉네임 변경 완료'}
        </button>
      </form>
    </div>
  );
}
