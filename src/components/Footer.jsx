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
            className="bg-white text-gray-800 rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden font-sans border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                {activeModal === 'terms' && '📜 이용약관'}
                {activeModal === 'privacy' && '🔒 개인정보 처리방침'}
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
            <div className="p-6 overflow-y-auto text-xs leading-relaxed space-y-4 text-gray-600">
              {/* 1. 이용약관 */}
              {activeModal === 'terms' && (
                <>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">제 1 조 (목적)</h4>
                    <p>본 약관은 HSinside(이하 "회사")가 제공하는 모든 서비스 이용에 관한 조건 및 절차, 회원과 회사 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                  </section>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">제 2 조 (회원의 의무 및 게시물 관리)</h4>
                    <p>1. 회원은 타인의 명예를 훼손하거나 불법적인 정보를 등록해서는 안 됩니다.</p>
                    <p>2. 음란물, 사기, 욕설, 차별적 언사 등 커뮤니티 저해 게시물은 사전 통보 없이 관리자에 의해 삭제되거나 이용 제한될 수 있습니다.</p>
                  </section>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">제 3 조 (서비스의 변경 및 중단)</h4>
                    <p>회사는 시스템 점검, 교체 및 고장, 통신두절 등의 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
                  </section>
                </>
              )}

              {/* 2. 개인정보 처리방침 */}
              {activeModal === 'privacy' && (
                <>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">1. 수집하는 개인정보 항목</h4>
                    <p>HSinside는 회원가입, 서비스 이용 및 상담을 위해 아래와 같은 개인정보를 수집합니다.</p>
                    <ul className="list-disc list-inside text-[11px] pl-1 text-gray-500">
                      <li>필수 항목: 이메일 주소, 비밀번호, 닉네임</li>
                      <li>자동 수집 항목: 접속 IP 정보, 쿠키, 서비스 이용 기록</li>
                    </ul>
                  </section>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">2. 개인정보의 수집 및 이용 목적</h4>
                    <p>수집한 개인정보는 회원 관리, 서비스 제공, 게시글/댓글 멘션 및 푸시 알림 수신 동의 처리 목적 등으로만 활용됩니다.</p>
                  </section>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">3. 개인정보의 보유 및 파기</h4>
                    <p>회원 탈퇴 요청 시 수집된 개인정보는 지체 없이 파기합니다. 단, 관계법령 규정에 의하여 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.</p>
                  </section>
                </>
              )}

              {/* 3. 커뮤니티 가이드라인 */}
              {activeModal === 'rules' && (
                <>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">🤝 건강한 커뮤니티를 위한 준수 사항</h4>
                    <p>모든 회원이 즐겁고 안전하게 소통할 수 있도록 아래 수칙을 반드시 준수해 주세요.</p>
                  </section>
                  <ul className="space-y-2 text-[11px] text-gray-600 font-medium">
                    <li className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">1. 상호 존중 및 멘션 예절</strong>
                      댓글 및 @멘션 기능을 사용할 때 타인에게 불쾌감을 주는 비방이나 언어폭력을 자제해 주세요.
                    </li>
                    <li className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">2. 불법/유해 정보 게시 금지</strong>
                      저작권 침해 자료, 불법 정보, 개인정보 유출, 성인물 게시글은 즉시 제재됩니다.
                    </li>
                    <li className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">3. 갤러리 목적에 알맞은 소통</strong>
                      개설된 각 갤러리의 주제에 맞는 건설적인 게시글 작성을 권장합니다.
                    </li>
                  </ul>
                </>
              )}

              {/* 4. 책임의 한계와 고지 */}
              {activeModal === 'disclaimer' && (
                <>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">게시물 책임에 관한 고지</h4>
                    <p>HSinside 내 갤러리에 회원이 게재한 모든 정보, 자료, 사실의 신뢰도 및 정확성에 관하여 회사는 책임을 지지 않습니다.</p>
                  </section>
                  <section className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-xs">법적 책임 소재</h4>
                    <p>회원이 게시한 게시글 및 댓글로 인해 발생하는 민·형사상 법적 책임은 해당 콘텐츠를 작성한 게시자 본인에게 있습니다.</p>
                  </section>
                </>
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
