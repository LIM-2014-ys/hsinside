'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 닉네임 변경 상태
  const [newNickname, setNewNickname] = useState('');
  const [nicknameMsg, setNicknameMsg] = useState({ text: '', type: '' });
  const [isDuplicateChecked, setIsDuplicateChecked] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState('');
  const [updatingNickname, setUpdatingNickname] = useState(false);

  // 비밀번호 변경 상태
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
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

  // 본인 ID 제외 중복 검사 (.neq)
  const handleCheckDuplicate = async () => {
    const trimmed = newNickname.trim();

    if (!trimmed) {
      setNicknameMsg({ text: '변경할 닉네임을 입력해 주세요.', type: 'error' });
      setIsDuplicateChecked(false);
      return;
    }

    const currentName = user?.user_metadata?.display_name || '';
    if (trimmed === currentName) {
      setNicknameMsg({ text: '현재 사용 중인 본인의 닉네임입니다.', type: 'info' });
      setIsDuplicateChecked(true);
      setVerifiedNickname(trimmed);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', trimmed)
        .neq('id', user.id);

      if (error) {
        setNicknameMsg({ text: '사용 가능한 닉네임입니다.', type: 'success' });
        setIsDuplicateChecked(true);
        setVerifiedNickname(trimmed);
        return;
      }

      if (data && data.length > 0) {
        setNicknameMsg({ text: '이미 다른 사용자가 사용 중인 닉네임입니다.', type: 'error' });
        setIsDuplicateChecked(false);
      } else {
        setNicknameMsg({ text: '사용 가능한 닉네임입니다.', type: 'success' });
        setIsDuplicateChecked(true);
        setVerifiedNickname(trimmed);
      }
    } catch {
      setNicknameMsg({ text: '중복 확인 중 오류가 발생했습니다.', type: 'error' });
      setIsDuplicateChecked(false);
    }
  };

  // 닉네임 수정 제출
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const trimmed = newNickname.trim();
    const currentName = user?.user_metadata?.display_name || '';

    if (!trimmed) {
      setNicknameMsg({ text: '닉네임을 입력해 주세요.', type: 'error' });
      return;
    }

    if (trimmed !== currentName && (!isDuplicateChecked || verifiedNickname !== trimmed)) {
      setNicknameMsg({ text: '닉네임 중복 확인을 진행해 주세요.', type: 'error' });
      return;
    }

    setUpdatingNickname(true);
    setNicknameMsg({ text: '', type: '' });

    try {
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });

      if (authError) {
        setNicknameMsg({ text: '닉네임 변경 실패: ' + authError.message, type: 'error' });
        return;
      }

      await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', user.id);

      await supabase.auth.refreshSession();

      setUser(authData.user);
      setIsDuplicateChecked(false);
      setNicknameMsg({ text: '✓ 닉네임이 성공적으로 변경되었습니다.', type: 'success' });
    } catch {
      setNicknameMsg({ text: '프로필 변경 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setUpdatingNickname(false);
    }
  };

  // 비밀번호 수정 제출
  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setPasswordMsg({ text: '새 비밀번호를 입력해 주세요.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ text: '비밀번호는 최소 6자 이상이어야 합니다.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: '비밀번호 재확인이 일치하지 않습니다.', type: 'error' });
      return;
    }

    setUpdatingPassword(true);
    setPasswordMsg({ text: '', type: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMsg({ text: '비밀번호 변경 실패: ' + error.message, type: 'error' });
      } else {
        setPasswordMsg({ text: '✓ 비밀번호가 성공적으로 변경되었습니다.', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMsg({ text: '비밀번호 변경 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setUpdatingPassword(false);
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
    <div className="max-w-xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-8 text-xs font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">👤 마이페이지</h1>
        <Link
          href="/"
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
        >
          ← 메인으로
        </Link>
      </div>

      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400 font-medium">이메일 계정</span>
          <span className="font-bold text-gray-800">{user?.email}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400 font-medium">현재 닉네임</span>
          <span className="font-bold text-emerald-700">
            {user?.user_metadata?.display_name || '미설정'}
          </span>
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
          <label className="block font-bold text-gray-700 mb-1">새 닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNickname}
              onChange={(e) => {
                setNewNickname(e.target.value);
                setIsDuplicateChecked(false);
                setNicknameMsg({ text: '', type: '' });
              }}
              placeholder="새로운 닉네임 입력"
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

          {nicknameMsg.text && (
            <p
              className={`mt-2 font-bold text-[11px] ${
                nicknameMsg.type === 'success'
                  ? 'text-emerald-600'
                  : nicknameMsg.type === 'info'
                  ? 'text-blue-600'
                  : 'text-rose-600'
              }`}
            >
              {nicknameMsg.text}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={updatingNickname}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 disabled:bg-gray-200 text-xs"
        >
          {updatingNickname ? '변경 내용 저장 중...' : '닉네임 변경 완료'}
        </button>
      </form>

      {/* 비밀번호 변경 폼 */}
      <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t">
        <h2 className="font-bold text-sm text-gray-900">🔒 비밀번호 변경</h2>

        <div>
          <label className="block font-bold text-gray-700 mb-1">새 비밀번호</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordMsg({ text: '', type: '' });
            }}
            placeholder="최소 6자 이상 입력"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">새 비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordMsg({ text: '', type: '' });
            }}
            placeholder="비밀번호 다시 입력"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />

          {passwordMsg.text && (
            <p
              className={`mt-2 font-bold text-[11px] ${
                passwordMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {passwordMsg.text}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={updatingPassword}
          className="w-full py-3.5 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-2xl transition shadow-md disabled:bg-gray-200 text-xs"
        >
          {updatingPassword ? '비밀번호 변경 중...' : '비밀번호 변경 저장'}
        </button>
      </form>
    </div>
  );
}
