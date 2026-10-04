import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GalleryRequestListPage() {
  // gallery_id가 'request'인 신청 게시글 목록만 최신순 조회
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, author_name, author_email, created_at, slug, file_url')
    .eq('gallery_id', 'request')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 갤러리 상단 헤더 */}
      <div className="flex items-center justify-between border-b pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
          >
            ← 메인으로
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              📢 갤러리 신청하는 곳
            </h1>
            <p className="text-gray-400 mt-0.5 text-[11px]">
              새로운 갤러리 개설 신청 내역을 확인하거나 직접 개설을 신청할 수 있습니다.
            </p>
          </div>
        </div>
        <Link
          href="/gallery/request/write"
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md shadow-amber-500/20 text-xs shrink-0"
        >
          ✍️ 갤러리 신청하기
        </Link>
      </div>

      {/* 에러 발생 시 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl font-semibold">
          신청 내역을 불러오는 중 오류가 발생했습니다: {error.message}
        </div>
      )}

      {/* 신청 게시글 목록 (제목 / 작성자 / 날짜시간만 표시, #n 번호 없음) */}
      {!error && posts && posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-medium">
          아직 신청된 갤러리가 없습니다. 첫 번째로 갤러리를 신청해 보세요!
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-2xl">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-12 bg-gray-50/80 px-4 py-3 font-bold text-gray-500 border-b border-gray-100 text-[11px]">
            <div className="col-span-7 sm:col-span-8">신청 제목</div>
            <div className="col-span-3 sm:col-span-2 text-center">신청자</div>
            <div className="col-span-2 text-right">신청일시</div>
          </div>

          {/* 게시글 행 목록 */}
          <div className="divide-y divide-gray-100">
            {posts?.map((post) => {
              const postLink = `/gallery/request/${post.slug || post.id}`;
              const formattedDate = new Date(post.created_at).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              return (
                <div
                  key={post.id}
                  className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-amber-50/30 transition text-gray-800"
                >
                  {/* 제목 */}
                  <div className="col-span-7 sm:col-span-8 font-medium truncate pr-2">
                    <Link
                      href={postLink}
                      className="hover:text-amber-600 hover:underline transition font-semibold"
                    >
                      {post.title}
                    </Link>
                    {post.file_url && (
                      <span className="ml-1.5 text-[10px] text-gray-400" title="첨부파일 있음">
                        📎
                      </span>
                    )}
                  </div>

                  {/* 작성자 */}
                  <div className="col-span-3 sm:col-span-2 text-center text-gray-600 truncate font-medium text-[11px]">
                    {post.author_name || post.author_email?.split('@')[0] || '익명'}
                  </div>

                  {/* 날짜 / 시간 */}
                  <div className="col-span-2 text-right text-gray-400 text-[10px]">
                    {formattedDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
