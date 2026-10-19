'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('popular'); // 'popular' | 'recent'
  const [popularPosts, setPopularPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 유저 인증 확인
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // 인기글 및 최신글 데이터 로드
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // 1. 인기글 가져오기 (앞서 만든 popular_posts 뷰 활용)
        const { data: popData, error: popErr } = await supabase
          .from('popular_posts')
          .select('*, profiles:user_id(*)')
          .limit(10);

        if (!popErr && popData) {
          setPopularPosts(popData);
        } else {
          // 뷰가 아직 안 만들어졌을 경우를 대비한 안전 필터 (최신순 + 조회수/좋아요 정렬)
          const { data: fallbackPop } = await supabase
            .from('posts')
            .select('*, profiles:user_id(*)')
            .order('views', { ascending: false })
            .limit(10);
          if (fallbackPop) setPopularPosts(fallbackPop);
        }

        // 2. 최신글 가져오기
        const { data: recData, error: recErr } = await supabase
          .from('posts')
          .select('*, profiles:user_id(*)')
          .order('created_at', { ascending: false })
          .limit(15);

        if (!recErr && recData) {
          setRecentPosts(recData);
        }
      } catch (err) {
        console.error('메인 게시글 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const displayedPosts = activeTab === 'popular' ? popularPosts : recentPosts;

  return (
    <div className="max-w-5xl mx-auto my-4 sm:my-8 px-3 sm:px-4 font-sans text-xs space-y-6">
      {/* 🌟 상단 대문 / 환영 배너 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-lg sm:text-xl font-black">🚀 Next.js 커뮤니티 플랫폼</h1>
          <p className="text-emerald-100 text-xs sm:text-sm font-medium">
            실시간 채팅(DM)과 생동감 넘치는 갤러리 소통 공간에 오신 것을 환영합니다!
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dm"
            className="px-4 py-2.5 bg-white text-emerald-800 font-bold rounded-2xl text-xs shadow hover:bg-emerald-50 transition"
          >
            💬 실시간 DM함
          </Link>
          {user ? (
            <Link
              href="/gallery/default"
              className="px-4 py-2.5 bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs transition border border-emerald-500/30"
            >
              🖼️ 갤러리 가기
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2.5 bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs transition border border-emerald-500/30"
            >
              🔑 로그인
            </Link>
          )}
        </div>
      </div>

      {/* 📊 콘텐츠 영역 (인기글 / 최신글 탭) */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* 탭 네비게이션 */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('popular')}
              className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                activeTab === 'popular'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔥 실시간 인기글
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                activeTab === 'recent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✨ 최신글
            </button>
          </div>

          <Link
            href="/gallery/default"
            className="text-gray-400 hover:text-emerald-600 font-bold text-[11px] transition"
          >
            전체 보기 →
          </Link>
        </div>

        {/* 게시글 목록 */}
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-bold text-xs">
            ⏳ 게시글을 불러오는 중입니다...
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-medium text-xs">
            등록된 게시글이 없습니다. 첫 글을 작성해 보세요!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayedPosts.map((post, idx) => {
              const authorName = post.profiles?.display_name || post.profiles?.nickname || post.author_name || '익명';
              const galleryId = post.gallery_id || 'default';

              return (
                <Link
                  key={post.id}
                  href={`/gallery/${galleryId}/${post.id}`}
                  className="py-3.5 flex items-center justify-between gap-3 group hover:bg-gray-50/80 px-3 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {activeTab === 'popular' && (
                      <span className="w-6 text-center font-black text-xs text-emerald-600 shrink-0">
                        {idx + 1}
                      </span>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="font-bold text-gray-900 text-xs sm:text-[13px] truncate group-hover:text-emerald-600 transition">
                        {post.title}
                      </h2>
                      <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                        <span className="font-semibold text-gray-600 truncate max-w-[100px]">
                          {authorName}
                        </span>
                        <AdminBadge email={post.author_email || post.profiles?.email} />
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 수치 지표 (조회수, 좋아요, 댓글) */}
                  <div className="flex items-center gap-3 text-gray-400 text-[10px] shrink-0 font-medium">
                    <span className="flex items-center gap-0.5">
                      👀 {post.views || 0}
                    </span>
                    <span className="flex items-center gap-0.5">
                      ❤️ {post.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-0.5">
                      💬 {post.comments_count || 0}
                    </span>
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
