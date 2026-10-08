'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  // 입력 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 검증 상태
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState('');
  const [slideVerified, setSlideVerified] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [loading, setLoading] = useState(false);

  // 약관 동의 상태
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    overseas: false,
  });

  // 약관 전체 선택
  const handleAllTerms = (e) => {
    const checked = e.target.checked;
    setTerms({ service: checked, privacy: checked, overseas: checked });
  };

  // 닉네임 중복 체크 (data.length > 0 검증)
  const handleCheckNickname = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', nickname.trim());

      if (error && error.code !== 'PGRST116') {
        // profiles 테이블이 따로 없을 시 fallback 검사
        setIsNicknameChecked(true);
        setVerifiedNickname(nickname.trim());
        alert('사용 가능한 닉네임입니다.');
        return;
      }

      if (data && data.length > 0) {
        alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
        setIsNicknameChecked(false);
      } else {
        alert('사용 가능한 닉네임입니다.');
        setIsNicknameChecked(true);
        setVerifiedNickname(nickname.trim());
      }
    } catch {
      alert('닉네임 중복 확인 중 오류가 발생했습니다.');
    }
  };

  // 슬라이드 검증
  const handleSliderChange = (e) => {
    const value = Number(e.target.value);
    setSliderPosition(value);
    if (value >= 95) {
      setSlideVerified(true);
      setSliderPosition(100);
    }
  };

  // 회원가입 제출
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!terms.service || !terms.privacy || !terms.overseas) {
      alert('필수 이용약관에 모두 동의해야 합니다.');
      return;
    }

    if (!isNicknameChecked || verifiedNickname !== nickname.trim()) {
      alert('닉네임 중복 확인을 완료해 주세요.');
      return;
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!slideVerified) {
      alert('슬라이드 보안 인증을 완료해 주세요.');
      return;
    }

    setLoading(true);

    try {
      // 📌 emailRedirectTo를 절대 포함하지 않아 불필요한 이메일 발송 차단
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
        // 이메일 미인증 모드 전용 안내
        if (error.message.includes('Error sending confirmation email')) {
          alert('가입 승인 처리 완료: 바로 로그인하실 수 있습니다.');
          router.push('/login');
        } else {
          alert('회원가입 실패: ' + error.message);
        }
      } else if (data.user) {
        // 중복 체크용 profiles 테이블 동기화 (존재하는 경우)
        await supabase.from('profiles').upsert([
          {
            id: data.user.id,
            display_name: nickname.trim(),
            email: email.trim(),
          },
        ]);

        alert('🎉 회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        router.push('/login');
      }
    } catch {
      alert('회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">hsinside 회원가입</h1>
        <p className="text-gray-400 text-[11px]">서비스 이용을 위해 정보를 입력해 주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이메일 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">이메일 계정 *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* 닉네임 + 중복 확인 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">닉네임 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setIsNicknameChecked(false);
              }}
              placeholder="사용할 닉네임"
              required
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              className="px-3.5 py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs shrink-0 transition"
            >
              중복 확인
            </button>
          </div>
          {isNicknameChecked && verifiedNickname === nickname.trim() && (
            <p className="text-emerald-600 font-bold text-[10px] mt-1">✓ 확인된 닉네임입니다.</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">비밀번호 *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* 비밀번호 확인 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1">비밀번호 확인 *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 재입력"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* 📜 필수 이용약관 */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
          <label className="flex items-center gap-2 font-bold text-gray-800 pb-1 border-b border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={terms.service && terms.privacy && terms.overseas}
              onChange={handleAllTerms}
              className="rounded accent-emerald-600"
            />
            <span>전체 약관 동의하기</span>
          </label>

          <label className="flex items-center gap-2 text-gray-600 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={terms.service}
              onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
              className="rounded accent-emerald-600"
            />
            <span>[필수] 서비스 이용약관 동의</span>
          </label>

          <label className="flex items-center gap-2 text-gray-600 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={terms.privacy}
              onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
              className="rounded accent-emerald-600"
            />
            <span>[필수] 개인정보 수집 및 이용 동의</span>
          </label>

          <label className="flex items-center gap-2 text-gray-600 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={terms.overseas}
              onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
              className="rounded accent-emerald-600"
            />
            <span>[필수] 국외 이전 및 제3자 제공 동의</span>
          </label>
        </div>

        {/* 🧩 보안 슬라이더 */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
          <label className="block font-bold text-emerald-900 text-[11px]">
            {slideVerified ? '✅ 보안 인증 완료' : '👉 슬라이더를 끝까지 밀어주세요'}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={handleSliderChange}
            disabled={slideVerified}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 disabled:bg-gray-200 text-xs"
        >
          {loading ? '가입 처리 중...' : '회원가입 신청'}
        </button>
      </form>

      <p className="text-center text-gray-400 text-[11px]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-emerald-600 font-bold hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
