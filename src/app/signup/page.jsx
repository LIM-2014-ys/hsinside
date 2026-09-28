'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  // 토스트 팝업 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  // 1. 약관 동의
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });

  // 2. 입력 데이터
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. 상태 관리
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState({ message: '', isSuccess: false });
  const [checkingNickname, setCheckingNickname] = useState(false);

  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [loading, setLoading] = useState(false);

  const allTermsChecked = terms.service && terms.privacy && terms.overseas;
  const handleAllTermsChange = (e) => {
    const checked = e.target.checked;
    setTerms({ service: checked, privacy: checked, overseas: checked });
  };

  // 닉네임 중복 확인
  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length < 2) {
      showToast('닉네임은 최소 2자 이상 입력해 주세요.', 'error');
      return;
    }

    setCheckingNickname(true);
    try {
      const res = await fetch('/api/auth/check-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });

      const data = await res.json().catch(() => null);

      if (!data) {
        showToast('서버 응답 형식이 올바르지 않습니다. (HTTP ' + res.status + ')', 'error');
        return;
      }

      if (res.ok && data.isAvailable) {
        setIsNicknameChecked(true);
        setNicknameStatus({ message: '사용 가능한 닉네임입니다.', isSuccess: true });
        showToast('멋진 닉네임이네요! 사용 가능합니다.', 'success');
      } else {
        setIsNicknameChecked(false);
        const errMsg = data.error || '이미 사용 중인 닉네임입니다.';
        setNicknameStatus({ message: errMsg, isSuccess: false });
        showToast(errMsg, 'error');
      }
    } catch (err) {
      showToast('네트워크 통신 중 오류가 발생했습니다.', 'error');
    } finally {
      setCheckingNickname(false);
    }
  };

  // 이메일 중복 확인 & 인증코드 발송
  const handleSendVerificationCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast('이메일 주소를 입력해 주세요.', 'error');
      return;
    }

    setSendingCode(true);

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const checkData = await res.json().catch(() => ({}));

      if (!checkData.isAvailable) {
        showToast('이미 등록된 이메일 주소입니다.', 'error');
        setSendingCode(false);
        return;
      }

      setIsEmailChecked(true);

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password || 'TempPass123!@#',
        options: { data: { display_name: nickname.trim() } },
      });

      if (error) {
        showToast('인증코드 발송 실패: ' + error.message, 'error');
      } else {
        setCodeSent(true);
        showToast('이메일로 6자리 인증코드가 전송되었습니다.', 'info');
      }
    } catch {
      showToast('요청 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  // 6자리 인증코드 검증
  const handleVerifyCode = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      showToast('6자리 인증코드를 정확히 입력해 주세요.', 'error');
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
        const { error: error2 } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: 'email',
        });

        if (error2) {
          showToast('인증코드가 올바르지 않거나 만료되었습니다.', 'error');
          setIsEmailVerified(false);
        } else {
          setIsEmailVerified(true);
          showToast('이메일 인증이 성공적으로 완료되었습니다!', 'success');
        }
      } else {
        setIsEmailVerified(true);
        showToast('이메일 인증이 성공적으로 완료되었습니다!', 'success');
      }
    } catch {
      showToast('인증 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  // 회원가입 최종 제출
  const handleFinalSignUp = async (e) => {
    e.preventDefault();

    if (!allTermsChecked) return showToast('필수 약관에 모두 동의해 주세요.', 'error');
    if (!isNicknameChecked) return showToast('닉네임 중복 확인이 필요합니다.', 'error');
    if (!isEmailVerified) return showToast('이메일 인증을 완료해 주세요.', 'error');
    if (password.length < 6) return showToast('비밀번호는 최소 6자리 이상이어야 합니다.', 'error');
    if (password !== confirmPassword) return showToast('비밀번호가 일치하지 않습니다.', 'error');

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        showToast('회원가입 실패: ' + error.message, 'error');
      } else {
        showToast('회원가입이 완료되었습니다! 잠시 후 이동합니다.', 'success');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch {
      showToast('오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-lg mx-auto my-10 p-6 bg-white border border-gray-100 rounded-2xl shadow-xl space-y-6 text-xs font-sans">
      {/* 🎨 프리미엄 커스텀 토스트 UI */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border rounded-2xl shadow-2xl transition-all duration-300 animate-bounce-once">
          {toast.type === 'success' && (
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
              ✓
            </div>
          )}
          {toast.type === 'error' && (
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
              ✕
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
              ℹ
            </div>
          )}
          <span className="text-gray-800 font-semibold text-xs tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="text-center border-b pb-4">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">✨ 회원가입</h1>
        <p className="text-gray-400 mt-1">계정 생성을 위한 필수 정보를 입력해 주세요.</p>
      </div>

      <form onSubmit={handleFinalSignUp} className="space-y-5">
        {/* 약관 동의 */}
        <div className="p-4 bg-gray-50/80 rounded-xl space-y-3 border border-gray-100">
          <div className="flex items-center gap-2 border-b pb-2 font-bold text-gray-800">
            <input
              type="checkbox"
              id="all-terms"
              checked={allTermsChecked}
              onChange={handleAllTermsChange}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
            />
            <label htmlFor="all-terms" className="cursor-pointer">모든 약관에 동의합니다.</label>
          </div>

          <div className="space-y-2 text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={terms.service}
                onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>[필수] 서비스 이용약관 동의</span>
            </label>
            <div className="p-2.5 bg-white border border-gray-100 rounded-lg text-[11px] text-gray-400 h-16 overflow-y-auto leading-relaxed">
              본 서비스는 안전한 게시글 작성 및 유저 간 소통을 지원합니다. 불법 게시물 및 타인 비방 시 제재될 수 있습니다.
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={terms.privacy}
                onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>[필수] 개인정보 수집 및 이용 동의</span>
            </label>
            <div className="p-2.5 bg-white border border-gray-100 rounded-lg text-[11px] text-gray-400 h-16 overflow-y-auto leading-relaxed">
              수집항목: 이메일, 닉네임, 접속 위치<br />
              목적: 회원 식별 및 게시글 서비스 이용<br />
              보유기간: 회원 탈퇴 시 즉시 삭제
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={terms.overseas}
                onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>[필수] 개인정보 국외 이전 동의</span>
            </label>
            <div className="p-2.5 bg-white border border-gray-100 rounded-lg text-[11px] text-gray-400 h-16 overflow-y-auto leading-relaxed">
              이전받는 자: Supabase Inc.<br />
              목적: 암호화 데이터베이스 호스팅 및 인증 처리
            </div>
          </div>
        </div>

        {/* 닉네임 */}
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
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              disabled={checkingNickname || !nickname.trim()}
              className="px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition disabled:bg-gray-200 disabled:text-gray-400"
            >
              {checkingNickname ? '확인 중...' : '중복 확인'}
            </button>
          </div>
          {nicknameStatus.message && (
            <p className={`mt-1.5 text-[11px] font-medium ${nicknameStatus.isSuccess ? 'text-emerald-600' : 'text-rose-500'}`}>
              {nicknameStatus.isSuccess ? '✓ ' : '✕ '} {nicknameStatus.message}
            </p>
          )}
        </div>

        {/* 이메일 인증 */}
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
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 transition"
            />
            <button
              type="button"
              onClick={handleSendVerificationCode}
              disabled={sendingCode || isEmailVerified || !email.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:bg-gray-200 disabled:text-gray-400"
            >
              {sendingCode ? '발송 중...' : codeSent ? '재발송' : '인증코드 발송'}
            </button>
          </div>

          {codeSent && !isEmailVerified && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6자리 인증코드"
                maxLength={6}
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-widest text-center"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifyingCode || otpCode.length < 6}
                className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:bg-gray-200 disabled:text-gray-400"
              >
                {verifyingCode ? '확인 중...' : '인증 확인'}
              </button>
            </div>
          )}

          {isEmailVerified && (
            <p className="text-[11px] text-emerald-600 font-semibold">✓ 이메일 인증이 완료되었습니다.</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">비밀번호 *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자리 이상)"
            required
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 가입 완료 버튼 */}
        <button
          type="submit"
          disabled={loading || !allTermsChecked || !isNicknameChecked || !isEmailVerified}
          className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none mt-2"
        >
          {loading ? '가입 처리 중...' : '회원가입 완료하기'}
        </button>
      </form>

      <div className="text-center border-t border-gray-100 pt-4 text-gray-400">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 font-semibold hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
