'use client';

import { useState } from 'react';

export default function Footer() {
  const [modalContent, setModalContent] = useState(null); // 'terms' | 'privacy' | null

  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-3 text-xs">
        <div className="flex justify-center space-x-6 font-medium">
          <button
            onClick={() => setModalContent('terms')}
            className="hover:text-white transition underline"
          >
            이용약관
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={() => setModalContent('privacy')}
            className="hover:text-white font-bold text-gray-300 transition underline"
          >
            개인정보 처리방침
          </button>
        </div>

        <p className="text-gray-500">
          © {new Date().getFullYear()} hsinside Community. All rights reserved.
        </p>
      </div>

      {/* 약관 및 개인정보 처리방침 커스텀 모달 */}
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <h3 className="text-base font-bold border-b pb-2">
              {modalContent === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}
            </h3>

            <div className="overflow-y-auto text-xs leading-relaxed text-gray-600 bg-gray-50 p-4 rounded border whitespace-pre-line flex-1">
              {modalContent === 'terms' ? (
                `[hsinside 서비스 이용약관]

제1조 (목적)
본 약관은 hsinside 커뮤니티가 제공하는 익명/회원 커뮤니티 서비스의 이용조건 및 절차를 규정합니다.

제2조 (게시물 및 회원의 의무)
1. 타인을 비방하거나 명예를 훼손하는 게시글, 음란성 콘텐츠는 사전 경고 없이 삭제될 수 있습니다.
2. 부정한 방법으로 시스템을 공격하거나 타인의 계정을 도용할 경우 법적 책임을 물을 수 있습니다.`
              ) : (
                `[개인정보 처리방침]

1. 개인정보 수집 및 이용 목적
- 회원 식별, 서비스 운영 및 게시글 작성자 관리.

2. 수집 항목
- 필수: 이름(닉네임), 이메일, 암호화된 비밀번호(Bcrypt)
- 자동 수집: IP 주소, 접속 로그

3. 보유 및 이용 기간
- 회원 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 법정 기간 동안 보관됩니다.

4. 개인정보 보호책임자
- 담당: hsinside 관리자 (admin@hsinside.com)`
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalContent(null)}
                className="px-4 py-2 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
