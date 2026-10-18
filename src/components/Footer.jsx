'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | 'rules' | 'disclaimer' | null

  const closeModal = () => setActiveModal(null);

  return (
    <footer className="bg-white border-t border-gray-100 py-8 px-4 mt-auto font-sans text-xs text-gray-500">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 상단: 브랜드명 & 링크 모음 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-black text-blue-600 text-base">HSinside</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              자유롭고 건강한 소통을 지향하는 커뮤니티 갤러리 플랫폼
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition">
              홈으로
            </Link>
            <span>·</span>
            <Link href="/gallery-request" className="hover:text-blue-600 transition">
              갤러리 신청
            </Link>
          </div>
        </div>

        {/* 중단: 방침 모음 링크 바 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 border-t border-gray-100 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveModal('terms')}
            className="text-gray-600 hover:text-gray-900 transition font-medium"
          >
            이용약관
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setActiveModal('privacy')}
            className="text-gray-900 font-extrabold hover:text-blue-600 transition underline underline-offset-2"
          >
            개인정보 처리방침
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setActiveModal('rules')}
            className="text-gray-600 hover:text-gray-900 transition font-medium"
          >
            커뮤니티 가이드라인
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setActiveModal('disclaimer')}
            className="text-gray-600 hover:text-gray-900 transition font-medium"
          >
            책임의 한계와 고지
          </button>
        </div>

        {/* 하단: 카피라이트 및 안내 */}
        <div className="text-[10px] text-gray-400 space-y-1 pt-1">
          <p>
            HSinside 상의 게시물 및 댓글의 저작권과 모든 법적 책임은 해당 작성자 본인에게 있습니다.
          </p>
          <p>© 2026 HSinside. All rights reserved.</p>
        </div>
      </div>

      {/* ==================== 방침 통합 안내 모달 ==================== */}
      {activeModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={closeModal}
        >
          <div
            className="bg-white text-gray-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                {activeModal === 'terms' && '📜 서비스 이용약관 전문'}
                {activeModal === 'privacy' && '🔒 개인정보 처리방침 전문'}
                {activeModal === 'rules' && '🛡️ 커뮤니티 가이드라인'}
                {activeModal === 'disclaimer' && '⚠️ 책임의 한계와 고지'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 (스크롤) */}
            <div className="p-6 overflow-y-auto text-xs leading-relaxed space-y-4 text-gray-600 select-text">
              {/* 1. 서비스 이용약관 (회원가입 전문과 100% 일치) */}
              {activeModal === 'terms' && (
                <div className="space-y-3">
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 1 조 (목적)</h4>
                    <p>본 약관은 hsinside(이하 "회사"라 함)가 제공하는 커뮤니티 서비스, 게시판, 미디어 플랫폼 및 이에 부수하는 제반 서비스(이하 "서비스"라 함)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 2 조 (용어의 정의)</h4>
                    <p>1. "서비스"라 함은 접속 단말기(PC, 모바일 기기 등)의 종류와 상관없이 회원이 이용할 수 있는 hsinside 내 제반 커뮤니티 기능을 의미합니다.</p>
                    <p>2. "회원"이라 함은 본 약관에 동의하고 가입 절차를 완료하여 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</p>
                    <p>3. "게시물"이라 함은 회원이 서비스 상에 게시한 문자, 이미지, 음성, 영상, 첨부파일, 댓글 및 각종 링크 일체를 말합니다.</p>
                    <p>4. "닉네임"이라 함은 회원의 식별과 서비스 이용을 위하여 회원이 선정하고 회사가 승인하는 문자 및 숫자의 조합을 의미합니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 3 조 (약관의 게시와 개정)</h4>
                    <p>1. 회사는 본 약관의 내용을 회원이 용이하게 알 수 있도록 서비스 가입 화면 및 설정 페이지에 게시합니다.</p>
                    <p>2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 사유를 명시하여 최소 7일 전부터 공지합니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 4 조 (이용계약의 체결 및 회원가입)</h4>
                    <p>1. 이용계약은 가입신청자가 약관 내용에 동의 후 회원가입신청을 하고 회사가 이를 승낙함으로써 체결됩니다.</p>
                    <p>2. 타인의 정보 도용, 허위 정보 기재, 부정한 용도 이용 등의 사유가 있는 경우 승낙하지 않거나 사후에 해지할 수 있습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 5 조 (회원의 의무 및 금지행위)</h4>
                    <p>회원은 다음 행위를 하여서는 안 되며, 적발 시 즉시 서비스 이용 차단 및 게시물이 삭제될 수 있습니다:</p>
                    <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5 text-gray-500">
                      <li>인신공격, 모욕, 비방 게시글 등록</li>
                      <li>불법 음란물, 사기성 광고, 악성코드 배포</li>
                      <li>매크로를 이용한 도배 및 자동화 접속</li>
                      <li>타인의 개인정보 무단 수집·공개</li>
                      <li>지적재산권 침해 행위</li>
                    </ul>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 6 조 (게시물의 권리 및 게시물 관리)</h4>
                    <p>1. 회원이 작성한 게시물의 저작권은 작성자 본인에게 귀속됩니다.</p>
                    <p>2. 위법 또는 권리침해 게시물은 권리자 요청 또는 회사 정책에 따라 임시조치, 블러 처리 또는 임의 삭제될 수 있습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 7 조 (서비스 이용제한 및 영구정지)</h4>
                    <p>회원은 약관 위반 시 주의, 경고, 일시정지, 영구정지 등의 단계적 이용제한을 받을 수 있습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 8 조 (손해배상 및 면책조항)</h4>
                    <p>천재지변, 불가항력, 회원의 귀책사유로 인한 장애 및 회원이 게재한 정보의 신뢰도에 관해 회사는 책임을 지지 않습니다.</p>
                  </section>
                </div>
              )}

              {/* 2. 개인정보 처리방침 (수집/이용 및 국외이전 전문) */}
              {activeModal === 'privacy' && (
                <div className="space-y-3">
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">1. 개인정보 수집 항목 및 방법</h4>
                    <p>- 필수 수집 항목: 이메일 주소, 비밀번호(암호화 해시 보관), 닉네임</p>
                    <p>- 자동 수집 항목: IP 주소, 쿠키(Cookie), 이용 기록, 기기 식별자, 접속 로그, RLS 식별자(UUID)</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">2. 개인정보의 수집 및 이용 목적</h4>
                    <p>- 회원 관리 (본인확인, 부정이용 방지, 민원처리)</p>
                    <p>- 커뮤니티 서비스 제공 (게시글/댓글 작성, 알림 수신 동의 처리)</p>
                    <p>- 서비스 개발 및 통계 분석</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">3. 개인정보 보유 및 이용기간</h4>
                    <p>- 부정이용기록: 1년 (부정이용 방지 및 명예훼손 대응)</p>
                    <p>- 서비스 접속 기록 (통신비밀보호법): 3개월</p>
                    <p>- 회원 탈퇴 시 지체 없이 파기</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">4. 개인정보 국외 이전 및 처리위탁</h4>
                    <p>hsinside는 글로벌 클라우드 인프라 운용을 위해 아래와 같이 개인정보 처리를 위탁/이전합니다:</p>
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] space-y-1">
                      <p>• 이전 대상: Supabase Inc. (미국 AWS Cloud Infrastructure)</p>
                      <p>• 이전 항목: 이메일, 닉네임, 암호화 비밀번호, 계정 ID(UUID), 서비스 이용기록, 업로드 파일</p>
                      <p>• 이전 방법: 회원가입 시 TLS/SSL 암호화 보안 전송</p>
                    </div>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">5. 동의 거부권 안내</h4>
                    <p>이용자는 개인정보 수집 및 국외 이전 동의를 거부할 권리가 있으나, 거부 시 회원가입 및 서비스 이용이 제한됩니다.</p>
                  </section>
                </div>
              )}

              {/* 3. 커뮤니티 가이드라인 */}
              {activeModal === 'rules' && (
                <div className="space-y-2">
                  <p className="font-bold text-gray-900 text-xs">🤝 클린 커뮤니티 준수 사항 (제5조 기반)</p>
                  <ul className="space-y-2 text-[11px] text-gray-600 font-medium">
                    <li className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">1. 상호 존중 및 비방 금지</strong>
                      인신공격, 모욕, 혐오 표현 및 타인을 비방하는 게시글과 댓글은 즉시 제재됩니다.
                    </li>
                    <li className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">2. 불법/유해물 게시 제한</strong>
                      음란물, 사기성 광고, 악성 프로그램 공유, 저작권 침해 자료 배포를 금지합니다.
                    </li>
                    <li className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">3. 매크로 및 도배 방지</strong>
                      자동화 프로그램을 이용한 도배 및 정상적인 게시판 이용을 방해하는 행위는 계정 영구 정지 사유가 됩니다.
                    </li>
                  </ul>
                </div>
              )}

              {/* 4. 책임의 한계와 고지 (상세 고지) */}
              {activeModal === 'disclaimer' && (
                <div className="space-y-3">
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 1 조 (게시물 법적 책임의 귀속)</h4>
                    <p>HSinside는 이용자가 게재한 게시물의 신뢰도, 정확성, 적법성에 대해 보증하지 않으며, 모든 게시물의 저작권과 민·형사상 법적 책임은 해당 작성자 본인에게 있습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 2 조 (손해배상 및 법적 면책)</h4>
                    <p>회사는 이용자가 플랫폼 내 게시글 정보를 신뢰함으로 인해 발생한 직·간접적 손해, 정신적 피해에 대하여 손해배상 책임을 지지 않습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 3 조 (이용자 간 분쟁 면책)</h4>
                    <p>플랫폼을 매개로 이용자 상호 간 또는 제3자 간 발생한 분쟁(개인정보 유출, 명예훼손, 금전 거래 등)에 회사는 개입하지 않으며 책임을 부담하지 않습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 4 조 (서비스 제공의 중단)</h4>
                    <p>천재지변, 서버 점검, 기술적 장애 등 불가항력 사유로 인한 서비스 일시 중단 시 회사는 책임을 면합니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 5 조 (외부 링크 고지)</h4>
                    <p>게시물에 포함된 외부 웹사이트 링크 및 제3자 서비스 이용에 관하여 회사는 통제권이 없으며 어떠한 책임도 지지 않습니다.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs border-b pb-1">제 6 조 (관리자 임의 조치)</h4>
                    <p>관련 법령 및 가이드라인을 위반한 게시물은 사전 통지 없이 임의 삭제, 블러 처리 또는 계정 이용제한 조치가 취해질 수 있습니다.</p>
                  </section>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-100 text-right bg-gray-50/50">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
