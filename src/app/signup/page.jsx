'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  // 1. 프리미엄 토스트 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  // 2. 약관 동의 상태 및 세부 펼침 상태
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });
  const [expandedTerms, setExpandedTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });

  const allTermsChecked = terms.service && terms.privacy && terms.overseas;
  const handleAllTermsChange = (e) => {
    const checked = e.target.checked;
    setTerms({ service: checked, privacy: checked, overseas: checked });
  };

  const toggleTermDetail = (key) => {
    setExpandedTerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 3. 입력 데이터
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 4. 검증 상태
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState({ message: '', isSuccess: false });
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 5. 자체 Captcha (로봇이 아닙니다) 상태
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaMath, setCaptchaMath] = useState({ num1: 0, num2: 0, answer: 0 });
  const [userMathInput, setUserMathInput] = useState('');
  const [showMathChallenge, setShowMathChallenge] = useState(false);

  const [loading, setLoading] = useState(false);

  // 로봇 방지용 랜덤 수학 문제 생성
  const generateMathQuestion = () => {
    const n1 = Math.floor(Math.random() * 8) + 1;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setCaptchaMath({ num1: n1, num2: n2, answer: n1 + n2 });
    setUserMathInput('');
  };

  useEffect(() => {
    generateMathQuestion();
  }, []);

  // Captcha 클릭 핸들러
  const handleCaptchaClick = () => {
    if (isCaptchaVerified) return;

    if (!showMathChallenge) {
      setShowMathChallenge(true);
    }
  };

  // Captcha 정답 검증
  const handleVerifyMath = () => {
    if (parseInt(userMathInput, 10) === captchaMath.answer) {
      setCaptchaLoading(true);
      setTimeout(() => {
        setCaptchaLoading(false);
        setIsCaptchaVerified(true);
        setShowMathChallenge(false);
        showToast('보안 검증이 완료되었습니다.', 'success');
      }, 600);
    } else {
      showToast('정답이 올바르지 않습니다. 다시 시도해 주세요.', 'error');
      generateMathQuestion();
    }
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
      const res = await fetch('/api/check-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.isAvailable) {
        setIsNicknameChecked(true);
        setNicknameStatus({ message: '사용 가능한 닉네임입니다.', isSuccess: true });
        showToast('사용 가능한 닉네임입니다.', 'success');
      } else {
        setIsNicknameChecked(false);
        const errMsg = data?.error || '이미 사용 중인 닉네임입니다.';
        setNicknameStatus({ message: errMsg, isSuccess: false });
        showToast(errMsg, 'error');
      }
    } catch {
      showToast('닉네임 확인 중 서버 통신 오류가 발생했습니다.', 'error');
    } finally {
      setCheckingNickname(false);
    }
  };

  // 회원가입 최종 제출
  const handleFinalSignUp = async (e) => {
    e.preventDefault();

    if (!allTermsChecked) return showToast('필수 약관에 모두 동의해 주세요.', 'error');
    if (!isNicknameChecked) return showToast('닉네임 중복 확인을 완료해 주세요.', 'error');
    if (!email.trim()) return showToast('이메일을 입력해 주세요.', 'error');
    if (password.length < 6) return showToast('비밀번호는 최소 6자리 이상이어야 합니다.', 'error');
    if (password !== confirmPassword) return showToast('비밀번호가 일치하지 않습니다.', 'error');
    if (!isCaptchaVerified) return showToast('로봇이 아닙니다 검증을 완료해 주세요.', 'error');

    setLoading(true);

    try {
      // 1. 이메일 중복 확인
      const checkRes = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkData.isAvailable) {
        showToast('이미 가입된 이메일 주소입니다.', 'error');
        setLoading(false);
        return;
      }

      // 2. Supabase 가입
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: { display_name: nickname.trim() },
        },
      });

      if (error) {
        showToast('회원가입 실패: ' + error.message, 'error');
      } else {
        showToast('회원가입이 완료되었습니다! 환영합니다.', 'success');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1200);
      }
    } catch {
      showToast('가입 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-lg mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-7 text-xs font-sans">
      {/* 🔔 프리미엄 토스트 UI */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900/90 text-white backdrop-blur-md rounded-2xl shadow-2xl transition-all duration-300 animate-fadeIn">
          {toast.type === 'success' && <span className="text-emerald-400 font-bold">✓</span>}
          {toast.type === 'error' && <span className="text-rose-400 font-bold">✕</span>}
          {toast.type === 'info' && <span className="text-blue-400 font-bold">ℹ</span>}
          <span className="font-semibold text-xs tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center border-b pb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">hsinside 회원가입</h1>
        <p className="text-gray-400 mt-1.5 text-[11px]">간단한 정보 입력으로 커뮤니티를 이용해 보세요.</p>
      </div>

      <form onSubmit={handleFinalSignUp} className="space-y-6">
        {/* 📜 1. 디자인 개선된 약관 동의 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-gray-900 text-white rounded-2xl shadow-sm">
            <label htmlFor="all-terms" className="flex items-center gap-2.5 cursor-pointer font-bold text-xs select-none">
              <input
                type="checkbox"
                id="all-terms"
                checked={allTermsChecked}
                onChange={handleAllTermsChange}
                className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer"
              />
              <span>전체 약관에 동의합니다</span>
            </label>
            <span className="text-[10px] text-gray-400 font-normal">필수 항목 전체 동의</span>
          </div>

          <div className="space-y-2">
            {/* 약관 1 */}
            <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50 transition">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={terms.service}
                    onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <span>[필수] 서비스 이용약관 동의</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleTermDetail('service')}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                >
                  {expandedTerms.service ? '접기' : '상세보기'}
                </button>
              </div>
              {expandedTerms.service && (
                <div className="mt-2.5 p-2.5 bg-white border border-gray-100 rounded-xl text-[10px] text-gray-500 leading-relaxed max-h-24 overflow-y-auto">
                  hsinside 커뮤니티 서비스 이용 조건 및 절차, 회원과 회사의 권리와 의무, 책임 사항에 대해 규정합니다. 타인 비방, 광고성 게시글 등록 시 서비스 이용이 제한될 수 있습니다.
                </div>
              )}
            </div>

            {/* 약관 2 */}
            <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50 transition">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={terms.privacy}
                    onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <span>[필수] 개인정보 수집 및 이용 동의</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleTermDetail('privacy')}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                >
                  {expandedTerms.privacy ? '접기' : '상세보기'}
                </button>
              </div>
              {expandedTerms.privacy && (
                <div className="mt-2.5 p-2.5 bg-white border border-gray-100 rounded-xl text-[10px] text-gray-500 leading-relaxed max-h-24 overflow-y-auto">
                  수집항목: 이메일, 닉네임, 접속 IP 및 접속 위치 데이터<br />
                  목적: 회원 식별, 부정 이용 방지 및 게시물 관리<br />
                  보유기간: 회원 탈퇴 시 즉시 파기합니다.
                </div>
              )}
            </div>

            {/* 약관 3 */}
            <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50 transition">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={terms.overseas}
                    onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <span>[필수] 개인정보 국외 이전 동의</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleTermDetail('overseas')}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                >
                  {expandedTerms.overseas ? '접기' : '상세보기'}
                </button>
              </div>
              {expandedTerms.overseas && (
                <div className="mt-2.5 p-2.5 bg-white border border-gray-100 rounded-xl text-[10px] text-gray-500 leading-relaxed max-h-24 overflow-y-auto">
                  이전받는 자: Supabase Inc.<br />
                  목적: 클라우드 암호화 데이터베이스 저장 및 보안 호스팅
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 👤 2. 닉네임 중복 확인 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1.5">닉네임 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setIsNicknameChecked(false);
                setNicknameStatus({ message: '', isSuccess: false });
              }}
              placeholder="2자 이상의 닉네임"
              required
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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

        {/* 📧 3. 이메일 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1.5">이메일 *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 🔒 4. 비밀번호 */}
        <div className="space-y-3">
          <div>
            <label className="block font-bold text-gray-700 mb-1.5">비밀번호 *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자리 이상 비밀번호"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1.5">비밀번호 확인 *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 재입력"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* 🤖 5. 자체 제작 "로봇이 아닙니다" 위젯 */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div
              onClick={handleCaptchaClick}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div
                className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${
                  isCaptchaVerified
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {captchaLoading ? (
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : isCaptchaVerified ? (
                  <span className="font-bold text-xs">✓</span>
                ) : null}
              </div>
              <span className="font-semibold text-gray-700 text-xs">
                {isCaptchaVerified ? '보안 인증 완료' : '로봇이 아닙니다.'}
              </span>
            </div>

            {/* 자체 브랜딩 마크 */}
            <div className="flex flex-col items-end opacity-60">
              <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase">hsCaptcha</span>
              <span className="text-[8px] text-gray-400">보안 및 개인정보</span>
            </div>
          </div>

          {/* 수학 문제 챌린지 팝업/영역 */}
          {showMathChallenge && !isCaptchaVerified && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 animate-fadeIn">
              <span className="font-bold text-gray-700">
                Q. {captchaMath.num1} + {captchaMath.num2} = ?
              </span>
              <input
                type="number"
                value={userMathInput}
                onChange={(e) => setUserMathInput(e.target.value)}
                placeholder="답 입력"
                className="w-20 px-2.5 py-1.5 border border-gray-300 rounded-lg text-center font-bold focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleVerifyMath}
                className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
              >
                확인
              </button>
            </div>
          )}
        </div>

        {/* 🚀 6. 최종 제출 버튼 */}
        <button
          type="submit"
          disabled={
            loading ||
            !allTermsChecked ||
            !isNicknameChecked ||
            !email.trim() ||
            !password.trim() ||
            !isCaptchaVerified
          }
          className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
          {loading ? '가입 처리 중...' : '회원가입 완료'}
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
