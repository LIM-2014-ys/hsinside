import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import InstallPrompt from '@/components/InstallPrompt';
import NotificationPrompt from '@/components/NotificationPrompt';
import UserSearch from '@/components/UserSearch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // 1. DB 갤러리 목록 조회
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: true });

  // 2. 최근 3일 내 댓글 많은 순 인기글 조회
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  let { data: popularPosts } = await supabase
    .from('posts')
    .select('*, galleries(name, slug)')
    .gte('created_at', threeDaysAgo)
    .order('comment_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10);

  if (!popularPosts || popularPosts.length === 0) {
    const { data: fallbackPosts } = await supabase
      .from('posts')
      .select('*, galleries(name, slug)')
      .order('created_at', { ascending: false })
      .limit(10);
    popularPosts = fallbackPosts || [];
  }

  return (
    <div className="max-w-4xl mx-auto my-6 sm:my-10 p-4 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-xl space-y-8 font-sans text-xs">
      
      {/* 🚀 세련된 헤더 히어로 박스 */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* 배경은은한 은하수/광원 효과 */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[10px] font-bold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              COMMUNITY HUB
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              🏛️ <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-emerald-200 to-white">hsinside</span>
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-md">
              원하는 갤러리를 선택하여 이야기를 나누고 소통을 시작해 보세요.
            </p>
          </div>

          <Link
            href="/gallery-request"
            className="self-start sm:self-center px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-xs flex items-center gap-2 shrink-0 active:scale-95"
          >
            <span>📢</span>
            <span>갤러리 신청하기</span>
          </Link>
        </div>
      </div>

      {/* PWA 설치 배너 */}
      <InstallPrompt />

      {/* 알림 권한 배너 */}
      <NotificationPrompt />

      {/* 유저 닉네임 검색 */}
      <section className="space-y-2">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">👥 유저 찾기</h2>
        <UserSearch />
      </section>

      {/* 갤러리 목록 */}
      <section className="space-y-3">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">📌 갤러리 목록</h2>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl font-semibold">
            갤러리 목록을 불러오는 중 오류가 발생했습니다: {error.message}
          </div>
        )}

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
      </section>

      {/* 3일 내 인기 게시글 (댓글 많은 순) */}
      <section className="bg-gray-50/60 border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
              🔥 3일 내 인기글
            </h2>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
              댓글 많은 순
            </span>
          </div>
        </div>

        {popularPosts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-medium">
            최근 3일 간 등록된 인기 게시글이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200/60">
            {popularPosts.map((post) => {
              const gallerySlug = post.galleries?.slug || post.gallery_id || 'free';
              const galleryName = post.galleries?.name || '갤러리';

              return (
                <Link
                  key={post.id}
                  href={`/gallery/${gallerySlug}/${post.id}`}
                  className="py-3 flex items-center justify-between gap-3 group block hover:bg-white -mx-2 px-3 rounded-xl transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100/70 text-emerald-800 font-extrabold rounded-md text-[9.5px] shrink-0">
                        {galleryName}
                      </span>
                      <h3 className="font-bold text-gray-800 text-xs truncate group-hover:text-emerald-600 transition">
                        {post.title}
                      </h3>
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-2">
                      <span>✍️ {post.author_name || '익명'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-gray-200 px-2.5 py-1 rounded-xl shrink-0 group-hover:border-emerald-300 transition shadow-2xs">
                    <span className="text-[10px]">💬</span>
                    <span className="font-black text-xs text-gray-700 group-hover:text-emerald-600">
                      {post.comment_count || 0}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
