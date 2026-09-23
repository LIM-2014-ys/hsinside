'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  // 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  
  // 약관 모달 팝업 상태
  const [modalType, setModalType] = useState(null); // 'terms' | 'privacy' | null

  // 알림 팝업 메시지 상태 (alert 대체)
  const [popupMessage, setPopupMessage] = useState({ title: '', desc: '', visible: false, isSuccess: false });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreeTerms || !agreePrivacy) {
      setErrorMessage('이용약관 및 개인정보 처리방침에 모두 동의해 주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setPopupMessage({
        title: '회원가입 완료! 🎉',
        desc: '가입하신 이메일로 인증 메일이 발송되었거나 회원가입이 정상 완료되었습니다. 로그인 페이지로 이동합니다.',
        visible: true,
        isSuccess: true
      });
    }
  };

  const closePopupAndRedirect = () => {
    setPopupMessage({ ...popupMessage, visible: false });
    if (popupMessage.isSuccess) {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          hsinside 회원가입
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 underline">
            로그인하기
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-5" onSubmit={handleSignup}>
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">이메일 주소</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">비밀번호 (6자 이상)</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">비밀번호 확인</label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 약관 동의 구역 */}
            <div className="pt-2 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-700">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2">[필수] 서비스 이용약관 동의</span>
                </label>
                <button
                  type="button"
                  onClick={() => setModalType('terms')}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  전문보기
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-700">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2">[필수] 개인정보 수집 및 이용 동의</span>
                </label>
                <button
                  type="button"
                  onClick={() => setModalType('privacy')}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  전문보기
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition"
              >
                {loading ? '가입 처리 중...' : '회원가입하기'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 약관 전문 모달 팝업 */}
      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalType === 'terms' ? '서비스 이용약관' : '개인정보 수집 및 이용 동의'}
            </h3>
            <div className="flex-1 overflow-y-auto text-sm text-gray-600 bg-gray-50 p-4 rounded border border-gray-200 mb-4 whitespace-pre-wrap">
              {modalType === 'terms' ? (
                `[서비스 이용약관]

제 1 조 (목적)
본 약관은 hsinside 커뮤니티가 제공하는 웹 서비스의 이용조건 및 절차, 이용자와 당사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.

제 2 조 (게시물의 관리)
1. 회원은 타인을 비방하거나 불법적인 내용을 게시해서는 안 됩니다.
2. 부적절한 게시물은 관리자에 의해 사전 통보 없이 삭제될 수 있습니다.`
              ) : (
                `[개인정보 수집 및 이용 동의]

1. 수집하는 개인정보 항목: 이메일 주소, 암호화된 비밀번호
2. 수집 및 이용 목적: 회원 식별, 서비스 제공, 보안 및 부정 이용 방지
3. 보유 및 이용 기간: 회원 탈퇴 시까지 (관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관)`
              )}
            </div>
            <button
              onClick={() => setModalType(null)}
              className="w-full py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 안내 알림 팝업 모달 (alert 대체) */}
      {popupMessage.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl text-center space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{popupMessage.title}</h3>
            <p className="text-sm text-gray-600">{popupMessage.desc}</p>
            <button
              onClick={closePopupAndRedirect}
              className="w-full py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
