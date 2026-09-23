'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  // 회원 탈퇴 및 Auth 계정 포함 완전 삭제
  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      '정말로 탈퇴하시겠습니까?\n탈퇴 시 작성하신 모든 게시글, 댓글, 좋아요, 개설 신청 내역과 회원 계정이 완전히 삭제되어 다시 로그인할 수 없습니다.'
    );

    if (!confirmDelete || !user) return;

    setLoading(true);

    try {
      // 1. Supabase RPC 함수를 호출하여 유저 DB 데이터 + auth.users 계정 영구 삭제
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        user_email_param: user.email
      });

      if (rpcError) {
        throw rpcError;
      }

      // 2. 세션 클리어 및 로그아웃
      await supabase.auth.signOut();

      alert('회원 탈퇴 및 계정 삭제가 완료되었습니다.');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('탈퇴 처리 오류:', error);
      alert(`탈퇴 처리 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        로그인이 필요한 페이지입니다.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow border border-gray-200 mt-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 border-b pb-3">👤 마이페이지</h1>

      <div className="space-y-2 text-sm text-gray-700">
        <p><strong>이메일:</strong> {user.email}</p>
        <p><strong>가입일:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      <div className="pt-6 border-t">
        <div className="bg-red-50 p-4 rounded-md border border-red-100 space-y-3">
          <h3 className="text-sm font-bold text-red-800">⚠️ 회원 탈퇴</h3>
          <p className="text-xs text-red-600 leading-relaxed">
            탈퇴 시 작성한 모든 게시글/댓글/좋아요와 계정이 영구 삭제되며, 동일 계정으로 다시 로그인할 수 없습니다.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition disabled:opacity-50"
          >
            {loading ? '계정 및 모든 정보 삭제 중...' : '회원 탈퇴 및 계정 영구 삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
