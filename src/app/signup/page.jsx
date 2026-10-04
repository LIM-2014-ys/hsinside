'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();

  // 회원 기본 정보
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 닉네임 중복 확인 상태
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(null);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 슬라이드 보안 인증 상태
  const [slideValue, setSlideValue] = useState(0);
  const [isSlid, setIsSlid] = useState(false);

  // 3가지 상세 약관 동의 상태
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

  // 1. 닉네임 중복 확인 함수 (data.length > 0 기반 검사)
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

  // 2. 슬라이더 보안 인증 핸들러
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

  // 3. 회원가입 처리 제출
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

    if (!agreeTerms || !agreePrivacy || !agreeOverseas) {
      showToast('모든 필수 이용약관에 동의해야 가입이 진행됩니다.', 'error');
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

        {/* 🔒 슬라이드 보안 인증 */}
        <div className="pt-2">
          <label className="block font-bold text-gray-700 mb-1.5">보안 인증 *</label>
          <div
            className={`relative w-full h-12 rounded-2xl border transition-all overflow-hidden select-none flex items-center ${
              isSlid
                ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                : 'bg-gray-50 border-gray-200 shadow-inner'
            }`}
          >
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-75 ${
                isSlid ? 'bg-emerald-500' : 'bg-blue-500/20'
              }`}
              style={{ width: `${slideValue}%` }}
            />

            <div
              className={`absolute top-1 bottom-1 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all z-10 ${
                isSlid ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{
                left: isSlid
                  ? 'calc(100% - 2.75rem)'
                  : `calc(${slideValue}% * (1 - 2.75rem / 100%))`,
              }}
            >
              {isSlid ? '✓' : '➔'}
            </div>

            <span
              className={`w-full text-center text-[11px] font-bold z-0 transition-opacity ${
                isSlid ? 'text-emerald-800' : 'text-gray-500'
              }`}
            >
              {isSlid ? '보안 인증 완료!' : '오른쪽으로 밀어서 보안 인증'}
            </span>

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

        {/* 📋 상세 이용약관 (3개 구분 / 스크롤바 제공) */}
        <div className="pt-3 space-y-3">
          {/* 전체 동의 선택 헤더 */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-800 text-xs">약관 동의 및 확인</span>
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

          {/* 1. 서비스 이용약관 (상세) */}
          <div className="p-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="font-bold text-gray-800 text-[11px]">[필수] 서비스 이용약관 동의</span>
            </label>
            <div className="p-3 bg-white border border-gray-100 rounded-xl h-32 overflow-y-auto text-[10px] text-gray-600 leading-relaxed space-y-2 select-none">
              <p className="font-bold text-gray-900">제 1 조 (목적)</p>
              <p>본 약관은 hsinside 커뮤니티(이하 &quot;회사&quot; 또는 &quot;서비스&quot;)가 제공하는 온라인 게시판 및 이미지/파일 공유 서비스의 이용조건, 절차 및 회원의 권리·의무, 책임사항을 규정함을 목적으로 합니다.</p>
              
              <p className="font-bold text-gray-900">제 2 조 (회원의 정의 및 계정 관리)</p>
              <p>1. 회원이라 함은 본 약관에 동의하고 회원가입을 완료하여 서비스를 이용하는 사용자를 말합니다.</p>
              <p>2. 회원은 본인의 이메일 및 비밀번호를 안전하게 관리할 책임이 있으며, 계정 관리 소홀로 인한 피해는 본인이 부담합니다.</p>
              
              <p className="font-bold text-gray-900">제 3 조 (금지행위 및 커뮤니티 가이드라인)</p>
              <p>회원은 다음 각 호의 행위를 하여서는 안 되며, 위반 시 사전 통보 없이 게시물 삭제 및 계정 이용 정지 조치가 취해질 수 있습니다.</p>
              <p>- 타인을 비방, 모욕하거나 명예를 훼손하는 게시물 등록</p>
              <p>- 음란물, 불법 정보, 혐오 표현, 바이러스 악성 코드가 포함된 파일 유포</p>
              <p>- 타인의 지식재산권, 저작권, 초상권 등 권리를 침해하는 행위</p>
              <p>- 서비스의 정상적인 운영을 방해하거나 시스템에 무리를 주는 자동화 프로그램 이용</p>

              <p className="font-bold text-gray-900">제 4 조 (게시물의 저작권 및 책임)</p>
              <p>1. 회원이 작성한 게시물의 저작권은 해당 작성자에게 귀속됩니다.</p>
              <p>2. 게시물로 인해 발생하는 법적 분쟁 및 손해배상에 관한 책임은 작성자 본인에게 있습니다.</p>
            </div>
          </div>

          {/* 2. 개인정보 수집 및 이용 동의 (상세) */}
          <div className="p-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="font-bold text-gray-800 text-[11px]">[필수] 개인정보 수집 및 이용 동의</span>
            </label>
            <div className="p-3 bg-white border border-gray-100 rounded-xl h-32 overflow-y-auto text-[10px] text-gray-600 leading-relaxed space-y-2 select-none">
              <p className="font-bold text-gray-900">1. 개인정보 수집 목적</p>
              <p>- 회원 식별 및 본인 확인, 서비스 이용에 따른 각종 고지·통지 처리</p>
              <p>- 게시글 작성자 표시 및 커뮤니티 서비스 내 닉네임 표기</p>
              <p>- 서비스 부정 이용 방지, 불법적 사용자 제한 및 분쟁 조정 보존</p>

              <p className="font-bold text-gray-900">2. 수집하는 개인정보 항목</p>
              <p>- 필수 항목: 이메일 주소, 암호화된 비밀번호, 닉네임</p>
              <p>- 자동 수집 항목: 서비스 이용 기록, 접속 IP 정보, 쿠키, 작성 게시물 및 첨부파일 데이터</p>

              <p className="font-bold text-gray-900">3. 개인정보의 보유 및 이용 기간</p>
              <p>- 원칙적으로 회원 탈퇴 시 수집된 개인정보는 즉시 파기됩니다.</p>
              <p>- 단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 관련 법령이 정한 기간 동안 개인정보를 보관합니다.</p>

              <p className="font-bold text-gray-900">4. 동의 거부 권리 및 불이익 안내</p>
              <p>귀하는 개인정보 수집 및 이용 동의를 거부할 권리가 있으나, 이는 필수 정보이므로 동의를 거부할 경우 회원가입 및 서비스 이용이 불가능합니다.</p>
            </div>
          </div>

          {/* 3. 개인정보 국외 이전 동의 (상세) */}
          <div className="p-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeOverseas}
                onChange={(e) => setAgreeOverseas(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="font-bold text-gray-800 text-[11px]">[필수] 개인정보 국외 이전 동의</span>
            </label>
            <div className="p-3 bg-white border border-gray-100 rounded-xl h-32 overflow-y-auto text-[10px] text-gray-600 leading-relaxed space-y-2 select-none">
              <p className="font-bold text-gray-900">1. 이전받는 자 (수탁자)</p>
              <p>- Supabase Inc. 및 Amazon Web Services Inc. (AWS 클라우드 인프라)</p>

              <p className="font-bold text-gray-900">2. 이전되는 개인정보 항목</p>
              <p>- 회원 이메일, 닉네임, 회원가입 일시, 서비스 접속 로그, 작성한 게시글 및 업로드 첨부파일 데이터</p>

              <p className="font-bold text-gray-900">3. 이전 국가, 일시 및 방법</p>
              <p>- 이전 국가: 미국 및 글로벌 AWS 데이터센터 네트워크 지역</p>
              <p>- 이전 일시 및 방법: 서비스 회원가입 및 이용 시점에 네트워크 암호화 전송(SSL/TLS)을 통해 실시간 이전 및 보관</p>

              <p className="font-bold text-gray-900">4. 이전받는 자의 이용 목적 및 보유 기간</p>
              <p>- 목적: 안정적인 클라우드 데이터베이스 인프라 구축, 백업 보관, 분산 데이터 관리 및 보안 가용성 확보</p>
              <p>- 보유 기간: 회원 탈퇴 시 또는 서비스 종료 시까지 보관</p>

              <p className="font-bold text-gray-900">5. 국외 이전 동의 거부 권리</p>
              <p>hsinside는 국외 클라우드 인프라를 기반으로 운영되므로 국외 이전 동의를 거부하시는 경우 회원가입이 불가능합니다.</p>
            </div>
          </div>
        </div>

        {/* 회원가입 제출 버튼 */}
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
