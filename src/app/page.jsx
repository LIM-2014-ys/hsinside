import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import InstallPrompt from '@/components/InstallPrompt';
import NotificationPrompt from '@/components/NotificationPrompt';
import UserSearch from '@/components/UserSearch'; // 👈 유저 검색 컴포넌트 추가

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // 1. 갤러리 목록 서버 사이드 조회
  const { data: galleries, error: galleriesError } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: true });

  // 2. 3일 내 인기 게시글 (댓글 많은 순) 서버 사이드 조회
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  let { data: popularPosts } = await supabase
    .from('posts')
    .select('*, galleries(name, slug)')
    .gte('created_at', threeDaysAgo)
    .order('comment_count', { ascending: false })
    .제공해주신 기존 파일 구조(서버 컴포넌트, `galleries` DB 조회, `InstallPrompt`, `NotificationPrompt` 등)를 **100% 그대로 유지**하면서, 요청하신 **유저 검색 기능**과 **3일 내 댓글 많은 순 인기글** 섹션을 자연스럽게 통합한 전체 코드입니다.

---

### `src/app/page.jsx` (전체 복사용 코드)

```jsx
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import InstallPrompt from '@/components/InstallPrompt';
import NotificationPrompt from '@/components/NotificationPrompt';
import UserSearch from '@/components/UserSearch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // 1. 기존 DB 갤러리 목록 조회
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: true });

  // 2. 최근 3일 내 등록된 댓글 많은 순 인기글 조회
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  
  let { data: popularPosts } = await supabase
    .from('posts')
    .select('*, galleries(name, slug)')
    .gte('created_at', threeDaysAgo)
    .order('comment_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10);

  // 3일 내 글이 없거나 부족할 경우 최근 글 폴백
  if (!popularPosts || popularPosts.length === 0) {
    const { data: fallbackPosts } = await supabase
      .from('posts')
      .select('*, galleries(name, slug)')
      .order('created_at', { ascending: false })
      .limit(10);
    popularPosts = fallbackPosts || [];
  }

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
        <Link className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md shadow-amber-500/20 text-xs flex items-center gap-1.5" href="/gallery-request">
          📢 갤러리 신청하기
        </Link>
      </div>

      {/* 📱 PWA 앱 설치 배너 */}
      <InstallPrompt/>

      {/* 🔔 접속할 때마다 동의 안 되었으면 노출되는 알림 권한 배너 */}
      <NotificationPrompt/>

      {/* 🔍 유저 닉네임 실시간 검색 */}
      <section className="space-y-2">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">👥 유저 찾기</h2>
        <UserSearch/>
      </section>

      {/* 📌 DB 갤러리 목록 (기존 디자인 및 원본 로직 100% 유지) */}
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
                <Link ${ 'border-amber-200 'border-gray-100 : ? bg-amber-50/40 bg-gray-50/50 border className="{`group" flex flex-col hover:bg-amber-100/50' hover:bg-blue-50/50 hover:border-blue-200' hover:shadow-md href="{`/gallery/${gallerySlug}`}" isRequest justify-between key="{gallery.id}" p-5 rounded-2xl shadow-sm space-y-3 transition-all }`}>
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

      {/* 🔥 3일 내 인기 게시글 (댓글 많은 순) */}
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
                <Link className="py-3 flex items-center justify-between gap-3 group block hover:bg-white -mx-2 px-3 rounded-xl transition" href="{`/gallery/${gallerySlug}/${post.id}`}" key="{post.id}">
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

                  {/* 댓글 수 표시 */}
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
