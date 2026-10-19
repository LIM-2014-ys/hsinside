'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import UserSearch from '@/components/UserSearch';

export default function HomePage() {
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 갤러리 카테고리 정의
  const galleries = [
    { id: 'free', name: '자유 갤러리', icon: '💬', desc: '자유로운 이야기를 나누는 공간' },
    { id: 'tech', name: 'IT/개발 갤러리', icon: '💻', desc: '코딩, 프로그래밍, 신기술 정보' },
    { id: 'humor', name: '유머 갤러리', icon: '😆', desc: '유머 및 재미있는 이슈 모음' },
    { id: 'qna', name: '질문 갤러리', icon: '❓', desc: '궁금한 점을 서로 묻고 답하는 곳' },
  ];

  // 최신 게시글 로드
  useEffect(() => {
    const fetchRecentPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          setRecentPosts(data);
        }
      } catch (err) {
        console.error('최신글 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
  }, []);

  return (
    <main className="max-w-3xl mx-auto my-6 px-4 font-sans text-xs space-y-6">
      {/* 🏠 메인 헤더 히어로 섹션 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white text-center space-y-2 shadow-lg shadow-emerald-500/10">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">hsinside</h1>
        <p className="text-emerald-100 text-xs font-medium">
          소통하고 공유하는 유저 중심 커뮤니티
        </p>
      </div>

      {/* 🔍 유저 닉네임 실시간 검색 컴포넌트 */}
      <section className="space-y-1.5">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">👥 유저 찾기</h2>
        <UserSearch />
      </section>

      {/* 📌 주요 갤러리 바로가기 */}
      <section className="space-y-2">
        <h2 className="font-extrabold text-gray-700 text-xs px-1">📌 주요 갤러리</h2>
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

      {/* 🔥 최신 전체 게시글 목록 */}
      <section className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
            🔥 실시간 최신글
          </h2>
          <Link
            href="/gallery/free"
            className="text-[11px] font-bold text-emerald-600 hover:underline"
          >
            전체보기 →
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400 font-bold">
            게시글을 불러오는 중입니다...
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="py-10 text-center text-gray-400 font-medium">
            작성된 게시글이 없습니다. 첫 글을 등록해 보세요!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentPosts.map((post) => (
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

                <span className="text-[10px] font-bold text-gray-300 group-hover:text-emerald-600 shrink-0">
                  보기 →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
