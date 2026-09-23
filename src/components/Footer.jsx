'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-8 mb-12 space-y-6 text-gray-800 leading-relaxed text-sm">
      {/* 헤더 */}
      <div className="border-b pb-4">
        <h1 className="text-xl font-bold text-gray-900">🔒 개인정보 처리방침</h1>
        <p className="text-xs text-gray-500 mt-1">최종 개정일: 2026년 9월 23일</p>
      </div>

      <div className="space-y-6 text-xs text-gray-700">
        {/* 1. 수집하는 개인정보 항목 및 방법 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">1. 수집하는 개인정보 항목 및 방법</h2>
          <p className="text-gray-600">
            hsinside는 회원가입, 원활한 커뮤니티 서비스 제공, 본인 확인 및 서비스 안전성 확보를 위해 아래와 같은 개인정보를 수집하고 있습니다.
          </p>
          <ul className="list-disc list-inside space-y-1 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <li><strong>회원가입 정보:</strong> 이메일 주소, 암호화된 비밀번호, 프로필 이름(닉네임)</li>
            <li><strong>게시물 작성 시 수집 정보:</strong> IP 기반 자동 추적 접속 도시 위치 (예: Seoul, Hanam-si 등), 첨부 사진(이미지) 파일 및 작성 본문</li>
            <li><strong>서비스 이용 과정에서 자동 수집:</strong> 접속 로그, 쿠키(Session)</li>
          </ul>
        </section>

        {/* 2. 개인정보의 수집 및 이용 목적 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>회원 관리:</strong> 이메일 인증을 통한 가입 의사 확인, 본인 식별 및 회원 탈퇴 처리</li>
            <li><strong>게시판 서비스 제공:</strong> 게시글 작성자 표시, 이미지 파일 업로드 및 표시, 게시글 작성 접속 도시(위치) 표시</li>
            <li><strong>서비스 안전 및 운영 관리:</strong> 중복/연타 투표 방지, 매크로 악용 방지 및 부적절 게시물 신고 처리</li>
          </ul>
        </section>

        {/* 3. 개인정보의 파기절차 및 방법 (즉시 연쇄 파기) */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">3. 개인정보의 보유 및 파기 절차</h2>
          <p className="text-gray-600">
            원칙적으로 이용자의 개인정보는 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 이용자가 마이페이지를 통해 **회원 탈퇴**를 진행하는 경우, 수집된 데이터는 아래와 같이 **즉시 영구 파기(Cascade Delete)**됩니다.
          </p>
          <div className="bg-red-50 p-3.5 rounded-lg border border-red-100 text-red-900 space-y-1">
            <p className="font-bold">⚠️ 회원 탈퇴 시 즉시 삭제되는 항목:</p>
            <p>· Auth 로그인 계정 정보</p>
            <p>· 작성한 모든 게시글 및 댓글</p>
            <p>· 추천/비추천 반응 내역 및 첨부된 모든 사진(이미지) 파일</p>
            <p>· 갤러리 개설 신청 내역</p>
          </div>
        </section>

        {/* 4. 이용자의 권리와 행사 방법 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">4. 이용자의 권리와 행사 방법</h2>
          <p className="text-gray-600">
            이용자는 언제든지 마이페이지에서 자신의 프로필 이름(닉네임) 변경 및 비밀번호 변경을 진행할 수 있으며, 이메일 본인 확인 절차를 거쳐 직접 회원 탈퇴 및 데이터 완전 삭제를 진행할 수 있습니다.
          </p>
        </section>

        {/* 5. 개인정보 보호책임자 및 문의처 */}
        <section className="space-y-2 border-t pt-4">
          <h2 className="text-sm font-bold text-gray-900">5. 개인정보 보호책임자</h2>
          <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 text-gray-700 space-y-1">
            <p><strong>성명:</strong> 임준서</p>
            <p><strong>직책:</strong> hsinside 서비스 관리자</p>
            <p><strong>이메일 문의:</strong> <a href="mailto:treetowood@naver.com" className="text-blue-600 underline">treetowood@naver.com</a></p>
          </div>
        </section>
      </div>

      {/* 하단 돌아가기 버튼 */}
      <div className="pt-6 border-t flex justify-between items-center text-xs">
        <Link href="/" className="text-blue-600 font-semibold hover:underline">
          ← 메인 화면으로 돌아가기
        </Link>
        <span className="text-gray-400">© hsinside</span>
      </div>
    </div>
  );
}
