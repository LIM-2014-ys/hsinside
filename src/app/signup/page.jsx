'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 닉네임 검증
  const [nicknameMsg, setNicknameMsg] = useState({ text: '', type: '' });
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState('');

  // 폼 및 피드백 상태
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 💎 세련된 커스텀 슬라이더 상태
  const [slideVerified, setSlideVerified] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0); // 0 ~ 100 (%)
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef(null);

  // 약관 동의 상태
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });

  const handleAllTerms = (e) => {
    const checked = e.target.checked;
    setTerms({ service: checked, privacy: checked, overseas: checked });
  };

  // 닉네임 중복 체크
  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();

    if (!trimmed) {
      setNicknameMsg({ text: '사용할 닉네임을 입력해 주세요.', type: 'error' });
      setIsNicknameChecked(false);
      return;
    }

    if (trimmed.length < 2 || trimmed.length > 12) {
      setNicknameMsg({ text: '닉네임은 2자 이상 12자 이하로 입력해 주세요.', type: 'error' });
      setIsNicknameChecked(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', trimmed);

      if (error && error.code !== 'PGRST116') {
        setNicknameMsg({ text: '사용 가능한 닉네임입니다.', type: 'success' });
        setIsNicknameChecked(true);
        setVerifiedNickname(trimmed);
        return;
      }

      if (data && data.length > 0) {
        setNicknameMsg({ text: '이미 사용 중인 닉네임입니다.', type: 'error' });
        setIsNicknameChecked(false);
      } else {
        setNicknameMsg({ text: '✓ 사용 가능한 닉네임입니다.', type: 'success' });
        setIsNicknameChecked(true);
        setVerifiedNickname(trimmed);
      }
    } catch {
      setNicknameMsg({ text: '닉네임 중복 확인 중 오류가 발생했습니다.', type: 'error' });
      setIsNicknameChecked(false);
    }
  };

  // 🖱️/📱 커스텀 인터랙티브 드래그 계산 핸들러
  const calculateProgress = (clientX) => {
    if (slideVerified || !sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const handleWidth = 48; // 슬라이더 버튼 폭
    const maxTrackWidth = rect.width - handleWidth;

    let offsetX = clientX - rect.left - handleWidth / 2;
    if (offsetX < 0) offsetX = 0;
    if (offsetX > maxTrackWidth) offsetX = maxTrackWidth;

    const percentage = Math.round((offsetX / maxTrackWidth) * 100);
    setSliderProgress(percentage);

    if (percentage >= 90) {
      setSlideVerified(true);
      setSliderProgress(100);
      setIsDragging(false);
    }
  };

  const handleMouseDown = (e) => {
    if (slideVerified) return;
    setIsDragging(true);
    calculateProgress(e.clientX);
  };

  const handleTouchStart = (e) => {
    if (slideVerified) return;
    setIsDragging(true);
    if (e.touches[0]) {
      calculateProgress(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) calculateProgress(e.clientX);
    };

    const handleTouchMove = (e) => {
      if (isDragging && e.touches[0]) calculateProgress(e.touches[0].clientX);
    };

    const handleRelease = () => {
      if (isDragging && !slideVerified) {
        setIsDragging(false);
        setSliderProgress(0); // 미완료 시 원래 위치로 스냅 백
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleRelease);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleRelease);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleRelease);
    };
  }, [isDragging, slideVerified]);

  // 회원가입 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMsg({ text: '', type: '' });

    if (!terms.service || !terms.privacy || !terms.overseas) {
      setFormMsg({ text: '모든 필수 약관에 동의하셔야 회원가입이 가능합니다.', type: 'error' });
      return;
    }

    if (!isNicknameChecked || verifiedNickname !== nickname.trim()) {
      setNicknameMsg({ text: '닉네임 중복 확인을 완료해 주세요.', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setFormMsg({ text: '입력하신 비밀번호와 확인용 비밀번호가 일치하지 않습니다.', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setFormMsg({ text: '비밀번호는 최소 6자 이상이어야 합니다.', type: 'error' });
      return;
    }

    if (!slideVerified) {
      setFormMsg({ text: '보안 슬라이드 인증을 완료해 주세요.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: nickname.trim(),
            status: '정상',
            banned: false,
          },
        },
      });

      if (error) {
        if (error.message.includes('Error sending confirmation email')) {
          setFormMsg({ text: '가입 승인 완료! 로그인 페이지로 이동합니다.', type: 'success' });
          setTimeout(() => router.push('/login'), 1200);
        } else {
          setFormMsg({ text: '회원가입 실패: ' + error.message, type: 'error' });
        }
      } else if (data.user) {
        await supabase.from('profiles').upsert([
          {
            id: data.user.id,
            display_name: nickname.trim(),
            email: email.trim(),
          },
        ]);

        setFormMsg({ text: '🎉 hsinside 회원가입이 성공적으로 완료되었습니다!', type: 'success' });
        setTimeout(() => router.push('/login'), 1200);
      }
    } catch {
      setFormMsg({ text: '회원가입 처리 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-6 sm:p-10 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-8 text-xs font-sans">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">hsinside 회원가입</h1>
        <p className="text-gray-400 text-xs">안전하고 쾌적한 커뮤니티 이용을 위해 정보를 입력해 주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 계정 정보 */}
        <div className="space-y-4">
          <div>
            <label className="block font-bold text-gray-800 mb-1.5">이메일 계정 *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1.5">닉네임 *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setIsNicknameChecked(false);
                  setNicknameMsg({ text: '', type: '' });
                }}
                placeholder="2~12자의 닉네임"
                required
                className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={handleCheckNickname}
                className="px-4 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs shrink-0 transition shadow-sm"
              >
                중복 확인
              </button>
            </div>

            {nicknameMsg.text && (
              <p
                className={`mt-2 font-bold text-[11px] ${
                  nicknameMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {nicknameMsg.text}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1.5">비밀번호 *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 6자 이상"
                required
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-800 mb-1.5">비밀번호 확인 *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                required
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>
        </div>

        {/* 📜 이용약관 박스 */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <label className="flex items-center gap-2.5 font-black text-sm text-gray-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={terms.service && terms.privacy && terms.overseas}
                onChange={handleAllTerms}
                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              />
              <span>약관 전체 동의하기</span>
            </label>
            <span className="text-[10px] text-gray-400 font-medium">* 필수 동의 포함</span>
          </div>

          {/* 1. 서비스 이용약관 */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={terms.service}
                onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-emerald-700 font-extrabold">[필수]</span>
              <span>hsinside 서비스 이용약관</span>
            </label>
            <div className="h-28 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2 select-text">
              <p className="font-bold text-gray-800">제 1 조 (목적)</p>
              <p>본 약관은 hsinside가 제공하는 커뮤니티 플랫폼 및 서비스 이용에 관한 제반 조건과 회원의 의무사항을 규정함을 목적으로 합니다.</p>
              <p className="font-bold text-gray-800">제 2 조 (게시물 및 미디어 관리)</p>
              <p>회원은 타인의 명예를 훼손하거나 불법적인 음란물/사기성 콘텐츠를 게시할 수 없으며, 위반 시 서비스 제한 및 계정 정지 처분을 받을 수 있습니다.</p>
            </div>
          </div>

          {/* 2. 개인정보 수집 및 이용 동의 */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={terms.privacy}
                onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-emerald-700 font-extrabold">[필수]</span>
              <span>개인정보 수집 및 이용 동의</span>
            </label>
            <div className="h-28 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2 select-text">
              <p className="font-bold text-gray-800">수집 항목 및 목적</p>
              <p>1. 이메일, 닉네임: 회원 식별 및 주요 정보 전달<br />2. 접속 IP, 쿠키: 부정 이용 방지 및 안정적인 커뮤니티 환경 제공</p>
            </div>
          </div>

          {/* 3. 국외 이전 및 제3자 제공 동의 */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={terms.overseas}
                onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-emerald-700 font-extrabold">[필수]</span>
              <span>개인정보 국외 이전 동의</span>
            </label>
            <div className="h-24 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2 select-text">
              <p>보안 데이터베이스 운영을 위해 Supabase Inc. (미국 클라우드 인프라)에 회원 정보가 암호화되어 안전하게 관리됩니다.</p>
            </div>
          </div>
        </div>

        {/* 🚀 세련된 커스텀 슬라이드-투-락(Slide to Unlock) 보안 버튼 */}
        <div className="space-y-1.5 pt-2">
          <label className="block font-bold text-gray-800 text-xs">
            보안 인증 *
          </label>

          <div
            ref={sliderTrackRef}
            className={`relative h-14 rounded-2xl border p-1 select-none overflow-hidden transition-all duration-300 flex items-center ${
              slideVerified
                ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-100 border-slate-200/80 shadow-inner'
            }`}
          >
            {/* 채워지는 프로그레스 필(Fill) */}
            <div
              className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all ${
                isDragging ? 'duration-75' : 'duration-300 ease-out'
              }`}
              style={{
                width: slideVerified
                  ? '100%'
                  : `calc(${sliderProgress}% + ${sliderProgress > 0 ? '48px' : '0px'})`,
              }}
            />

            {/* 슬라이더 안내 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span
                className={`text-xs font-black tracking-wide transition-opacity duration-300 ${
                  slideVerified
                    ? 'text-white'
                    : sliderProgress > 40
                    ? 'text-white drop-shadow-sm'
                    : 'text-gray-400 animate-pulse'
                }`}
              >
                {slideVerified ? '✓ 보안 인증 완료' : '밀어서 회원가입 인증 🔓'}
              </span>
            </div>

            {/* 드래그 핸들 버튼 */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={`relative z-20 w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                isDragging ? 'scale-105 shadow-xl' : 'scale-100'
              } ${!isDragging && !slideVerified ? 'transition-all duration-300' : ''}`}
              style={{
                transform: slideVerified
                  ? `translateX(calc(${sliderTrackRef.current?.getBoundingClientRect().width || 300}px - 56px))`
                  : `translateX(${
                      ((sliderTrackRef.current?.getBoundingClientRect().width || 300) - 56) *
                      (sliderProgress / 100)
                    }px)`,
              }}
            >
              {slideVerified ? (
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* 폼 안내 메세지 */}
        {formMsg.text && (
          <div
            className={`p-3.5 rounded-2xl text-center text-xs font-bold border transition-all ${
              formMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {formMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl transition shadow-xl shadow-emerald-500/20 active:scale-[0.99] disabled:bg-gray-200 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {loading ? '가입 신청 중...' : '회원가입 완료'}
        </button>
      </form>

      <p className="text-center text-gray-400 text-[11px]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-emerald-600 font-bold hover:underline ml-1">
          로그인하러 가기
        </Link>
      </p>
    </div>
  );
}
