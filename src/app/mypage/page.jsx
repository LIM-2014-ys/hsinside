'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 이름 변경 상태
  const [displayName, setDisplayName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState({ text: '', type: '' });

  // 비밀번호 변경 상태
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: '', type: '' });

  // 회원 탈퇴 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setDisplayName(user.user_metadata?.display_name || user.email.split('@')[0]);
    }
    setLoading(false);
  };

  // 1. 이름(닉네임) 변경
  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameMsg({ text: '', type: '' });

    if (!displayName.trim()) {
      setNameMsg({ text: '변경할 이름을 입력해 주세요.', type: 'error' });
      return;
    }

    setNameLoading(true);

    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() }
    });

    setNameLoading(false);

    if (error) {
      setNameMsg({ text: `이름 변경 실패: ${error.message}`, type: 'error' });
    } else {
      setUser(data.user);
      setNameMsg({ text: '이름이 성공적으로 변경되었습니다!', type: 'success' });
    }
  };

  // 2. 비밀번호 변경
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ text: '', type: '' });

    if (!newPassword || newPassword.length < 6) {
      setPwMsg({ text: '비밀번호는 최소 6자리 이상이어야 합니다.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMsg({ text: '비밀번호 확인이 일치하지 않습니다.', type: 'error' });
      return;
    }

    setPwLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setPwLoading(false);

    if (error) {
      setPwMsg({ text: `비밀번호 변경 실패: ${error.message}`, type: 'error' });
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg({ text: '비밀번호가 성공적으로 변경되었습니다!', type: 'success' });
    }
  };

  // 3. 회원 탈퇴 (모달 팝업 및 아이디 확인)
  const handleDeleteAccount = async () => {
    setDeleteError('');

    if (inputEmail.trim() !== user.email) {
      setDeleteError('입력하신 이메일이 현재 로그인된 이메일과 일치하지 않습니다.');
      return;
    }

    setDeleteLoading(true);

    try {
      // DB 유저 데이터 및 Auth 계정 삭제
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        user_email_param: user.email
      });

      if (rpcError) throw rpcError;

      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('탈퇴 에러:', err);
      setDeleteError(`탈퇴 처리 중 오류가 발생했습니다: ${err.message}`);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center text-sm text-gray-500">
        유저 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center text-sm text-gray-500">
        로그인이 필요한 페이지입니다.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-8 space-y-8">
      <h1 className="text-xl font-bold text-gray-900 border-b pb-4 flex items-center gap-2">
        <span>👤</span> 마이페이지 & 계정 설정
      </h1>

      {/* 계정 정보 요약 */}
      <div className="bg-gray-50 p-4 rounded-lg border text-xs text-gray-700 space-y-1.5">
        <p><strong>이메일 (아이디):</strong> <span className="text-blue-600 font-semibold">{user.email}</span></p>
        <p><strong>현재 이름:</strong> {user.user_metadata?.display_name || '미설정'}</p>
        <p><strong>가입일:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      {/* 1. 이름(닉네임) 변경 섹션 */}
      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          ✏️ 이름(닉네임) 변경
        </h2>
        <form onSubmit={handleUpdateName} className="space-y-3">
          <div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="새 이름을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {nameMsg.text && (
            <p className={`text-xs ${nameMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {nameMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={nameLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition disabled:opacity-50"
          >
            {nameLoading ? '저장 중...' : '이름 저장'}
          </button>
        </form>
      </section>

      {/* 2. 비밀번호 변경 섹션 */}
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          🔒 비밀번호 변경
        </h2>
        <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6자리 이상 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 다시 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {pwMsg.text && (
            <p className={`text-xs ${pwMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {pwMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded transition disabled:opacity-50"
          >
            {pwLoading ? '비밀번호 변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </section>

      {/* 3. 회원 탈퇴 섹션 */}
      <section className="border-t pt-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-red-800">⚠️ 회원 탈퇴 및 계정 삭제</h3>
            <p className="text-[11px] text-red-600 mt-0.5">
              탈퇴 시 본인의 모든 정보 및 데이터가 영구 삭제됩니다.
            </p>
          </div>
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setInputEmail('');
              setDeleteError('');
            }}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition"
          >
            회원 탈퇴
          </button>
        </div>
      </section>

      {/* 탈퇴 확인 모달 팝업 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2">
              🚨 정말로 탈퇴하시겠습니까?
            </h3>
            <div className="text-xs text-gray-600 leading-relaxed space-y-2">
              <p>
                탈퇴를 진행하시면 작성하신 <strong>게시글, 댓글, 좋아요 및 계정 정보가 즉시 완전 삭제</strong>되며 복구할 수 없습니다.
              </p>
              <p className="font-semibold text-gray-800">
                본인 확인을 위해 현재 이메일 아이디(<span className="text-blue-600">{user.email}</span>)를 그대로 입력해 주세요:
              </p>
            </div>

            <input
              type="text"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder={user.email}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-red-500"
            />

            {deleteError && (
              <p className="text-xs text-red-600 font-medium">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || inputEmail.trim() !== user.email}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-40 transition"
              >
                {deleteLoading ? '삭제 진행 중...' : '확인 및 영구 탈퇴'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
