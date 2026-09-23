'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [activeTab, setActiveTab] = useState(null);

  const toggleTab = (tabName) => {
    setActiveTab(activeTab === tabName ? null : tabName);
  };

  return (
    <footer className="bg-gray-900 text-gray-400 text-xs py-8 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 상단 링클 및 약관 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-white text-sm">hsinside</span>
            <button
              onClick={() => toggleTab('terms')}
              className={`hover:text-white transition ${
                activeTab === 'terms' ? 'text-blue-400 font-bold' : ''
              }`}
            >
              이용약관
            </button>
            <span className="text-gray-700">|</span>
            <button
              onClick={() => toggleTab('privacy')}
              className={`hover:text-white transition ${
                activeTab === 'privacy' ? 'text-blue-400 font-bold' : ''
              }`}
            >
              개인정보 처리방침
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link className="hover:text-gray-200 transition" href="/admin">
              관리자 로그인
            </Link>
          </div>
        </div>

        {/* 약관 토글 펼침 영역 */}
        {activeTab && (
          <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700 text-gray-300 space-y-2 leading-relaxed">
            {activeTab === 'terms' && (
              <div>
                <h4 className="font-bold text-white mb-2">[hsinside 서비스 이용약관]</h4>
                <p>1. 본 서비스는 커뮤니티 정보 공유를 목적으로 제공됩니다.</p>
                <p>2. 타인을 비방하거나 부적절한 게시물은 사전 통보 없이 삭제될 수 있습니다.</p>
              </div>
            )}
            {activeTab === 'privacy' && (
              <div>
                <h4 className="font-bold text-white mb-2">[개인정보 처리방침]</h4>
                <p>1. 수집 항목: 이름(닉네임), 이메일, 암호화된 비밀번호</p>
                <p>2. 수집 목적: 회원 가입 식별 및 서비스 이용</p>
                <p>3. 보유 기간: 회원 탈퇴 시 즉시 파기</p>
                <p>4. 개인정보 보호책임자: hsinside 관리자 [임준서] (treetowood@naver.com)</p>
              </div>
            )}
          </div>
        )}

        {/* 하단 카피라이트 및 푸터 정보 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-500 text-[11px]">
          <p>© {new Date().getFullYear()} hsinside. All rights reserved.</p>
          <p>문의: treetowood@naver.com</p>
        </div>

      </div>
    </footer>
  );
}
