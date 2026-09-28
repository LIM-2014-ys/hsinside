import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// ⚡ 캐시를 사용하지 않고 매번 최신 DB 데이터를 강제로 다시 조회하도록 설정
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Supabase에서 게시글 목록을 최신순(created_at 내림차순)으로 불러오기
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">🔥 게시글 목록</h1>
          <p className="text-gray-400 mt-1 text-[11px]">hsinside 커뮤니티의 실시간 게시글입니다.</p>
        </div>
        <Link
          href="/write"
          className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20 text-xs"
        >
          ✏️ 글 작성하기
        </Link>
      </div>

      {/* 에러 발생 시 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-semibold">
          게시글을 불러오는 중 오류가 발생했습니다: {error.message}
        </div>
      )}

      {/* 게시글 목록 */}
      {!error && posts && posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 font-medium">
          등록된 게시글이 없습니다. 첫 번째 글을 작성해 보세요!
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {posts?.map((post) => (
            <div key={post.id} className="py-4 space-y-2 hover:bg-gray-50/50 p-3 rounded-2xl transition">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">{post.title}</h2>
                <span className="text-[10px] text-gray-400">
                  {new Date(post.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {/* 첨부파일이 있는 경우 다운로드 버튼 표시 */}
              {post.file_url && (
                <div className="pt-1">
                  <a
                    href={post.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-[11px] transition"
                  >
                    📎 첨부파일 보기 / 다운로드
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                <span>작성자: <strong className="text-gray-700">{post.author_name || '익명'}</strong></span>
                {post.author_email && <span>({post.author_email})</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
