'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import UserSearch from '@/components/UserSearch';

export default function HomePage() {
  const [galleries, setGalleries] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [loadingGalleries, setLoadingGalleries] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // 1. Supabase DB에서 실제 생성된 갤러리 목록 실시간 로드 (임준서 갤러리 등)
  useEffect(() => {
    const fetchGalleries = async () => {
      setLoadingGalleries(true);
      try {
        const { data, error } = await supabase
          .from('galleries')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) {
          setGalleries(data);
        }
      } catch (err) {
        console.error('갤러리 목록 로드 오류:', err);
      } finally {
        setLoadingGalleries(false);
      }
    };

    fetchGalleries();
  }, []);

  // 2. 최근 3일간 올라온 댓글 많은 순 (인기글) 로드
  useEffect(() => {
    const fetchPopularPosts = async () => {
      setLoadingPosts(true);
      try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        // 3일 내 생성된 게시글을 댓글 수(comment_count) 및 작성일 순 정렬
        let { data, error } = await supabase
          .from('posts')
          .select('*, galleries(name)')
          .gte('created_at', threeDaysAgo)
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        // 3일 내 글이 없거나 오류 시 최근 글 폴백
        if (error || !data || data.length === 0) {
          const fallbackQuery = await supabase
            .from('posts')
            .select('*, galleries(name)')
            .order('created_at', { ascending: false })
            .limit(10);
          data = fallbackQuery.data || [];
        }

        setPopularPosts(data);
      } catch (err) {
        console.error('인기글 로드 오류:', err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPopularPosts();
  }, []);

  return (
    <main className="max-w-3xl mx-auto my-6 px-4 font-sans text-xs space-y-6">
      {/* 🏠 메인 헤더 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white text-center space-y-2 shadow-lg shadow-emerald-500/10">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">hsinside</h1>
        <p className="text-emerald-100 text-xs font-medium">
          소통하고 공유하는 유저 중심 커뮤니티
        </p>
      </div>

      {/* 🔍 유저 닉네임 실시간 검색 */}
      <section className="space-y-1.5">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">👥 유저 찾기</h2>
        <UserSearch />
      </section>

      {/* 📌 DB에서 실시간으로 가져오는 진짜 갤러리 목록 (임준서 갤러리 등) */}
      <section className="space-y-2">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">📌 갤러리 목록</h2>

        {loadingGalleries ? (
          <div className="py-8 text-center text-gray-400 font-bold bg-white rounded-3xl border border-gray-100">
            갤러리 목록을 불러오는 중입니다...
          </div>
        ) : galleries.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-medium bg-white rounded-3xl border border-gray-100">
            등록된 갤러리가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {galleries.map((gallery) => (
              <Link
                key={gallery.id}
                href={`/gallery/${gallery.id}`}
                className="bg-white border border-gray-100 rounded-2xl p-3.5 hover:border-emerald-300 hover:shadow-xs transition group block space-y-1"
              >
                <div className="text-xl mb-1">{gallery.icon || '📌'}</div>
                <div className="font-bold text-gray-900 group-hover:text-emerald-600 transition text-xs truncate">
                  {gallery.name || gallery.title || '갤러리'}
                </div>
                {gallery.description && (
                  <div className="text-[10px] text-gray-400 line-clamp-1">
                    {gallery.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 🔥 3일 내 인기 게시글 (댓글 많은 순) */}
      <section className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
              🔥 3일 내 인기글
            </h2>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
              댓글 많은 순
            </span>
          </div>
          {galleries.length > 0 && (
            <Link
              href={`/gallery/${galleries[0].id}`}
              className="text-[11px] font-bold text-emerald-600 hover:underline"
            >
              전체보기 →
            </Link>
          )}
        </div>

        {loadingPosts ? (
          <div className="py-10 text-center text-gray-400 font-bold">
            인기 게시글을 불러오는 중입니다...
          </div>
        ) : popularPosts.length === 0 ? (
          <div className="py-10 text-center text-gray-400 font-medium">
            최근 3일 간 등록된 인기 게시글이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {popularPosts.map((post) => {
              const galleryName = post.galleries?.name || post.gallery_name || '갤러리';
              const galleryId = post.gallery_id || '1';

              return (
                <Link
                  key={post.id}
                  href={`/gallery/${galleryId}/${post.id}`}
                  className="py-3 flex items-center justify-between gap-3 group block hover:bg-gray-50/60 -mx-2 px-2 rounded-xl transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-md text-[9.5px] shrink-0">
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
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-xl shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition">
                    <span className="text-[10px]">💬</span>
                    <span className="font-black text-xs text-gray-700 group-hover:text-emerald-700">
                      {post.comment_count || 0}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
