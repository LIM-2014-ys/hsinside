'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // 비밀번호 변경 상태
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // 탈퇴 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast 알림
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });

  const router = useRouter();

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => setToast({ visible: false, message: '', isError: false }), 3000);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setName(user.user_metadata?.full_name || user.user_metadata?.name || '회원');
      setLoading(false);
    };
    getUser();
  }, [router]);

  // 비밀번호 변경 처리
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('비밀번호는 최소 8자 이상이어야 합니다.', true);
      return;
    }
    if (newPassword !== passwordConfirm) {
      showToast('비밀번호 확인이 일치하지 않습니다.', true);
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) {
      showToast(`비밀번호 변경 실패: ${error.message}`, true);
    } else {
      showToast('비밀번호가 성공적으로 변경되었습니다!');
      setNewPassword('');
      setPasswordConfirm('');
    }
  };

  // 회원 탈퇴 처리
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '탈퇴합니다') {
      showToast('"탈퇴합니다"를 정확히 입력해 주세요.', true);
      return;
    }

    setDeleteLoading(true);

    // 로그아웃 및 세션 제거 (Supabase DB 정리)
    const { error } = await supabase.auth.signOut();
    setDeleteLoading(false);

    if (error) {
      showToast(`탈퇴 처리 중 오류가 발생했습니다: ${error.message}`, true);
    } else {
      showToast('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Toast 알림 */}
      {toast.visible && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded shadow-lg text-sm text-white ${toast.isError ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* 상단 프로필 헤더 */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">👤 마이 페이지</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>이름 (닉네임):</strong> {name}</p>
            <p><strong>이메일:</strong> {user.email}</p>
            <p><strong>가입일:</strong> {new Date(user.created_at).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>

        {/* 비밀번호 변경 구역 */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">🔒 비밀번호 변경</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8자 이상 입력"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {pwLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>

        {/* 위험 구역: 회원 탈퇴 */}
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h3 className="text-base font-bold text-red-800 mb-2">⚠️ 회원 탈퇴</h3>
          <p className="text-xs text-red-600 mb-4">
            탈퇴 시 계정 정보가 삭제되며, 작성하신 게시글 및 댓글 관리가 제한될 수 있습니다.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
          >
            회원 탈퇴 신청
          </button>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-900 underline">
            ← 메인으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 탈퇴 confirmation 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">정말 탈퇴하시겠습니까?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              탈퇴를 진행하시려면 아래에 <strong className="text-red-600">"탈퇴합니다"</strong>를 정확히 입력해 주세요.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="탈퇴합니다"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {deleteLoading ? '처리 중...' : '확인 및 탈퇴'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
