'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!galleryId) return;

    const fetchGalleryAndPosts = async () => {
      setLoading(true);
      try {
        // 1. 갤러리 정보 조회
        const { data: galleryData } = await supabase
          .from('galleries')
          .select('*')
          .eq('id', galleryId)
          .maybeSingle();

        if (galleryData) {
          setGallery(galleryData);
        }

        // 2. 해당 갤러리의 게시글 목록 조회
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('gallery_id', galleryId)
          .order('created_at', { ascending: false });

        if (!postsError && postsData) {
          setPosts(postsData);
        }
      } catch (err) {
        console.error('데이터 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryAndPosts();
  }, [galleryId]);

  if (loading) {
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
            href="/gallery"
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

      {/* 게시글 목록 테이블 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-[11px]">
          <div className="col-span-2 text-center">번호</div>
          <div className="col-span-6">제목</div>
          <div className="col-span-2">작성자</div>
          <div className="col-span-2 text-right">작성일</div>
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-medium">
            등록된 게시글이 없습니다. 첫 글을 작성해 보세요!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/gallery/${galleryId}/${post.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-gray-50/80 transition text-gray-800"
              >
                <div className="col-span-2 text-center text-gray-400 font-mono text-[10px]">
                  #{post.id}
                </div>
                <div className="col-span-6 font-bold text-gray-900 truncate pr-2">
                  {post.title}
                </div>
                <div className="col-span-2 flex items-center gap-0.5 truncate">
                  <span className="font-semibold text-gray-700 truncate">
                    {post.author_name || post.author_email?.split('@')[0] || '익명'}
                  </span>
                  <AdminBadge email={post.author_email} />
                </div>
                <div className="col-span-2 text-right text-gray-400 text-[10px]">
                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
