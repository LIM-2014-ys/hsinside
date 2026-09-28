'use client';

import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="max-w-md mx-auto my-16 p-8 bg-white border rounded-xl shadow-sm text-center space-y-4">
      <div className="text-4xl">🔒</div>
      <h1 className="text-lg font-bold text-gray-900">신규 회원가입 일시 중단</h1>
      <p className="text-xs text-gray-600 leading-relaxed">
        현재 서비스 점검 및 기능 개편으로 인해 신규 회원가입을 일시적으로 제한하고 있습니다.
        <br />
        이용에 불편을 드려 죄송합니다.
      </p>
      <div className="pt-4 border-t">
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition"
        >
          메인 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

/* ==============================================================================
   [기존 회원가입 원본 코드] 
   ==============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function OriginalSignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState('');
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeForeignTransfer, setAgreeForeignTransfer] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleCheckNickname = async () => {
    if (!nickname.trim() || nickname.length < 2) {
      alert('닉네임은 최소 2자 이상 입력해 주세요.');
      return;
    }

    try {
      const { data: isExists, error } = await supabase.rpc('check_nickname_exists', {
        nickname_input: nickname.trim(),
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
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!agreeTerms || !agreePrivacy || !agreeForeignTransfer) {
      return alert('모든 필수 약관에 동의해 주세요.');
    }

    if (!isNicknameChecked) {
      return alert('닉네임 중복 확인을 완료해 주세요.');
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: nickname.trim(),
          },
        },
      });

      if (error) throw error;

      alert('회원가입이 완료되었습니다! 로그인해 주세요.');
      router.push('/login');
    } catch (err) {
      alert(`회원가입 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <h1 className="text-lg font-bold text-gray-900 border-b pb-3">📝 회원가입</h1>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setIsNicknameChecked(false);
                setNicknameMessage('');
              }}
              className="flex-1 px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              className="px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded-md hover:bg-gray-900 transition"
            >
              중복확인
            </button>
          </div>
          {nicknameMessage && (
            <p className={`text-[11px] mt-1 ${isNicknameChecked ? 'text-green-600' : 'text-red-500'}`}>
              {nicknameMessage}
            </p>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t text-xs">
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>[필수] 이용약관 동의</span>
          </label>
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
            />
            <span>[필수] 개인정보 수집 및 이용 동의</span>
          </label>
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeForeignTransfer}
              onChange={(e) => setAgreeForeignTransfer(e.target.checked)}
            />
            <span>[필수] 국외 데이터 이전 동의 (Supabase 서버)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition disabled:bg-gray-300"
        >
          {loading ? '가입 처리 중...' : '회원가입 완료'}
        </button>
      </form>
    </div>
  );
}
============================================================================== */
