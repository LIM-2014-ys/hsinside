'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  // 1. 토스트 알림 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  // 2. 약관 동의 상태
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });

  const allTermsChecked = terms.service && terms.privacy && terms.overseas;
  const handleAllTermsChange = (e) => {
    const checked = e.target.checked;
    setTerms({ service: checked, privacy: checked, overseas: checked });
  };

  // 3. 입력 데이터 State
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 4. 검증 State
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState({ message: '', isSuccess: false });
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 5. 슬라이드 보안 인증 State
  const [sliderValue, setSliderValue] = useState(0);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

  const [loading, setLoading] = useState(false);

  // 닉네임 중복 확인 API 호출
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
    if (!isCaptchaVerified) return showToast('슬라이드를 밀어 보안 인증을 완료해 주세요.', 'error');

    setLoading(true);

    try {
      // 1. 이메일 중복 확인 API
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

      // 2. Supabase 가입 처리
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
        showToast('회원가입이 성공적으로 완료되었습니다!', 'success');
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
    <div className="relative max-w-xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-7 text-xs font-sans">
      {/* 🔔 토스트 UI */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900/90 text-white backdrop-blur-md rounded-2xl shadow-2xl transition-all duration-300">
          {toast.type === 'success' && <span className="text-emerald-400 font-bold">✓</span>}
          {toast.type === 'error' && <span className="text-rose-400 font-bold">✕</span>}
          {toast.type === 'info' && <span className="text-blue-400 font-bold">ℹ</span>}
          <span className="font-semibold text-xs tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="text-center border-b pb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">hsinside 회원가입</h1>
        <p className="text-gray-400 mt-1.5 text-[11px]">서비스 이용을 위해 아래 상세 약관을 확인 후 동의해 주세요.</p>
      </div>

      <form onSubmit={handleFinalSignUp} className="space-y-6">
        {/* 📜 1. 법정 상세 약관 동의 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-gray-900 text-white rounded-2xl shadow-sm">
            <label htmlFor="all-terms" className="flex items-center gap-2.5 cursor-pointer font-bold text-xs select-none">
              <input
                type="checkbox"
                id="all-terms"
                checked={allTermsChecked}
                onChange={handleAllTermsChange}
                className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer"
              />
              <span>전체 약관에 동의합니다 (필수)</span>
            </label>
            <span className="text-[10px] text-gray-400">필수 항목 3건</span>
          </div>

          <div className="space-y-3">
            {/* 약관 1: 서비스 이용약관 */}
            <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/60">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900 mb-2">
                <input
                  type="checkbox"
                  checked={terms.service}
                  onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <span>[필수] 서비스 이용약관 동의</span>
              </label>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-[10px] text-gray-600 leading-relaxed h-28 overflow-y-auto space-y-1.5">
                <p className="font-bold text-gray-800">제1조 (목적)</p>
                <p>본 약관은 hsinside(이하 "회사")가 제공하는 모든 서비스의 이용 조건 및 절차, 회원과 회사의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
                <p className="font-bold text-gray-800 mt-1">제2조 (회원의 의무 및 규제)</p>
                <p>1. 회원은 타인의 정보를 도용하거나 허위 사실을 등록해서는 안 됩니다.</p>
                <p>2. 타인에 대한 비방, 욕설, 음란물, 광고성 게시물 작성 시 서비스 이용이 제한되거나 계정이 영구 정지될 수 있습니다.</p>
                <p className="font-bold text-gray-800 mt-1">제3조 (서비스의 변경 및 중단)</p>
                <p>회사는 시스템 점검, 교체 및 고장, 통신 두절 등의 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.</p>
              </div>
            </div>

            {/* 약관 2: 개인정보 수집 및 이용 동의 */}
            <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/60">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900 mb-2">
                <input
                  type="checkbox"
                  checked={terms.privacy}
                  onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <span>[필수] 개인정보 수집 및 이용 동의</span>
              </label>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-[10px] text-gray-600 leading-relaxed h-32 overflow-y-auto space-y-1.5">
                <p className="font-bold text-gray-800">1. 개인정보 수집 및 이용 목적</p>
                <p>- 회원 가입 의사 확인, 본인/연령 확인, 회원제 서비스 제공에 따른 본인 식별 및 인증</p>
                <p>- 부정 이용 방지, 비인가 사용 방지, 고지사항 전달 및 불만 처리</p>
                <p className="font-bold text-gray-800 mt-1">2. 수집하는 개인정보 항목</p>
                <p>- 필수 항목: 이메일 주소, 비밀번호, 닉네임, IP 주소, 서비스 이용 기록, 접속 로그</p>
                <p className="font-bold text-gray-800 mt-1">3. 개인정보의 보유 및 이용 기간</p>
                <p>- 원칙적으로 회원 탈퇴 시 수집된 개인정보는 즉시 파기합니다.</p>
                <p>- 단, 관계 법령 규정에 의해 보존할 필요가 있는 경우 관련 법령에서 정한 일정한 기간 동안 회원 정보를 보관합니다.</p>
                <p className="font-bold text-gray-800 mt-1">4. 동의 거부 권리 및 불이익</p>
                <p>- 귀하는 개인정보 수집 및 이용에 거부할 권리가 있으나, 거부 시 회원가입 및 서비스 이용이 제한됩니다.</p>
              </div>
            </div>

            {/* 약관 3: 개인정보 국외 이전 동의 */}
            <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/60">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900 mb-2">
                <input
                  type="checkbox"
                  checked={terms.overseas}
                  onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <span>[필수] 개인정보 국외 이전 동의</span>
              </label>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-[10px] text-gray-600 leading-relaxed h-28 overflow-y-auto space-y-1.5">
                <p className="font-bold text-gray-800">1. 이전받는 자</p>
                <p>- Supabase Inc. (클라우드 데이터베이스 인프라 제공자)</p>
                <p className="font-bold text-gray-800 mt-1">2. 이전되는 국가 및 일시/방법</p>
                <p>- 이전 국가: 미국 / AWS 클라우드 데이터센터 (싱가포르 또는 도쿄 리전)</p>
                <p>- 이전 일시 및 방법: 회원가입 시 네트워크를 통한 암호화 전송</p>
                <p className="font-bold text-gray-800 mt-1">3. 이전되는 개인정보 항목 및 이용 목적</p>
                <p>- 이전 항목: 이메일, 닉네임, 암호화된 비밀번호, 접속 기록</p>
                <p>- 이용 목적: 회원 정보 저장, 암호화 데이터 관리 및 보안 데이터베이스 호스팅</p>
              </div>
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
              className="px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
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

        {/* 🎚️ 5. 모던 슬라이더 방식 보안 인증 (Slide to Verify) */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
              🛡️ 자동 가입 방지 보안 인증
            </span>
            <span className="text-[10px] text-gray-400">
              {isCaptchaVerified ? '인증 완료' : '오른쪽으로 슬라이드'}
            </span>
          </div>

          {/* 슬라이더 트랙 트랙 */}
          <div className="relative w-full h-12 bg-gray-200 rounded-xl overflow-hidden select-none flex items-center shadow-inner">
            {/* 채워지는 프로그레스 배경 */}
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-75 ${
                isCaptchaVerified ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${sliderValue}%` }}
            />

            {/* 중앙 안내 문구 */}
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs pointer-events-none z-10">
              {isCaptchaVerified ? (
                <span className="text-white flex items-center gap-1.5 animate-fadeIn">
                  ✓ 보안 인증 완료!
                </span>
              ) : (
                <span
                  className="text-gray-500 transition-opacity"
                  style={{ opacity: Math.max(0, 1 - sliderValue / 60) }}
                >
                  ➔ 오른쪽으로 밀어서 인증
                </span>
              )}
            </div>

            {/* 실제 드래그 조작 Range Input */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              disabled={isCaptchaVerified}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSliderValue(val);
                if (val >= 90) {
                  setSliderValue(100);
                  setIsCaptchaVerified(true);
                  showToast('보안 인증이 완료되었습니다.', 'success');
                }
              }}
              onMouseUp={() => {
                if (sliderValue < 90 && !isCaptchaVerified) {
                  setSliderValue(0);
                }
              }}
              onTouchEnd={() => {
                if (sliderValue < 90 && !isCaptchaVerified) {
                  setSliderValue(0);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-20"
            />
          </div>
        </div>

        {/* 🚀 6. 가입완료 버튼 */}
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
          className="w-full py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
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
