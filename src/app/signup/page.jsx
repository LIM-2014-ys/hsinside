'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();

  // 기본 회원 정보 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 닉네임 중복 확인 상태
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(null);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 슬라이드 보안 인증 상태 (UI 업그레이드)
  const [slideValue, setSlideValue] = useState(0);
  const [isSlid, setIsSlid] = useState(false);

  // 3가지 분리된 이용약관 상태
  const [agreeTerms, setAgreeTerms] = useState(false);      // 1. 서비스 이용약관
  const [agreePrivacy, setAgreePrivacy] = useState(false);  // 2. 개인정보 수집 및 이용
  const [agreeOverseas, setAgreeOverseas] = useState(false); // 3. 개인정보 국외 이전

  const [loading, setLoading] = useState(false);

  // 토스트 알림 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  // 전체 약관 동의 / 해제 핸들러
  const handleAllTermsChange = (e) => {
    const checked = e.target.checked;
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeOverseas(checked);
  };

  const isAllTermsChecked = agreeTerms && agreePrivacy && agreeOverseas;

  // 1. 닉네임 중복 확인
  const handleCheckNickname = async () => {
    if (!nickname.trim()) {
      showToast('닉네임을 입력해 주세요.', 'error');
      return;
    }

    setCheckingNickname(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('author_name')
        .eq('author_name', nickname.trim());

      if (error) {
        showToast('닉네임 확인 중 오류가 발생했습니다.', 'error');
        setIsNicknameAvailable(false);
        return;
      }

      if (data && data.length > 0) {
        setIsNicknameAvailable(false);
        showToast('이미 사용 중인 닉네임입니다.', 'error');
      } else {
        setIsNicknameAvailable(true);
        showToast('사용 가능한 닉네임입니다!', 'success');
      }
    } catch {
      showToast('닉네임 확인 중 오류가 발생했습니다.', 'error');
      setIsNicknameAvailable(false);
    } finally {
      setCheckingNickname(false);
    }
  };

  // 2. 슬라이더 이동 처리
  const handleSlideChange = (e) => {
    if (isSlid) return;
    const val = Number(e.target.value);
    setSlideValue(val);

    if (val >= 90) {
      setSlideValue(100);
      setIsSlid(true);
      showToast('보안 인증이 완료되었습니다.', 'success');
    }
  };

  // 3. 회원가입 처리
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isNicknameAvailable) {
      showToast('닉네임 중복 확인을 진행해 주세요.', 'error');
      return;
    }

    if (!isSlid) {
      showToast('보안 인증 슬라이더를 끝까지 밀어주세요.', 'error');
      return;
    }

    if (!agreeTerms || !agreePrivacy || !agreeOverseas) {
      showToast('모든 필수 약관에 동의해야 가입할 수 있습니다.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: nickname.trim(),
          },
        },
      });

      if (error) {
        showToast('회원가입 실패: ' + error.message, 'error');
      } else if (data.user) {
        showToast('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.', 'success');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      }
    } catch {
      showToast('회원가입 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-lg mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 🔔 토스트 UI */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900/90 text-white backdrop-blur-md rounded-2xl shadow-2xl transition-all duration-300">
          {toast.type === 'success' && <span className="text-emerald-400 font-bold">✓</span>}
          {toast.type === 'error' && <span className="text-rose-400 font-bold">✕</span>}
          {toast.type === 'info' && <span className="text-blue-400 font-bold">ℹ</span>}
          <span className="font-semibold text-xs tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">👤 회원가입</h1>
        <p className="text-gray-400 mt-1 text-[11px]">hsinside 커뮤니티 계정을 생성합니다.</p>
      </div>

      {/* 회원가입 폼 */}
      <form onSubmit={handleRegister} className="space-y-4">
        {/* 이메일 입력 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">이메일 계정 *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 비밀번호 입력 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">비밀번호 *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자리 이상 입력하세요"
            minLength={6}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 닉네임 입력 + 중복 확인 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">닉네임 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setIsNicknameAvailable(null);
              }}
              placeholder="사용할 닉네임 입력"
              required
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              disabled={checkingNickname || !nickname.trim()}
              className="px-4 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition disabled:bg-gray-200 shrink-0 text-[11px]"
            >
              {checkingNickname ? '확인 중...' : '중복 확인'}
            </button>
          </div>
          {isNicknameAvailable === true && (
            <p className="text-emerald-600 font-semibold text-[11px] mt-1">✓ 사용 가능한 닉네임입니다.</p>
          )}
          {isNicknameAvailable === false && (
            <p className="text-rose-500 font-semibold text-[11px] mt-1">✕ 이미 사용 중이거나 사용할 수 없는 닉네임입니다.</p>
          )}
        </div>

        {/* 🔒 슬라이드 보안 인증 (디자인 업그레이드) */}
        <div className="pt-2">
          <label className="block font-bold text-gray-700 mb-1.5">보안 인증 *</label>
          <div
            className={`relative w-full h-13 rounded-2xl border transition-all overflow-hidden select-none flex items-center ${
              isSlid
                ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                : 'bg-gray-50 border-gray-200 shadow-inner'
            }`}
          >
            {/* 프로그레스 진행 바 배경 */}
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-75 ${
                isSlid ? 'bg-emerald-500' : 'bg-blue-500/20'
              }`}
              style={{ width: `${slideValue}%` }}
            />

            {/* 슬라이더 이동 손잡이 (Thumb) */}
            <div
              className={`absolute top-1 bottom-1 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all z-10 ${
                isSlid ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{
                left: isSlid
                  ? 'calc(100% - 3rem)'
                  : `calc(${slideValue}% * (1 - 3rem / 100%))`,
              }}
            >
              {isSlid ? '✓' : '➔'}
            </div>

            {/* 안내 텍스트 */}
            <span
              className={`w-full text-center text-[11px] font-bold z-0 transition-opacity ${
                isSlid ? 'text-emerald-800' : 'text-gray-500'
              }`}
            >
              {isSlid ? '보안 인증이 완료되었습니다!' : '밀어서 보안 인증 완료하기'}
            </span>

            {/* 투명 range 컨트롤 */}
            <input
              type="range"
              min="0"
              max="100"
              value={slideValue}
              disabled={isSlid}
              onChange={handleSlideChange}
              onMouseUp={() => !isSlid && setSlideValue(0)}
              onTouchEnd={() => !isSlid && setSlideValue(0)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-20"
            />
          </div>
        </div>

        {/* 📋 이용약관 (3가지 항목 분리 & 국외이전 포함) */}
        <div className="pt-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-800 text-xs">약관 동의</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllTermsChecked}
                onChange={handleAllTermsChange}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-bold text-blue-600 text-[11px]">전체 동의하기</span>
            </label>
          </div>

          {/* 1. 서비스 이용약관 */}
          <div className="p-3 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-gray-800 text-[11px]">[필수] 서비스 이용약관 동의</span>
              </label>
            </div>
            <div className="p-2.5 bg-white border border-gray-100 rounded-xl h-16 overflow-y-auto text-[10px] text-gray-500 leading-relaxed">
              hsinside 커뮤니티 플랫폼 서비스 이용을 위한 기본 규칙 및 유저 의무 사항을 규정합니다. 타인 비방, 불법 게시물 작성 시 이용 제재를 받을 수 있습니다.
            </div>
          </div>

          {/* 2. 개인정보 수집 및 이용 동의 */}
          <div className="p-3 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-gray-800 text-[11px]">[필수] 개인정보 수집 및 이용 동의</span>
              </label>
            </div>
            <div className="p-2.5 bg-white border border-gray-100 rounded-xl h-16 overflow-y-auto text-[10px] text-gray-500 leading-relaxed">
              수집항목: 이메일 계정, 닉네임, 접속 로그. 수집목적: 회원 식별, 게시글 작성자 명시, 서비스 부정이용 방지. 보유기간: 회원 탈퇴 시 즉시 파기.
            </div>
          </div>

          {/* 3. 개인정보 국외 이전 동의 */}
          <div className="p-3 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeOverseas}
                  onChange={(e) => setAgreeOverseas(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-gray-800 text-[11px]">[필수] 개인정보 국외 이전 동의</span>
              </label>
            </div>
            <div className="p-2.5 bg-white border border-gray-100 rounded-xl h-16 overflow-y-auto text-[10px] text-gray-500 leading-relaxed">
              이전받는 자: Supabase Inc. (AWS 데이터센터). 이전항목: 로그인 이메일, 닉네임, 업로드 데이터. 이전 국가 및 목적: 미국/글로벌 클라우드 데이터베이스 안전 보관 및 백업.
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={
              loading ||
              !isNicknameAvailable ||
              !isSlid ||
              !agreeTerms ||
              !agreePrivacy ||
              !agreeOverseas
            }
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed text-xs"
          >
            {loading ? '계정 생성 중...' : '회원가입 완료'}
          </button>
        </div>
      </form>

      {/* 하단 로그인 링크 */}
      <div className="text-center border-t pt-4 text-gray-400 text-[11px]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 font-bold hover:underline">
          로그인하기
        </Link>
      </div>
    </div>
  );
}
