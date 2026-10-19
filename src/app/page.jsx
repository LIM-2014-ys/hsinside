'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import UserSearch from '@/components/UserSearch';

export default function HomePage() {
  const [popularPosts, setPopularPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 원래 구성된 갤러리 목록
  const galleries = [
    { id: 'free', name: '자유 갤러리', icon: '💬', desc: '자유로운 이야기를 나누는 공간' },
    { id: 'humor', name: '유머 갤러리', icon: '😆', desc: '유머 및 재미있는 이슈 모음' },
    { id: 'qna', name: '질문 갤러리', icon: '❓', desc: '궁금한 점을 서로 묻고 답하는 곳' },
    { id: 'tech', name: 'IT/개발 갤러리', icon: '💻', desc: '코딩, 프로그래밍, 신기술 정보' },
  ];

  // 3일 내 올라온 댓글 순 인기 게시글 조회
  useEffect(() => {
    const fetchPopularPosts = async () => {
      setLoading(true);
      try {
        // 현재 시간 기준 3일 전 ISO 날짜 계산
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        // 3일 내 생성된 게시글을 댓글 수(comment_count) 및 작성일 순으로 정렬
        let { data, error } = await supabase
          .from('posts')
          .select('*')
          .gte('created_at', threeDaysAgo)
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        // 만약 3일 내 작성된 글이 적거나 comment_count 정렬 예외 시 최근 글 보완
        if (error || !data || data.length === 0) {
          const fallbackQuery = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          data = fallbackQuery.data || [];
        }

        setPopularPosts(data);
      } catch (err) {
        console.error('인기글 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularPosts();
  }, []);

  return (
    <main className="max-w-3xl mx-auto my-6 px-4 font-sans text-xs space-y-6">
      {/* 🏠 메인 히어로 헤더 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white text-center space-y-2 shadow-lg shadow-emerald-500/10">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">hsinside</h1>
        <p className="text-emerald-100 text-xs font-medium">
          소통하고 공유하는 유저 중심 커뮤니티
        </p>
      </div>

      {/* 🔍 유저 닉네임 검색 */}
      <section className="space-y-1.5">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">👥 유저 찾기</h2>
        <UserSearch />
      </section>

      {/* 📌 갤러리 목록 */}
      <section className="space-y-2">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">📌 갤러리</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {galleries.map((gallery) => (
            <Link
              key={gallery.id}
              href={`/gallery/${gallery.id}`}
              className="bg-white border border-gray-100 rounded-2xl p-3.5 hover:border-emerald-300 hover:shadow-xs transition group block space-y-1"
            >
              <div className="text-xl mb-1">{gallery.icon}</div>
              <div className="font-bold text-gray-900 group-hover:text-emerald-600 transition text-xs">
                {gallery.name}
              </div>
              <div className="text-[10px] text-gray-400 line-clamp-1">
                {gallery.desc}
              </div>
            </Link>
          ))}
        </div>
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
          <Link
            href="/gallery/free"
            className="text-[11px] font-bold text-emerald-600 hover:underline"
          >
            전체보기 →
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400 font-bold">
            인기 게시글을 불러오는 중입니다...
          </div>
        ) : popularPosts.length === 0 ? (
          <div className="py-10 text-center text-gray-400 font-medium">
            최근 3일 간 등록된 인기 게시글이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {popularPosts.map((post) => (
              <Link
                key={post.id}
                href={`/gallery/${post.gallery_id || 'free'}/${post.id}`}
                className="py-3 flex items-center justify-between gap-3 group block hover:bg-gray-50/60 -mx-2 px-2 rounded-xl transition"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-md text-[9.5px]">
                      {post.gallery_id || '자유'}
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
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
