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

  // 닉네임 검증 상태
  const [nicknameMsg, setNicknameMsg] = useState({ text: '', type: '' });
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState('');

  // 폼 및 피드백 상태
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 커스텀 슬라이더 상태
  const [slideVerified, setSlideVerified] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0);
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

  // 커스텀 슬라이더 드래그 핸들러
  const calculateProgress = (clientX) => {
    if (slideVerified || !sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const handleWidth = 48;
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
        setSliderProgress(0);
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

          {/* 1. 서비스 이용약관 (상세 및 전문 수록) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={terms.service}
                onChange={(e) => setTerms({ ...terms, service: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-emerald-700 font-extrabold">[필수]</span>
              <span>hsinside 서비스 이용약관 전문</span>
            </label>
            <div className="h-44 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2.5 select-text">
              <p className="font-bold text-gray-900 border-b pb-1">제 1 조 (목적)</p>
              <p>본 약관은 hsinside(이하 "회사"라 함)가 제공하는 커뮤니티 서비스, 게시판, 미디어 플랫폼 및 이에 부수하는 제반 서비스(이하 "서비스"라 함)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 2 조 (용어의 정의)</p>
              <p>1. "서비스"라 함은 접속 단말기(PC, 휴대형 단말기, 모바일 기기 등)의 종류와 상관없이 회원이 이용할 수 있는 hsinside 내 제반 커뮤니티 기능을 의미합니다.</p>
              <p>2. "회원"이라 함은 본 약관에 동의하고 가입 절차를 완료하여 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</p>
              <p>3. "게시물"이라 함은 회원이 서비스를 이용함에 있어 서비스 상에 게시한 문자, 이미지, 음성, 영상, 첨부파일, 댓글 및 각종 링크 일체를 말합니다.</p>
              <p>4. "닉네임"이라 함은 회원의 식별과 서비스 이용을 위하여 회원이 선정하고 회사가 승인하는 문자 및 숫자의 조합을 의미합니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 3 조 (약관의 게시와 개정)</p>
              <p>1. 회사는 본 약관의 내용을 회원이 용이하게 알 수 있도록 서비스 가입 화면 및 설정 페이지에 게시합니다.</p>
              <p>2. 회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</p>
              <p>3. 약관이 개정되는 경우 적용일자 및 개정사유를 명시하여 개정약관 적용일 최소 7일 전부터 서비스 공지사항을 통해 공지합니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 4 조 (이용계약의 체결 및 회원가입)</p>
              <p>1. 이용계약은 회원이 되고자 하는 자(이하 "가입신청자")가 약관의 내용에 대하여 동의를 한 다음 회원가입신청을 하고 회사가 이러한 신청에 대하여 승낙함으로써 체결됩니다.</p>
              <p>2. 회사는 가입신청자의 신청에 대하여 서비스 이용을 승낙함을 원칙으로 합니다. 다만, 다음 각 호에 해당하는 경우 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다:</p>
              <p className="pl-2">- 가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</p>
              <p className="pl-2">- 실명이 아니거나 타인의 명예, 이메일, 정보를 도용한 경우</p>
              <p className="pl-2">- 허위의 정보를 기재하거나, 회사가 제시하는 내용을 기재하지 않은 경우</p>
              <p className="pl-2">- 부정한 용도 또는 영리를 추구할 목적으로 본 서비스를 이용하고자 하는 경우</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 5 조 (회원의 의무 및 금지행위)</p>
              <p>회원은 서비스 이용과 관련하여 다음 각 호의 행위를 하여서는 안 되며, 적발 시 즉시 서비스 이용이 차단되거나 게시물이 삭제될 수 있습니다:</p>
              <p>1. 타인의 명예를 훼손하거나 인격권을 침해하는 인신공격, 모욕, 비방 게시글 등록</p>
              <p>2. 불법 음란물, 사기성 광고, 불법 사이트 링크, 악성코드 배포 행위</p>
              <p>3. 매크로 프로그램을 이용한 도배, 반복 게시, 자동화된 서비스 접속 행위</p>
              <p>4. 타인의 개인정보(실명, 연락처, 사진, 주소 등)를 무단으로 수집, 저장, 공개하는 행위</p>
              <p>5. 회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해 행위</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 6 조 (게시물의 권리 및 게시물 관리)</p>
              <p>1. 회원이 서비스 내에 작성한 게시물의 저작권은 해당 회원에게 귀속됩니다.</p>
              <p>2. 회원의 게시물이 관련 법령에 위반되는 내용을 포함하는 경우, 권리자는 관련 법령이 정한 절차에 따라 해당 게시물의 게시중단 및 삭제 등을 요청할 수 있으며, 회사는 관련 법령에 따라 조치를 취하여야 합니다.</p>
              <p>3. 회사는 권리자의 요청이 없는 경우라도 권리침해가 인정될 만한 사유가 있거나 기타 회사 정책 및 관련 법에 위반되는 경우에는 관련 법에 따라 해당 게시물에 대해 임시조치, 블러 처리 또는 삭제 조치를 취할 수 있습니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 7 조 (서비스 이용제한 및 영구정지)</p>
              <p>1. 회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 주의, 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.</p>
              <p>2. 이용제한 조치를 받은 회원은 정지 기간 동안 로그인, 게시글 및 댓글 작성, 미디어 업로드 등 커뮤니티 기능 전반이 차단됩니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">제 8 조 (손해배상 및 면책조항)</p>
              <p>1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              <p>2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</p>
              <p>3. 회사는 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</p>
            </div>
          </div>

          {/* 2. 개인정보 수집 및 이용 동의 (상세 및 전문 수록) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={terms.privacy}
                onChange={(e) => setTerms({ ...terms, privacy: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-emerald-700 font-extrabold">[필수]</span>
              <span>개인정보 수집 및 이용 동의 전문</span>
            </label>
            <div className="h-44 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2.5 select-text">
              <p className="font-bold text-gray-900 border-b pb-1">1. 개인정보 수집 항목 및 방법</p>
              <p>회사는 회원가입, 원활한 고객상담, 각종 서비스 제공을 위해 회원가입 시 아래와 같은 최소한의 개인정보를 필수 항목으로 수집하고 있습니다:</p>
              <p>- 필수 수집 항목: 이메일 주소, 비밀번호(암호화 일방향 해시 보관), 닉네임</p>
              <p>- 서비스 이용 과정에서 자동 생성되어 수집되는 정보: IP 주소, 쿠키(Cookie), 서비스 방문 및 이용 기록, 기기 식별자, 접속 로그, RLS 식별자(UUID)</p>

              <p className="font-bold text-gray-900 border-b pb-1">2. 개인정보의 수집 및 이용 목적</p>
              <p>수집한 개인정보는 다음의 목적을 위해 활용됩니다:</p>
              <p>- 회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리, 고지사항 전달</p>
              <p>- 서비스 제공: 게시글/댓글 작성 및 수정, 커뮤니티 동기화, 사용자별 맞춤 서비스 제공</p>
              <p>- 신규 서비스 개발 및 마케팅 활용: 신규 기능 개발 및 맞춤 서비스 제공, 서비스 유효성 확인, 접속 빈도 파악 및 회원의 서비스 이용에 대한 통계</p>

              <p className="font-bold text-gray-900 border-b pb-1">3. 개인정보의 보유 및 이용기간</p>
              <p>원칙적으로, 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:</p>
              <p>가. 회사 내부 방침에 의한 정보보유 사유</p>
              <p>- 부정이용기록: 1년 (부정이용 방지 및 명예훼손 등 민원 대응)</p>
              <p>나. 관련 법령에 의한 정보보유 사유</p>
              <p>- 서비스 접속 기록 (통신비밀보호법): 3개월</p>
              <p>- 전자상거래 등에서의 소비자 보호에 관한 법률 따른 표시/광고/계약 관련 기록: 6개월 ~ 5년</p>

              <p className="font-bold text-gray-900 border-b pb-1">4. 개인정보의 파기절차 및 방법</p>
              <p>1. 파기절차: 회원이 회원가입 등을 위해 입력하신 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.</p>
              <p>2. 파기방법: 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">5. 동의 거부권 및 불이익 안내</p>
              <p>이용자는 개인정보 수집 및 이용 동의를 거부할 권리가 있습니다. 다만 필수 수집 항목에 대한 동의를 거부하실 경우, 회원가입 및 커뮤니티 서비스 이용이 불가능합니다.</p>
            </div>
          </div>

          {/* 3. 개인정보 국외 이전 및 처리위탁 동의 (상세 및 전문 수록) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={terms.overseas}
                onChange={(e) => setTerms({ ...terms, overseas: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-emerald-700 font-extrabold">[필수]</span>
              <span>개인정보 국외 이전 및 위탁 동의 전문</span>
            </label>
            <div className="h-40 p-3 bg-gray-50 border border-gray-200 rounded-2xl overflow-y-auto text-[10.5px] text-gray-600 leading-relaxed font-sans space-y-2.5 select-text">
              <p className="font-bold text-gray-900 border-b pb-1">1. 개인정보 국외 이전의 목적 및 개요</p>
              <p>hsinside는 안정적인 글로벌 클라우드 데이터베이스 인프라 및 인증 시스템 운영을 위하여 아래와 같이 회원 개인정보의 처리를 국외 전문 서비스 제공업체에 위탁 및 이전합니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">2. 이전되는 개인정보 항목 및 국가</p>
              <p>- 이전 항목: 회원 이메일, 닉네임, 암호화된 비밀번호, 계정 ID(UUID), 서비스 이용 기록 및 스토리지 업로드 파일</p>
              <p>- 이전 국가: 미국 (AWS Cloud Infrastructure)</p>
              <p>- 이전 받는 자: Supabase Inc. (https://supabase.com / privacy@supabase.com)</p>
              <p>- 이전 일시 및 방법: 회원가입 및 서비스 이용 시점에 암호화된 보안 통신(TLS/SSL)을 통하여 실시간 전송</p>

              <p className="font-bold text-gray-900 border-b pb-1">3. 이전 받는 자의 보유 및 이용 기간</p>
              <p>회원 탈퇴 시 또는 서비스 위탁 계약 종료 시까지 안전하게 암호화 보관되며, 목적 달성 후 즉시 파기됩니다.</p>

              <p className="font-bold text-gray-900 border-b pb-1">4. 국외 이전 동의 거부권 안내</p>
              <p>이용자는 국외 이전에 동의하지 않을 권리가 있습니다. 단, 클라우드 인증 및 DB 데이터 베이스 서버 기반으로 작동하는 플랫폼 특성상 국외 이전 동의를 거부하실 경우 회원가입이 불가능합니다.</p>
            </div>
          </div>
        </div>

        {/* 🚀 커스텀 슬라이드 인증 (Slide to Unlock) */}
        <div className="space-y-1.5 pt-2">
          <label className="block font-bold text-gray-800 text-xs">
            보안 드래그 인증 *
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

        {/* 폼 메세지 피드백 */}
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
          {loading ? '가입 신청 중...' : '약관 동의 및 회원가입 완료'}
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
