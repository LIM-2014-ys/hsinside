import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // DB의 galleries 테이블에서 등록된 갤러리 목록 조회
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-8 font-sans text-xs">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            🏛️ hsinside
          </h1>
          <p className="text-gray-400 mt-1 text-xs">
            원하는 갤러리를 선택하여 게시글을 확인하고 작성해 보세요.
          </p>
        </div>
        {/* 갤러리 신청 버튼 (/gallery-request 로 수정) */}
        <Link
          href="/gallery-request"
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md shadow-amber-500/20 text-xs flex items-center gap-1.5"
        >
          📢 갤러리 신청하기
        </Link>
      </div>

      {/* DB 조회 에러 처리 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl font-semibold">
          갤러리 목록을 불러오는 중 오류가 발생했습니다: {error.message}
        </div>
      )}

      {/* DB 갤러리 목록 출력 */}
      {!error && galleries && galleries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-medium">
          등록된 갤러리가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {galleries?.map((gallery) => {
            const gallerySlug = gallery.slug || gallery.id;
            const isRequest = gallerySlug === 'request';

            return (
              <Link
                key={gallery.id}
                href={`/gallery/${gallerySlug}`}
                className={`group p-5 border rounded-2xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-3 ${
                  isRequest
                    ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-100/50'
                    : 'border-gray-100 bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${isRequest ? 'text-amber-800' : 'text-gray-900'}`}>
                    {gallery.name || gallery.title}
                  </span>
                  <span
                    className={`text-[11px] font-bold opacity-0 group-hover:opacity-100 transition ${
                      isRequest ? 'text-amber-600' : 'text-blue-600'
                    }`}
                  >
                    입장하기 →
                  </span>
                </div>
                {gallery.description && (
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    {gallery.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
