'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeForeignTransfer, setAgreeForeignTransfer] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // 전체 동의 처리
  const handleAllAgree = (e) => {
    const checked = e.target.checked;
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeForeignTransfer(checked);
  };

  const isAllChecked = agreeTerms && agreePrivacy && agreeForeignTransfer;

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!agreeTerms || !agreePrivacy || !agreeForeignTransfer) {
      return alert('모든 필수 약관 및 개인정보 국외이전 항목에 동의해 주세요.');
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          agree_terms: true,
          agree_privacy: true,
          agree_foreign_transfer: true,
          agreed_at: new Date().toISOString(),
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(`회원가입 실패: ${error.message}`);
    } else {
      alert('회원가입이 완료되었습니다! 로그인해 주세요.');
      router.push('/login');
    }
  };

  return (
    <div className="max-w-xl mx-auto my-10 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <h1 className="text-xl font-bold text-gray-900 border-b pb-3">👤 회원가입</h1>

      <form onSubmit={handleSignUp} className="space-y-5">
        {/* 기본 회원정보 입력 */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">이메일 계정</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="6자 이상 입력"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">닉네임</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="커뮤니티에서 사용할 닉네임"
              required
            />
          </div>
        </div>

        {/* 약관 영역 시작 */}
        <div className="space-y-4 pt-4 border-t">
          {/* 전체 동의 버튼 */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
            <input
              type="checkbox"
              id="allAgree"
              checked={isAllChecked}
              onChange={handleAllAgree}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="allAgree" className="text-xs font-bold text-gray-900 cursor-pointer">
              이용약관, 개인정보 수집 및 국외이전 항목에 모두 동의합니다.
            </label>
          </div>

          {/* 1. 이용약관 */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800">서비스 이용약관 <span className="text-blue-600">(필수)</span></p>
            <div className="h-28 overflow-y-auto p-3 border rounded-md bg-gray-50 text-[11px] text-gray-600 leading-relaxed space-y-2">
              <p className="font-bold">[제1조 목적]</p>
              <p>본 약관은 회원이 회사가 제공하는 커뮤니티 서비스 및 관련 제반 서비스를 이용함에 있어 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
              <p className="font-bold">[제2조 회원의 의무]</p>
              <p>1. 회원은 관계법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 하며, 기타 회사의 업무에 방해되는 행위를 하여서는 안 됩니다.</p>
              <p>2. 회원은 타인의 명예를 훼손하거나, 불법·음란·공포·혐오성 게시물, 타인의 권리를 침해하는 내용을 게시글 또는 댓글로 등록할 수 없습니다. 위반 시 사전 통보 없이 게시물이 삭제되거나 이용이 제한될 수 있습니다.</p>
              <p className="font-bold">[제3조 서비스의 중단]</p>
              <p>회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
            </div>
            {/* 박스 아랫줄 체크박스 */}
            <div className="flex items-center gap-2 pt-1 pl-1">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-xs font-medium text-gray-700 cursor-pointer">
                서비스 이용약관에 동의합니다.
              </label>
            </div>
          </div>

          {/* 2. 개인정보 수집 및 이용 동의 */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800">개인정보 수집 및 이용 동의 <span className="text-blue-600">(필수)</span></p>
            <div className="h-28 overflow-y-auto p-3 border rounded-md bg-gray-50 text-[11px] text-gray-600 leading-relaxed space-y-2">
              <p>개인정보보호법 제15조에 따라 서비스 제공을 위한 최소한의 개인정보를 수집·이용합니다.</p>
              <p><strong>1. 수집 항목:</strong> 이메일 주소, 비밀번호, 닉네임, 접속 IP, 서비스 이용 기록, 접속 위치 정보(게시글 작성 시 GPS/IP 기반 도시명)</p>
              <p><strong>2. 수집 및 이용 목적:</strong> 회원 가입 및 본인 확인, 게시글 및 댓글 작성 서비스 제공, 부정 이용 방지, 문의 대응 및 고지사항 전달</p>
              <p><strong>3. 보유 및 이용 기간:</strong> 회원 탈퇴 시 즉시 파기 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관)</p>
              <p>※ 귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으나, 거부 시 서비스 회원가입이 불가능합니다.</p>
            </div>
            {/* 박스 아랫줄 체크박스 */}
            <div className="flex items-center gap-2 pt-1 pl-1">
              <input
                type="checkbox"
                id="agreePrivacy"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="agreePrivacy" className="text-xs font-medium text-gray-700 cursor-pointer">
                개인정보 수집 및 이용에 동의합니다.
              </label>
            </div>
          </div>

          {/* 3. 개인정보 국외이전 동의 */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800">개인정보 국외이전 동의 <span className="text-blue-600">(필수)</span></p>
            <div className="h-28 overflow-y-auto p-3 border rounded-md bg-gray-50 text-[11px] text-gray-600 leading-relaxed space-y-2">
              <p>개인정보보호법 제28조의8에 따라 개인정보를 국외에 저장·처리하기 위해 아래와 같이 안내드리고 동의를 받습니다.</p>
              <p><strong>1. 이전받는 자:</strong> Supabase Inc. (AWS 클라우드 인프라 제공업체)</p>
              <p><strong>2. 이전되는 국가:</strong> 미국 (AWS US Region)</p>
              <p><strong>3. 이전 일시 및 방법:</strong> 회원가입 및 서비스 이용 시 정보통신망을 통해 전송·저장</p>
              <p><strong>4. 이전되는 개인정보 항목:</strong> 이메일, 닉네임, 프로필 이미지, 서비스 이용 기록, 접속 위치 정보, 작성한 게시글 및 파일</p>
              <p><strong>5. 이전 목적:</strong> 클라우드 데이터베이스 인프라를 통한 회원 관리, 서비스 데이터 보관 및 안정적인 서버 운영</p>
              <p><strong>6. 보유 및 이용 기간:</strong> 회원 탈퇴 시 또는 서비스 종료 시까지</p>
            </div>
            {/* 박스 아랫줄 체크박스 */}
            <div className="flex items-center gap-2 pt-1 pl-1">
              <input
                type="checkbox"
                id="agreeForeignTransfer"
                checked={agreeForeignTransfer}
                onChange={(e) => setAgreeForeignTransfer(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="agreeForeignTransfer" className="text-xs font-medium text-gray-700 cursor-pointer">
                개인정보 국외이전에 동의합니다.
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? '회원가입 처리 중...' : '동의하고 가입완료'}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 pt-3 border-t">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 font-bold hover:underline">
          로그인하기
        </Link>
      </div>
    </div>
  );
}
