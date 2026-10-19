'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function MainPage() {
  const [recentPosts, setRecentPosts] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMainData = async () => {
      setLoading(true);
      try {
        // 1. 최신 게시글 (메인 메인 영역)
        const { data: recData } = await supabase
          .from('posts')
          .select('*, profiles:user_id(*)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (recData) setRecentPosts(recData);

        // 2. 실시간 인기글 (하단 섹션 전용)
        const { data: popData } = await supabase
          .from('popular_posts')
          .select('*, profiles:user_id(*)')
          .limit(5);

        if (popData) {
          setPopularPosts(popData);
        } else {
          // 뷰 백업
          const { data: fallbackPop } = await supabase
            .from('posts')
            .select('*')
            .order('views', { ascending: false })
            .limit(5);
          if (fallbackPop) setPopularPosts(fallbackPop);
        }
      } catch (err) {
        console.error('메인 데이터 로드 에러:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMainData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto my-6 px-3 sm:px-4 font-sans text-xs space-y-8">
      {/* 📌 [상단] 기존 메인 영역 (최신 커뮤니티 글 목록) */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h1 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
            📋 최신 게시글
          </h1>
          <Link href="/gallery/default" className="text-emerald-600 font-bold text-[11px]">
            갤러리 바로가기 →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400 font-bold text-xs">로딩 중...</div>
        ) : recentPosts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-medium text-xs">게시글이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentPosts.map((post) => {
              const galleryId = post.gallery_id || 'default';
              const authorName = post.profiles?.display_name || post.author_name || '익명';

              return (
                <Link
                  key={post.id}
                  href={`/gallery/${galleryId}/${post.id}`}
                  className="py-3 flex items-center justify-between gap-2 hover:bg-gray-50 px-2 rounded-xl transition"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-gray-800 text-xs truncate">{post.title}</h2>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {authorName} • {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-[10px] shrink-0 font-medium">
                    <span>👀 {post.views || 0}</span>
                    <span>❤️ {post.likes_count || 0}</span>
                    <span>💬 {post.comments_count || 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔥 [하단] 실시간 인기글 섹션 */}
      <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-200/60 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-amber-200/50 pb-3">
          <h2 className="font-black text-xs text-amber-900 flex items-center gap-1.5">
            🔥 실시간 인기글 TOP 5
          </h2>
          <span className="text-[10px] text-amber-700/80 font-semibold">
            조회수 + 좋아요 + 댓글 가중치 반영
          </span>
        </div>

        {popularPosts.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-xs">집계된 인기글이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {popularPosts.map((post, idx) => {
              const galleryId = post.gallery_id || 'default';
              const authorName = post.profiles?.display_name || post.author_name || '익명';

              return (
                <Link
                  key={post.id}
                  href={`/gallery/${galleryId}/${post.id}`}
                  className="p-3 bg-white hover:bg-amber-100/40 border border-amber-100 rounded-2xl flex items-center justify-between gap-3 transition shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-xs truncate">{post.title}</h3>
                      <p className="text-[9.5px] text-gray-400 mt-0.5">{authorName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-gray-500 text-[10px] font-bold shrink-0">
                    <span className="text-amber-600">👀 {post.views || 0}</span>
                    <span className="text-rose-500">❤️ {post.likes_count || 0}</span>
                    <span className="text-blue-500">💬 {post.comments_count || 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
