'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 닉네임 관련 상태
  const [originalNickname, setOriginalNickname] = useState('');
  const [nickname, setNickname] = useState('');
  const [isNicknameChecked, setIsNicknameChecked] = useState(true); // 기존 닉네임일 때는 기본 true
  const [nicknameMessage, setNicknameMessage] = useState('');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      setUser(user);
      const currentNickname = user.user_metadata?.display_name || user.email.split('@')[0];
      setOriginalNickname(currentNickname);
      setNickname(currentNickname);
      setLoading(false);
    }

    loadUserData();
  }, [router]);

  // 닉네임 입력 변경 감지
  const handleNicknameChange = (e) => {
    const val = e.target.value;
    setNickname(val);

    // 원래 내 닉네임으로 다시 돌아온 경우
    if (val.trim() === originalNickname) {
      setIsNicknameChecked(true);
      setNicknameMessage('');
    } else {
      setIsNicknameChecked(false);
      setNicknameMessage('');
    }
  };

  // 닉네임 중복 확인
  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    if (trimmed.length < 2) {
      alert('닉네임은 최소 2자 이상이어야 합니다.');
      return;
    }

    if (trimmed === originalNickname) {
      setIsNicknameChecked(true);
      setNicknameMessage('현재 사용 중인 본인의 닉네임입니다.');
      return;
    }

    setIsCheckingNickname(true);

    try {
      // Supabase RPC 함수 호출 (1단계에서 만든 check_nickname_exists 사용)
      const { data: isExists, error } = await supabase.rpc('check_nickname_exists', {
        nickname_input: trimmed,
      });

      if (error) throw error;

      if (isExists) {
        setIsNicknameChecked(false);
        setNicknameMessage('❌ 이미 사용 중인 닉네임입니다.');
      } else {
        setIsNicknameChecked(true);
        setNicknameMessage('✅ 사용 가능한 닉네임입니다.');
      }
    } catch (err) {
      alert(`중복 확인 실패: ${err.message}`);
    } finally {
      setIsCheckingNickname(false);
    }
  };

  // 프로필 변경 저장
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!isNicknameChecked) {
      return alert('닉네임 중복 확인을 진행해 주세요.');
    }

    setUpdating(true);

    try {
      const trimmedNickname = nickname.trim();

      const { data, error } = await supabase.auth.updateUser({
        data: {
          display_name: trimmedNickname,
        },
      });

      if (error) throw error;

      // 변경 성공 시 원래 닉네임 상태 업데이트
      setOriginalNickname(trimmedNickname);
      setUser(data.user);
      setNicknameMessage('');
      alert('닉네임이 성공적으로 변경되었습니다.');
    } catch (err) {
      alert(`프로필 수정 실패: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 text-center text-xs text-gray-500">
        프로필 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <h1 className="text-lg font-bold text-gray-900 border-b pb-3">⚙️ 마이페이지 / 프로필 수정</h1>

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        {/* 이메일 (수정 불가) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">이메일 계정</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 border rounded-md text-xs bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* 닉네임 변경 입력 + 중복 확인 */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={handleNicknameChange}
              className="flex-1 px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="변경할 닉네임 입력"
              required
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              disabled={isCheckingNickname || nickname.trim() === originalNickname || !nickname.trim()}
              className="px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded-md hover:bg-gray-900 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isCheckingNickname ? '확인 중...' : '중복확인'}
            </button>
          </div>
          {nicknameMessage && (
            <p className={`text-[11px] mt-1 font-medium ${isNicknameChecked ? 'text-green-600' : 'text-red-500'}`}>
              {nicknameMessage}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={updating || !isNicknameChecked || (nickname.trim() === originalNickname && isNicknameChecked)}
          className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {updating ? '변경사항 저장 중...' : '닉네임 변경 저장'}
        </button>
      </form>
    </div>
  );
}
