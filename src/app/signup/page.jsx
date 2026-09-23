'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [popupMessage, setPopupMessage] = useState({ title: '', desc: '', visible: false, isSuccess: false });
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = password.length >= 8 && hasLetter && hasNumber && hasSpecial;

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (hasLetter) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    return score;
  };

  const strength = getPasswordStrength();

  const translateError = (message) => {
    if (!message) return '';
    const lower = message.toLowerCase();
    
    if (lower.includes('email signups are disabled')) {
      return '현재 이메일 회원가입이 비활성화되어 있습니다. (Supabase 설정 확인 필요)';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return '이미 가입된 이메일 주소입니다.';
    }
    if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
      return '올바른 이메일 형식이 아닙니다.';
    }
    if (lower.includes('password should be at least')) {
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    return '회원가입 처리 중 오류가 발생했습니다: ' + message;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // 1. 이름 입력 확인
    if (!name.trim()) {
      setNameError('이름(닉네임)을 입력해 주세요.');
      return;
    }

    // 2. 이메일 입력 확인
    if (!email.trim()) {
      setEmailError('이메일 주소를 입력해 주세요.');
      return;
    }

    // 3. 비밀번호 검증
    if (!isPasswordValid) {
      setPasswordError('비밀번호는 영문, 숫자, 특수문자를 모두 포함하여 8자 이상 작성해야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 4. 약관 동의 확인
    if (!agreeTerms || !agreePrivacy) {
      setGeneralError('이용약관 및 개인정보 처리방침에 모두 동의해 주세요.');
      return;
    }

    setLoading(true);

    // Supabase 회원가입 요청 (이름 metadata 추가)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
          name: name.trim()
        }
      }
    });

    setLoading(false);

    if (error) {
      const translated = translateError(error.message);
      if (translated.includes('이메일')) {
        setEmailError(translated);
      } else {
        setGeneralError(translated);
      }
    } else {
      setPopupMessage({
        title: '회원가입 완료! 🎉',
        desc: '회원가입이 정상적으로 완료되었습니다. 로그인 페이지로 이동합니다.',
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
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSignup}>
            
            {generalError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">
                {generalError}
              </div>
            )}

            {/* 이름 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">이름 (닉네임)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError('');
                }}
                placeholder="홍길동"
                className={`mt-1 block w-full px-3 py-2 border ${
                  nameError ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{nameError}</p>
              )}
            </div>

            {/* 이메일 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">이메일 주소</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="example@email.com"
                className={`mt-1 block w-full px-3 py-2 border ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{emailError}</p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="8자 이상, 영문+숫자+특수문자 조합"
                className={`mt-1 block w-full px-3 py-2 border ${
                  passwordError ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />

              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ease-out rounded-full ${
                        strength === 4 ? 'bg-green-500' :
                        strength === 3 ? 'bg-yellow-500' :
                        strength === 2 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${(strength / 4) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 pt-0.5">
                    <span>
                      보안 강도:{' '}
                      {strength === 4 ? (
                        <strong className="text-green-600 font-bold">강력 (가입 가능)</strong>
                      ) : strength === 3 ? (
                        <span className="text-yellow-600 font-semibold">양호</span>
                      ) : strength === 2 ? (
                        <span className="text-orange-600 font-semibold">보통</span>
                      ) : (
                        <span className="text-red-500 font-semibold">약함</span>
                      )}
                    </span>
                    <span>8자+ / 영문 / 숫자 / 특수문자</span>
                  </div>
                </div>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  setPasswordError('');
                }}
                placeholder="비밀번호를 한번 더 입력해 주세요"
                className={`mt-1 block w-full px-3 py-2 border ${
                  passwordError ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {passwordError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{passwordError}</p>
              )}
            </div>

            {/* 약관 상시 노출 구역 */}
            <div className="pt-4 border-t border-gray-200 space-y-4">
              
              {/* 1. 서비스 이용약관 */}
              <div>
                <label className="flex items-center text-sm font-bold text-gray-900 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2">[필수] 서비스 이용약관 동의</span>
                </label>
                <div className="h-28 overflow-y-auto text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 leading-relaxed whitespace-pre-line">
                  {`[hsinside 서비스 이용약관]

제1조 (목적)
본 약관은 hsinside 커뮤니티(이하 "회사")가 제공하는 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (회원의 의무 및 게시물 관리)
1. 회원은 타인의 명예를 훼손하거나 불법, 음란, 비방 목적의 게시물을 작성해서는 안 됩니다.
2. 부적절한 게시물은 운영 지침에 따라 사전 통보 없이 삭제되거나 이용이 제한될 수 있습니다.

제3조 (서비스의 변경 및 중지)
회사는 기술적 필요 또는 운영상 이유로 서비스를 변경하거나 중지할 수 있습니다.`}
                </div>
              </div>

              {/* 2. 개인정보 처리방침 (이름 항목 추가) */}
              <div>
                <label className="flex items-center text-sm font-bold text-gray-900 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2">[필수] 개인정보 수집 및 이용 동의</span>
                </label>
                <div className="h-32 overflow-y-auto text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 leading-relaxed whitespace-pre-line">
                  {`[개인정보 처리방침]

1. 개인정보의 수집 및 이용 목적
- 회원가입 식별, 서비스 로그인, 서비스 내 사용자 이름 표시, 회원제 서비스 제공, 부정 이용 방지 및 고충 처리.

2. 수집하는 개인정보 항목
- 필수 항목: 이름(닉네임), 이메일 주소, 암호화된 비밀번호(Bcrypt)
- 자동 수집 항목: IP 주소, 서비스 이용 기록, 접속 로그

3. 개인정보의 보유 및 파기
- 회원 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법정 기간 동안 보관합니다.

4. 정보주체의 권리
- 이용자는 언제든지 자신의 개인정보 조회, 수정 및 탈퇴(삭제)를 요청할 수 있습니다.

5. 개인정보 보호책임자
- 담당자: hsinside 관리자 [임준서] (treetowood@naver.com)`}
                </div>
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
