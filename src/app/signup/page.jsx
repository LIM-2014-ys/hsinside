'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 닉네임 중복 확인 상태
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(null);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 슬라이드 인증 및 약관 동의 상태
  const [isSlid, setIsSlid] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // 토스트 알림 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  // 1. 닉네임 중복 확인 함수 (data.length 검사)
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

  // 2. 회원가입 처리
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isNicknameAvailable) {
      showToast('닉네임 중복 확인을 진행해 주세요.', 'error');
      return;
    }

    if (!isSlid) {
      showToast('보안 인증 슬라이더를 우측 끝까지 밀어주세요.', 'error');
      return;
    }

    if (!termsAgreed) {
      showToast('이용약관 및 개인정보 처리방침에 동의해 주세요.', 'error');
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

        {/* Slide to Verify (보안 슬라이드) */}
        <div className="pt-2">
          <label className="block font-bold text-gray-700 mb-1.5">보안 인증 *</label>
          <div className="relative w-full h-12 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center select-none">
            <span className={`text-[11px] font-bold ${isSlid ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isSlid ? '✓ 보안 인증 완료' : '➡️ 오른쪽으로 밀어서 인증하세요'}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={isSlid ? 100 : 0}
              onChange={(e) => {
                if (Number(e.target.value) >= 90) {
                  setIsSlid(true);
                } else {
                  setIsSlid(false);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* 이용약관 */}
        <div className="pt-2 space-y-2">
          <label className="block font-bold text-gray-700">서비스 이용약관 및 커뮤니티 규정 *</label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl h-24 overflow-y-auto text-[10px] text-gray-500 leading-relaxed">
            <p className="font-bold text-gray-700">제 1 조 (목적)</p>
            <p>본 약관은 hsinside 커뮤니티 플랫폼이 제공하는 서비스의 이용조건 및 절차를 규정함을 목적으로 합니다.</p>
            <p className="font-bold text-gray-700 mt-1">제 2 조 (의무 및 규정)</p>
            <p>타인을 비방하거나 불법적인 내용을 게시할 경우 게시물 삭제 및 계정 제재 조치가 취해질 수 있습니다.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-bold text-gray-700 text-[11px]">위 이용약관 및 규정을 모두 확인했으며 동의합니다.</span>
          </label>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={loading || !isNicknameAvailable || !isSlid || !termsAgreed}
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
