'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeForeignTransfer, setAgreeForeignTransfer] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!agreeTerms || !agreeForeignTransfer) {
      return alert('필수 약관 및 개인정보 국외이전 동의에 동의해 주세요.');
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          agree_foreign_transfer: true,
          agreed_at: new Date().toISOString(),
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(`회원가입 실패: ${error.message}`);
    } else {
      alert('회원가입이 완료되었습니다! 로그인해 주세요.');
      router.push('/login');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white border rounded-xl shadow-sm space-y-5">
      <h1 className="text-xl font-bold text-gray-900 border-b pb-3">👤 회원가입</h1>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            placeholder="example@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            placeholder="6자 이상 입력"
            minLength={6}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">닉네임</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            placeholder="사용할 닉네임 입력"
            required
          />
        </div>

        {/* 약관 및 동의 영역 */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-700 cursor-pointer">
              <span className="font-bold text-blue-600">[필수]</span> 이용약관 및 개인정보 처리방침 동의
            </label>
          </div>

          <div className="p-3 bg-gray-50 border rounded-lg text-xs text-gray-600 space-y-1.5">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="foreignTransfer"
                checked={agreeForeignTransfer}
                onChange={(e) => setAgreeForeignTransfer(e.target.checked)}
                className="mt-0.5 cursor-pointer"
              />
              <label htmlFor="foreignTransfer" className="font-bold text-gray-900 cursor-pointer">
                <span className="text-blue-600">[필수]</span> 개인정보 국외이전 동의
              </label>
            </div>
            <div className="text-[11px] text-gray-500 pl-5 leading-relaxed space-y-1">
              <p>• <strong>이전받는 자:</strong> Supabase Inc. (AWS 클라우드 인프라)</p>
              <p>• <strong>이전 항목:</strong> 이메일, 닉네임, 서비스 이용 기록, 접속 위치정보</p>
              <p>• <strong>이전 국가:</strong> 미국 (AWS US Region)</p>
              <p>• <strong>이전 목적:</strong> 회원 관리, 데이터베이스 저장 및 서비스 제공</p>
              <p>• <strong>보유 기간:</strong> 회원 탈퇴 시 즉시 파기</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition"
        >
          {loading ? '가입 진행 중...' : '회원가입 완료'}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 pt-2 border-t">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 font-bold hover:underline">
          로그인하기
        </Link>
      </div>
    </div>
  );
}
