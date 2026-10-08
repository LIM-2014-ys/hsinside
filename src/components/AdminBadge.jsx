'use client';

import { isAdminEmail } from '@/lib/admin';

export default function AdminBadge({ email }) {
  if (!isAdminEmail(email)) return null;

  return (
    <span className="relative inline-flex items-center ml-1 group cursor-pointer align-middle">
      {/* 파란색 인증 체크 아이콘 */}
      <svg
        className="w-4 h-4 text-blue-500 fill-current"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>

      {/* 마우스 호버 시 뜨는 툴팁 */}
      <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-50 pointer-events-none">
        <span className="bg-gray-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-xl border border-gray-700">
          🛡️ hsinside 공식 관리자
        </span>
        <span className="w-2 h-2 -mt-1 bg-gray-900 rotate-45 border-r border-b border-gray-700"></span>
      </span>
    </span>
  );
}
