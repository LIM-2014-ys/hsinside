'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function GalleryDetailPage() {
  const params = useParams();
  const galleryId = params.id;

  const [gallery, setGallery] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔍 검색 기능 상태
  const [searchCategory, setSearchCategory] = useState('all'); // all, title, content, author
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({ category: 'all', term: '' });

  // 📄 갤러리 및 게시글 데이터 불러오기 (검색 조건 적용)
  const fetchGalleryAndPosts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 갤러리 상세 정보 조회 (최초 1회)
      if (!gallery) {
        const { data: galleryData } = await supabase
          .from('galleries')
          .select('*')
          .eq('id', galleryId)
          .maybeSingle();

        if (galleryData) {
          setGallery(galleryData);
        }
      }

      // 2. 검색 조건이 적용된 게시글 목록 Query 생성
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
          // 제목, 내용, 작성자 중 하나라도 일치하면 검색
          query = query.or(
            `title.ilike.${pattern},content.ilike.${pattern},author_name.ilike.${pattern}`
          );
        }
      }

      const { data: postsData, error: postsError } = await query;

      if (!postsError && postsData) {
        setPosts(postsData);
      }
    } catch (err) {
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId, appliedSearch, gallery]);

  useEffect(() => {
    if (galleryId) {
      fetchGalleryAndPosts();
    }
  }, [galleryId, fetchGalleryAndPosts]);

  // 🔍 검색 버튼 클릭 / 엔터 시 적용
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch({
      category: searchCategory,
      term: searchInput,
    });
  };

  // 🔄 검색 초기화
  const handleResetSearch = () => {
    setSearchCategory('all');
    setSearchInput('');
    setAppliedSearch({ category: 'all', term: '' });
  };

  // 이미지 파일 확장자 판별 함수
  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const targetStr = (fileName || url).toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(targetStr);
  };

  // 날짜 한 줄 표기 포맷 함수 (YY.MM.DD)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  if (loading && !gallery && posts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto my-16 text-center text-gray-400 font-bold text-xs">
        📋 게시글 목록을 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs space-y-6">
      {/* 상단 헤더 영역 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href="/"
            className="text-[11px] text-gray-400 hover:text-gray-600 font-bold mb-1 inline-block transition"
          >
            ← 전체 갤러리 목록
          </Link>
          <h1 className="text-xl font-black text-gray-900">
            {gallery?.name || `갤러리 #${galleryId}`}
          </h1>
          {gallery?.description && (
            <p className="text-gray-500 text-[11px] mt-1">{gallery.description}</p>
          )}
        </div>

        <Link
          href={`/gallery/${galleryId}/new`}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs shadow-sm"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      {/* 🔍 검색창 영역 */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-gray-50 border border-gray-100 rounded-2xl p-2.5 sm:p-3 flex flex-wrap sm:flex-nowrap items-center gap-1.5 shadow-xs"
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
            className="px-3.5 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shrink-0 touch-manipulation shadow-xs"
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

      {/* 📌 검색 결과 안내 메시지 */}
      {appliedSearch.term && (
        <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-xl px-3.5 py-2 text-[11px] text-emerald-800 font-medium">
          <span>
            🔍 <strong>"{appliedSearch.term}"</strong> 검색 결과입니다. (
            {
              appliedSearch.category === 'all'
                ? '전체'
                : appliedSearch.category === 'title'
                ? '제목'
                : appliedSearch.category === 'content'
                ? '내용'
                : '작성자'
            }
            )
          </span>
          <span className="font-bold">총 {posts.length}건</span>
        </div>
      )}

      {/* 게시글 목록 테이블 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-[11px]">
          <div className="col-span-7">제목</div>
          <div className="col-span-3">작성자</div>
          <div className="col-span-2 text-right">작성일</div>
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-medium space-y-2">
            <p>
              {appliedSearch.term
                ? '검색 결과와 일치하는 게시글이 없습니다.'
                : '등록된 게시글이 없습니다. 첫 글을 작성해 보세요!'}
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
          <div className="divide-y divide-gray-100">
            {posts.map((post) => {
              const hasFile = Boolean(post.file_url);
              const isImg = isImageFile(post.file_url, post.file_name);

              return (
                <Link
                  key={post.id}
                  href={`/gallery/${galleryId}/${post.id}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-gray-50/80 transition text-gray-800"
                >
                  <div className="col-span-7 font-bold text-gray-900 flex items-center gap-1.5 pr-2 overflow-hidden">
                    <span className="truncate">{post.title}</span>
                    {hasFile && (
                      <span className="shrink-0 text-[11px]" title={isImg ? '사진 첨부' : '파일 첨부'}>
                        {isImg ? '🖼️' : '📎'}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 flex items-center gap-0.5 truncate">
                    <span className="font-semibold text-gray-700 truncate">
                      {post.author_name || post.author_email?.split('@')[0] || '익명'}
                    </span>
                    <AdminBadge email={post.author_email} />
                  </div>
                  <div className="col-span-2 text-right text-gray-400 text-[10px] whitespace-nowrap shrink-0">
                    {formatDate(post.created_at)}
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
