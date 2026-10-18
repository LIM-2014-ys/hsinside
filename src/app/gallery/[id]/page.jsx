'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 🔍 검색 상태
  const [searchCategory, setSearchCategory] = useState('all'); // all, title, content, author
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({ category: 'all', term: '' });

  // 유저 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // 📄 게시글 데이터 불러오기 (검색 조건 적용)
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      const term = appliedSearch.term.trim();

      if (term) {
        const pattern = `%${term}%`;
        if (appliedSearch.category === 'title') {
          query = query.ilike('title', pattern);
        } else if (appliedSearch.category === 'content') {
          query = query.ilike('content', pattern);
        } else if (appliedSearch.category === 'author') {
          query = query.ilike('author_name', pattern);
        } else if (appliedSearch.category === 'all') {
          query = query.or(
            `title.ilike.${pattern},content.ilike.${pattern},author_name.ilike.${pattern}`
          );
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('게시글 조회 오류:', error);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error('예외 발생:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId, appliedSearch]);

  useEffect(() => {
    if (galleryId) {
      fetchPosts();
    }
  }, [galleryId, fetchPosts]);

  // 검색 제출
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch({
      category: searchCategory,
      term: searchInput,
    });
  };

  // 검색 초기화
  const handleResetSearch = () => {
    setSearchCategory('all');
    setSearchInput('');
    setAppliedSearch({ category: 'all', term: '' });
  };

  return (
    <div className="max-w-4xl mx-auto my-6 px-3 sm:px-4 font-sans text-xs space-y-4">
      {/* 상단 헤더 & 글쓰기 버튼 */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div>
          <h1 className="text-base font-black text-gray-900">📌 갤러리 게시판</h1>
          <p className="text-[10px] text-gray-400 mt-0.5">
            자유롭게 의견을 남기고 소통하는 공간입니다.
          </p>
        </div>

        {user ? (
          <Link
            href={`/gallery/${galleryId}/write`}
            className="px-3.5 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs touch-manipulation shrink-0"
          >
            ✏️ 글쓰기
          </Link>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-[11px] transition shrink-0"
          >
            로그인 후 글쓰기
          </Link>
        )}
      </div>

      {/* 🔍 검색 바 */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-gray-50 border border-gray-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-wrap sm:flex-nowrap items-center gap-1.5 shadow-2xs"
      >
        <select
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          className="px-2.5 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0 touch-manipulation"
        >
          <option value="all">전체 (제목+내용+작성자)</option>
          <option value="title">제목</option>
          <option value="content">내용</option>
          <option value="author">작성자</option>
        </select>

        <div className="flex-1 flex items-center gap-1.5 min-w-[180px] w-full sm:w-auto">
          <input
            type="text"
            placeholder="검색어를 입력해 주세요..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 touch-manipulation"
          />

          <button
            type="submit"
            className="px-3.5 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shrink-0 touch-manipulation shadow-2xs"
          >
            검색
          </button>

          {appliedSearch.term && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="px-2.5 py-2 bg-gray-200 active:bg-gray-300 text-gray-600 font-bold rounded-xl text-[11px] transition shrink-0 touch-manipulation"
            >
              초기화
            </button>
          )}
        </div>
      </form>

      {/* 검색 결과 카운트 안내 */}
      {appliedSearch.term && (
        <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2 text-[11px] text-emerald-800 font-medium">
          <span>
            🔍 <strong>"{appliedSearch.term}"</strong> 검색 결과입니다.
          </span>
          <span className="font-bold">총 {posts.length}건</span>
        </div>
      )}

      {/* 📄 게시글 목록 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 font-bold text-xs">
            📄 게시글을 불러오는 중입니다...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-gray-400 font-bold text-xs">
              {appliedSearch.term ? '검색 결과와 일치하는 게시글이 없습니다.' : '등록된 게시글이 없습니다.'}
            </p>
            {appliedSearch.term && (
              <button
                onClick={handleResetSearch}
                className="text-emerald-600 hover:underline font-bold text-[11px]"
              >
                전체 목록으로 돌아가기
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {posts.map((post) => {
              const authorUuid = post.user_id || post.author_id;

              return (
                <li key={post.id} className="hover:bg-gray-50/80 transition">
                  <div className="p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/gallery/${galleryId}/${post.id}`}
                        className="font-bold text-gray-900 text-[13px] hover:text-emerald-600 line-clamp-1 transition active:text-emerald-700"
                      >
                        {post.title}
                      </Link>

                      {post.file_url && (
                        <span className="text-[10px] shrink-0 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md font-semibold">
                          📎 첨부
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-400 pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {authorUuid ? (
                          <Link
                            href={`/mypage/${authorUuid}`}
                            className="font-bold text-gray-700 hover:text-emerald-600 hover:underline truncate transition"
                          >
                            {post.author_name || '익명'}
                          </Link>
                        ) : (
                          <span className="font-bold text-gray-700 truncate">
                            {post.author_name || '익명'}
                          </span>
                        )}
                        <AdminBadge email={post.author_email} />
                      </div>

                      <span className="shrink-0 text-gray-400">
                        {new Date(post.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
