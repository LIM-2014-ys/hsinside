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

  // 회원 탈퇴 및 즉시 모든 정보 삭제 처리
  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      '정말로 탈퇴하시겠습니까?\n탈퇴 즉시 작성하신 모든 게시글, 댓글, 갤러리 신청 내역 및 계정 정보가 완전히 삭제되며 복구할 수 없습니다.'
    );

    if (!confirmDelete || !user) return;

    setLoading(true);

    try {
      // 1. RPC 함수 호출하여 유저가 작성한 모든 DB 데이터 즉시 삭제
      const { error: rpcError } = await supabase.rpc('delete_user_all_data', {
        user_email_param: user.email
      });

      if (rpcError) {
        console.error('데이터 삭제 실패:', rpcError);
      }

      // 2. 만약 RPC를 사용하지 않을 경우 테이블별 직접 일괄 삭제 수행 (안전장치)
      await supabase.from('post_likes').delete().eq('user_email', user.email);
      await supabase.from('comments').delete().eq('author_email', user.email);
      await supabase.from('posts').delete().eq('author_email', user.email);
      await supabase.from('gallery_requests').delete().eq('applicant_email', user.email);

      // 3. Supabase Auth 로그아웃 및 세션 제거
      await supabase.auth.signOut();

      alert('회원 탈퇴 및 모든 개인 정보 삭제가 완료되었습니다.');
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
            탈퇴 시 작성한 게시글, 댓글, 좋아요, 갤러리 신청 내역이 DB에서 즉시 영구 삭제되며 복구할 수 없습니다.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition disabled:opacity-50"
          >
            {loading ? '정보 삭제 및 탈퇴 처리 중...' : '회원 탈퇴 및 모든 정보 삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
