'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  // 1. 약관 동의 상태
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });

  // 2. 입력 폼 상태
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. 검증 및 진행 상태
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState({ message: '', isSuccess: false });
  const [checkingNickname, setCheckingNickname] = useState(false);

  const [isEmailChecked, setIsEmailChecked] = useState(false); // 이메일 중복 확인 완료 여부
  const [codeSent, setCodeSent] = useState(false); // 인증코드 발송 완료 여부
  const [isEmailVerified, setIsEmailVerified] = useState(false); // 인증코드 확인 완료 여부
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [loading, setLoading] = useState(false);

  // 약관 전체 동의 처리
  const allTermsChecked = terms.service && terms.privacy && terms.overseas;
  const handleAllTermsChange = (e) => {
    const checked = e.target.checked;
    setTerms({ service: checked, privacy: checked, overseas: checked });
  };

  // 닉네임 중복 확인
  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length < 2) {
      alert('닉네임은 2자 이상 입력해 주세요.');
      return;
    }

    setCheckingNickname(true);
    try {
      const res = await fetch('/api/auth/check-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json();

      if (res.ok && data.isAvailable) {
        setIsNicknameChecked(true);
        setNicknameStatus({ message: '✅ 사용 가능한 닉네임입니다.', isSuccess: true });
      } else {
        setIsNicknameChecked(false);
        setNicknameStatus({ message: '❌ 이미 사용 중인 닉네임입니다.', isSuccess: false });
      }
    } catch {
      alert('서버 통신 오류가 발생했습니다.');
    } finally {
      setCheckingNickname(false);
    }
  };

  // 이메일 중복 확인 & 인증코드 발송
  const handleSendVerificationCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      alert('이메일을 입력해 주세요.');
      return;
    }

    setSendingCode(true);

    try {
      // Step 1: 이미 가입된 이메일인지 먼저 확인
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const checkData = await res.json();

      if (!checkData.isAvailable) {
        alert('이미 가입된 이메일 주소입니다. 다른 이메일을 사용하거나 로그인해 주세요.');
        setSendingCode(false);
        return;
      }

      setIsEmailChecked(true);

      // Step 2: Supabase 회원가입 및 OTP 인증코드 발송
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password || 'TempPass123!@#', // OTP 인증 전 임시 비번 설정
        options: {
          data: { display_name: nickname.trim() },
        },
      });

      if (error) {
        alert('인증코드 발송 실패: ' + error.message);
      } else {
        setCodeSent(true);
        alert('입력하신 이메일로 6자리 인증코드가 발송되었습니다.');
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setSendingCode(false);
    }
  };

  // 인증코드(6자리) 검증
  const handleVerifyCode = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      alert('6자리 인증코드를 정확히 입력해 주세요.');
      return;
    }

    setVerifyingCode(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'signup',
      });

      if (error) {
        // 'signup' 타입 실패 시 'email' 타입으로 재시도
        const { error: error2 } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: 'email',
        });

        if (error2) {
          alert('인증코드가 올바르지 않거나 만료되었습니다.');
          setIsEmailVerified(false);
        } else {
          setIsEmailVerified(true);
          alert('이메일 인증이 완료되었습니다.');
        }
      } else {
        setIsEmailVerified(true);
        alert('이메일 인증이 완료되었습니다.');
      }
    } catch {
      alert('인증 검증 중 오류가 발생했습니다.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // 최종 회원가입 제출 (비밀번호 최종 설정)
  const handleFinalSignUp = async (e) => {
    e.preventDefault();

    if (!allTermsChecked) return alert('모든 필수 약관에 동의하셔야 합니다.');
    if (!isNicknameChecked) return alert('닉네임 중복 확인을 완료해 주세요.');
    if (!isEmailVerified) return alert('이메일 인증을 완료해 주세요.');
    if (password.length < 6) return alert('비밀번호는 최소 6자리 이상이어야 합니다.');
    if (password !== confirmPassword) return alert('비밀번호가 일치하지 않습니다.');

    setLoading(true);

    try {
      // 최종 비밀번호 업데이트
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        alert('계정 생성 마무리 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('회원가입이 최종 완료되었습니다! 환영합니다.');
        router.push('/');
        router.refresh();
      }
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-10 p-6 bg-white border rounded-xl shadow-sm space-y-6 text-xs">
      <div className="text-center border-b pb-4">
        <h1 className="text-lg font-bold text-gray-900">✨ 회원가입</h1>
        <p className="text-gray-500 mt-1">약관 동의 및 본인 인증을 진행해 주세요.</p>
      </div>

      <form onSubmit={handleFinalSignUp} className="space-y-6">
        {/* 1. 약관 동의 섹션 */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-3 border">
          <div className="flex items-center gap-2 border-b pb-2 font-bold text-gray-900">
            <input
              type="checkbox"
              id="all-terms"
              checked={allTermsChecked}
              onChange={handleAllTermsChange}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="all-terms">전체 약관에 동의합니다.</label>
          </div>

          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={terms.service}
                  onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
                  className="rounded"
                />
                <span>[필수] 서비스 이용약관 동의</span>
              </label>
            </div>
            <div className="p-2 bg-white border rounded text-[11px] text-gray-500 h-16 overflow-y-auto">
              본 서비스는 커뮤니티 기능 이용 및 게시물 작성을 위해 최소한의 회원 정보를 처리합니다. 타인의 권리를 침해하거나 불법적인 게시물 등록을 금지합니다.
            </div>

            <div className="flex justify-between items-center pt-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={terms.privacy}
                  onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
                  className="rounded"
                />
                <span>[필수] 개인정보 수집 및 이용 동의</span>
              </label>
            </div>
            <div className="p-2 bg-white border rounded text-[11px] text-gray-500 h-16 overflow-y-auto">
              수집항목: 이메일, 닉네임, 접속 IP, 접속 위치 데이터<br />
              목적: 회원 식별, 서비스 제공 및 품질 개선, 부정 이용 방지<br />
              보유기간: 회원 탈퇴 시 즉시 파기
            </div>

            <div className="flex justify-between items-center pt-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={terms.overseas}
                  onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
                  className="rounded"
                />
                <span>[필수] 개인정보 국외 이전 동의</span>
              </label>
            </div>
            <div className="p-2 bg-white border rounded text-[11px] text-gray-500 h-16 overflow-y-auto">
              이전받는 자: Supabase Inc. (클라우드 데이터베이스 인프라 제공자)<br />
              이전되는 항목: 회원가입 이메일, 암호화된 계정 정보, 게시물 데이터<br />
              이전 목적: 글로벌 데이터베이스 호스팅 및 인증 서비스 운영
            </div>
          </div>
        </div>

        {/* 2. 닉네임 입력 및 중복 확인 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">닉네임 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setIsNicknameChecked(false);
                setNicknameStatus({ message: '', isSuccess: false });
              }}
              placeholder="사용하실 닉네임 입력"
              required
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              disabled={checkingNickname || !nickname.trim()}
              className="px-3 py-2 bg-gray-800 text-white font-bold rounded-md hover:bg-black transition disabled:bg-gray-300"
            >
              {checkingNickname ? '확인 중...' : '중복 확인'}
            </button>
          </div>
          {nicknameStatus.message && (
            <p className={`mt-1.5 text-[11px] ${nicknameStatus.isSuccess ? 'text-green-600 font-semibold' : 'text-red-500'}`}>
              {nicknameStatus.message}
            </p>
          )}
        </div>

        {/* 3. 이메일 중복 확인 및 인증코드 발송 */}
        <div className="space-y-2">
          <label className="block font-semibold text-gray-700">이메일 인증 *</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsEmailChecked(false);
                setCodeSent(false);
                setIsEmailVerified(false);
              }}
              disabled={isEmailVerified}
              placeholder="example@email.com"
              required
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={handleSendVerificationCode}
              disabled={sendingCode || isEmailVerified || !email.trim()}
              className="px-3 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:bg-gray-300"
            >
              {sendingCode ? '발송 중...' : codeSent ? '재발송' : '인증코드 발송'}
            </button>
          </div>

          {/* 4. 인증코드 입력 및 확인 */}
          {codeSent && !isEmailVerified && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6자리 인증코드 입력"
                maxLength={6}
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono tracking-widest text-center"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifyingCode || otpCode.length < 6}
                className="px-4 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition disabled:bg-gray-300"
              >
                {verifyingCode ? '확인 중...' : '인증 확인'}
              </button>
            </div>
          )}

          {isEmailVerified && (
            <p className="text-[11px] text-green-600 font-semibold">✅ 이메일 인증이 완료되었습니다.</p>
          )}
        </div>

        {/* 5. 비밀번호 입력 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">비밀번호 *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자리 이상)"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">비밀번호 확인 *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 재입력"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 6. 제출 버튼 */}
        <button
          type="submit"
          disabled={loading || !allTermsChecked || !isNicknameChecked || !isEmailVerified}
          className="w-full py-3 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300"
        >
          {loading ? '가입 진행 중...' : '회원가입 완료'}
        </button>
      </form>

      <div className="text-center border-t pt-4 text-gray-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 font-semibold hover:underline">
          로그인하기
        </Link>
      </div>
    </div>
  );
}
