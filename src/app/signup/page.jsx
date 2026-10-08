'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 닉네임 검증 상태
  const [nicknameMsg, setNicknameMsg] = useState({ text: '', type: '' });
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState('');

  // 폼 및 인증 상태
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });
  const [slideVerified, setSlideVerified] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [loading, setLoading] = useState(false);

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
        setNicknameMsg({ text: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.', type: 'error' });
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

  // 슬라이드 인증 드래그 핸들러
  const handleSliderChange = (e) => {
    const value = Number(e.target.value);
    setSliderPosition(value);
    if (value >= 92) {
      setSlideVerified(true);
      setSliderPosition(100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMsg({ text: '', type: '' });

    if (!terms.service || !terms.privacy || !terms.overseas) {
      setFormMsg({ text: '서비스 이용을 위해 모든 필수 이용약관에 동의하셔야 합니다.', type: 'error' });
      return;
    }

    if (!isNicknameChecked || verifiedNickname !== nickname.trim()) {
      setNicknameMsg({ text: '닉네임 중복 확인을 완료해 주세요.', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setFormMsg({ text: '입력하신 비밀번호와 비밀번호 재확인이 일치하지 않습니다.', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setFormMsg({ text: '비밀번호는 최소 6자 이상으로 설정해 주세요.', type: 'error' });
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
          setFormMsg({ text: '가입 승인이 처리되었습니다! 로그인 페이지로 이동합니다.', type: 'success' });
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

        setFormMsg({ text: '🎉 hsinside 회원가입이 성공적으로 완료되었습니다! 로그인 페이지로 이동합니다.', type: 'success' });
        setTimeout(() => router.push('/login'), 1200);
      }
    } catch {
      setFormMsg({ text: '회원가입 처리 중 오류가 발생했습니다. 다시 시도해 주세요.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-6 sm:p-10 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-8 text-xs font-sans">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">hsinside 회원가입</h1>
        <p className="text-gray-400 text-xs">안전하고 쾌적한 커뮤니티 이용을 위해 정보를 작성해 주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 입력 폼 */}
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

        {/* 📜 상세 이용약관 영역 */}
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
            <span className="text-[10px] text-gray-400 font-medium">* 필수 항목 전체 포함</span>
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
            <div className="h-32 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2 select-text">
              <p className="font-bold text-gray-800">제 1 조 (목적)</p>
              <p>
                본 약관은 hsinside(이하 "회사" 또는 "플랫폼")가 제공하는 커뮤니티 플랫폼 및 관련 제반 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무, 책임사항 및 서비스 이용조건을 명확히 규정함을 목적으로 합니다.
              </p>

              <p className="font-bold text-gray-800">제 2 조 (용어의 정의)</p>
              <p>
                1. "서비스"라 함은 접속 단말기(PC, 휴대형 단말기 등)의 종류와 상관없이 회원이 이용할 수 있는 hsinside 게시판, 댓글, 미디어 업로드 등 모든 제반 서비스를 의미합니다.<br />
                2. "회원"이라 함은 본 약관에 동의하고 계정을 등록하여 서비스를 지속적으로 이용하는 자를 말합니다.<br />
                3. "게시물"이라 함은 회원이 서비스 내에 게시한 문자, 이미지, 파일, 링크, 댓글 등 일체의 정보 및 콘텐츠를 의미합니다.
              </p>

              <p className="font-bold text-gray-800">제 3 조 (약관의 효력 및 개정)</p>
              <p>
                1. 본 약관은 회원이 회원가입 화면에서 약관 동의 절차를 완료함과 동시에 효력이 발생합니다.<br />
                2. 회사는 관련 법령(전자상거래법, 정보통신망법 등)을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 개정 시 변경사항을 사전 공지합니다.
              </p>

              <p className="font-bold text-gray-800">제 4 조 (회원의 의무 및 금지행위)</p>
              <p>
                회원은 서비스 이용 시 다음 각 호의 행위를 해서는 안 되며, 위반 시 서비스 이용이 제한되거나 계정이 정지될 수 있습니다:<br />
                가. 타인의 명예를 훼손하거나 인격권을 침해하는 인신공격성 게시물 등록<br />
                나. 음란물, 불법 정보, 사기성 콘텐츠, 악성 코드 포함 파일 유포<br />
                다. 동일/유사 내용의 불필요한 연속 게시(스팸, 도배 행위)<br />
                라. 타인의 개인정보(성명, 연락처, 사진 등) 무단 수집 및 공개<br />
                마. 플랫폼의 정상적인 운영을 방해하는 시스템 공격 및 보안 허점 악용
              </p>

              <p className="font-bold text-gray-800">제 5 조 (게시물의 권리 및 관리 정책)</p>
              <p>
                1. 회원이 서비스 내에 작성한 게시물의 저작권은 해당 작성자에게 귀속됩니다.<br />
                2. 회사는 불법적이거나 타인의 권리를 침해하는 게시물, 검열 대상 미디어에 대해 사전 통보 없이 블러 처리, 접근 제한 또는 삭제 조치를 취할 수 있습니다.
              </p>

              <p className="font-bold text-gray-800">제 6 조 (서비스 이용제한 및 제재)</p>
              <p>
                회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등의 단계적 조치를 적용할 수 있습니다. 정지 상태의 회원 계정은 게시글 작성, 댓글 작성 및 파일 업로드 기능이 완전 차단됩니다.
              </p>
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
            <div className="h-32 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2 select-text">
              <p className="font-bold text-gray-800">1. 개인정보 수집 항목</p>
              <p>
                - 필수 수집 항목: 이메일 주소, 비밀번호(암호화 보관), 닉네임, 접속 IP 로그, 쿠키, 서비스 이용 기록.<br />
                - 자동 생성 정보: 접속 일시, 이용 기기 정보, RLS 보안 식별자(UUID).
              </p>

              <p className="font-bold text-gray-800">2. 개인정보 수집 및 이용 목적</p>
              <p>
                - 회원가입 의사 확인 및 본인 식별/인증<br />
                - 게시글 및 댓글 작성 서비스 제공, 닉네임 실시간 동기화<br />
                - 불량 회원의 부정 이용 방지 및 서비스 이상 동작 모니터링<br />
                - 이용자 문의 사항 대응 및 서비스 관련 주요 고지사항 전달
              </p>

              <p className="font-bold text-gray-800">3. 개인정보 보유 및 이용 기간</p>
              <p>
                - 회원의 개인정보는 원칙적으로 회원 탈퇴 시까지 보유 및 이용합니다.<br />
                - 탈퇴 시 데이터베이스에서 즉시 파기되나, 관계 법령(통신비밀보호법 등)에 따라 보존할 필요가 있는 경우 해당 법정 기간 동안 안전하게 보관됩니다 (예: 접속 기록 3개월).
              </p>

              <p className="font-bold text-gray-800">4. 동의 거부 권리 및 불이익</p>
              <p>
                이용자는 개인정보 수집 및 이용 동의를 거부할 권리가 있습니다. 단, 필수 수집 항목에 대한 동의를 거부하실 경우 hsinside 커뮤니티 회원가입 및 서비스 이용이 불가합니다.
              </p>
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
              <span>개인정보 국외 이전 및 처리위탁 동의</span>
            </label>
            <div className="h-28 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2 select-text">
              <p className="font-bold text-gray-800">1. 이전되는 개인정보 항목 및 목적</p>
              <p>
                - 이전 항목: 계정 이메일, 닉네임, 생성 일시, 암호화된 사용자 ID(UUID).<br />
                - 이전 목적: 글로벌 클라우드 인프라를 통한 안전한 데이터베이스 저장, 사용자 인증 관리 및 파일 스토리지 운영.
              </p>

              <p className="font-bold text-gray-800">2. 개인정보 이전 국가 및 받는 자</p>
              <p>
                - 이전 대상 국가: 미국 (AWS Cloud Infrastructure)<br />
                - 개인정보를 이전받는 자: Supabase Inc. (https://supabase.com)<br />
                - 이전 방법: SSL/TLS 암호화 네트워크 전송
              </p>

              <p className="font-bold text-gray-800">3. 보유 및 이용 기간</p>
              <p>
                서비스 회원 탈퇴 시 또는 계약 종료 시까지 안전하게 암호화되어 보관됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 🎚️ 커스텀 인터랙티브 슬라이드 인증 바 UI */}
        <div className="pt-2">
          <div
            className={`relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
              slideVerified
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-md shadow-emerald-500/10'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* 채워지는 프로그레스 트랙 배경 */}
            <div
              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-400/20 to-teal-500/30 transition-all duration-75 ease-out pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <span className="font-bold text-[11px] text-gray-700 flex items-center gap-1.5">
                {slideVerified ? (
                  <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    ✅ 캡차 드래그 인증 완료
                  </span>
                ) : (
                  <span className="text-gray-600">
                    🔒 보안 슬라이드: 우측 끝까지 드래그하세요
                  </span>
                )}
              </span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                {sliderPosition}%
              </span>
            </div>

            {/* 슬라이더 Range Input */}
            <div className="relative z-10 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={handleSliderChange}
                disabled={slideVerified}
                className="w-full h-3 bg-gray-200/80 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 하단 에러/성공 피드백 메세지 */}
        {formMsg.text && (
          <div
            className={`p-3.5 rounded-2xl text-center text-xs font-bold border transition-all ${
              formMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200 animate-shake'
            }`}
          >
            {formMsg.text}
          </div>
        )}

        {/* 회원가입 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xl shadow-emerald-500/25 active:scale-[0.99] disabled:bg-gray-200 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {loading ? '가입 신청 처리 중...' : '약관 동의 및 회원가입 완료'}
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
