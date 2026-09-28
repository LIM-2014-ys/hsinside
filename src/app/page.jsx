import Link from 'next/link';

export const dynamic = 'force-dynamic';

// 서비스에서 제공하는 갤러리 목록 데이터
const GALLERIES = [
  { id: 'free', name: '자유 갤러리', desc: '자유롭게 이야기를 나누는 공간입니다.', icon: '💬' },
  { id: 'question', name: '질문 갤러리', desc: '궁금한 점을 묻고 답변을 받아보세요.', icon: '❓' },
  { id: 'info', name: '정보 갤러리', desc: '유용한 정보와 팁을 공유하세요.', icon: '💡' },
  { id: 'humor', name: '유머 갤러리', desc: '재미있는 이슈와 짤방을 보는 공간입니다.', icon: '🤣' },
];

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-8 font-sans text-xs">
      {/* 메인 헤더 */}
      <div className="border-b pb-5">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          🏛️ hsinside
        </h1>
        <p className="text-gray-400 mt-1 text-xs">
          원하는 갤러리를 선택하여 게시글을 확인하고 글을 작성해 보세요.
        </p>
      </div>

      {/* 갤러리 카드 리스트 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GALLERIES.map((gallery) => (
          <Link
            key={gallery.id}
            href={`/gallery/${gallery.id}`}
            className="group p-5 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-200 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{gallery.icon}</span>
              <span className="text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition">
                입장하기 →
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition">
                {gallery.name}
              </h2>
              <p className="text-gray-400 text-[11px] mt-1">{gallery.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
