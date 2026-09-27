'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryDetailPage() {
  const { id: galleryId } = useParams();
  const [gallery, setGallery] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGalleryAndPosts();
  }, [galleryId]);

  const fetchGalleryAndPosts = async () => {
    setLoading(true);

    const { data: galleryData } = await supabase
      .from('galleries')
      .select('*')
      .eq('id', galleryId)
      .single();

    setGallery(galleryData);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false });

    setPosts(postsData || []);
    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getMonth() + 1}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  if (loading) return <div className="max-w-4xl mx-auto p-8 text-center text-xs text-gray-500">로딩 중...</div>;

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
      {/* 갤러리 상단 헤더 */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{gallery ? gallery.name : '갤러리'}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{gallery?.description || '커뮤니티 게시판'}</p>
        </div>
        <Link
          href={`/gallery/${galleryId}/write`}
          className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm divide-y">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">게시글이 없습니다. 첫 글을 작성해 보세요!</div>
        ) : (
          posts.map((post) => {
            const authorDisplayName = post.author_name || post.author_email?.split('@')[0] || '익명';
            const hasMedia = (post.media_files && post.media_files.length > 0) || (post.image_urls && post.image_urls.length > 0);
            const hasDocs = post.doc_files && post.doc_files.length > 0;

            return (
              <div key={post.id} className="p-3 hover:bg-gray-50 transition">
                <Link
                  href={`/gallery/${galleryId}/${post.post_code || post.id}`}
                  className="flex items-center justify-between gap-2 w-full text-xs"
                >
                  {/* 좌측: 제목 (한 줄로 최대한 길게 표시) */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 whitespace-nowrap overflow-hidden">
                    <span className="font-medium text-gray-900 text-xs sm:text-sm truncate sm:whitespace-normal">
                      {post.title}
                    </span>
                    {hasMedia && <span className="text-[10px] shrink-0">🎬</span>}
                    {hasDocs && <span className="text-[10px] shrink-0">📎</span>}
                  </div>

                  {/* 우측: 닉네임 & 작성일 (소형 배치, 줄바꿈 방지) */}
                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1 max-w-[80px] sm:max-w-[120px] truncate text-gray-500">
                      <div className="w-4 h-4 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center text-[8px] font-bold shrink-0">
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt="프사" className="w-full h-full object-cover" />
                        ) : (
                          <span>{authorDisplayName.charAt(0)}</span>
                        )}
                      </div>
                      <span className="truncate">{authorDisplayName}</span>
                    </div>

                    <span className="text-gray-300">|</span>
                    <span className="whitespace-nowrap">{formatDate(post.created_at)}</span>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
