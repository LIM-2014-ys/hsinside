'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryDetailPage() {
  const { id: rawGalleryId } = useParams();
  const galleryId = decodeURIComponent(rawGalleryId);

  const [galleryInfo, setGalleryInfo] = useState({ id: galleryId, name: galleryId });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const isNumeric = !isNaN(galleryId);

      // 1. 기존 galleries 테이블에서 갤러리 조회 (ID 또는 이름으로 찾기)
      const { data: galleryData } = await supabase
        .from('galleries')
        .select('*')
        .or(`id.eq.${isNumeric ? Number(galleryId) : -1},name.eq.${galleryId}`)
        .maybeSingle();

      let targetId = galleryId;
      let targetName = galleryId;

      if (galleryData) {
        targetId = String(galleryData.id);
        targetName = galleryData.name;
        setGalleryInfo({ id: targetId, name: targetName });
      }

      // 2. 게시글 조회: gallery_id가 숫자 ID('1')로 저장된 기존 글 + 이름('임준서')으로 저장된 글 모두 조회
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('gallery_id', [targetId, targetName])
        .order('created_at', { ascending: false });

      if (!postsError && postsData) {
        setPosts(postsData);
      }

      setLoading(false);
    }

    fetchData();
  }, [galleryId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto my-12 text-center text-xs text-gray-500">목록 불러오는 중...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      {/* 헤더 영역 */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-lg font-bold text-gray-900">📌 {galleryInfo.name} 갤러리</h1>
        <Link
          href={`/gallery/${encodeURIComponent(galleryId)}/write`}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      {/* 게시글 목록 */}
      <div className="divide-y text-xs">
        {posts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">등록된 게시글이 없습니다. 첫 글을 작성해 보세요!</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/gallery/${encodeURIComponent(galleryId)}/${post.id}`}
              className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition rounded-md group"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-gray-400 text-[11px] w-8">#{post.id}</span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition">
                  {post.title}
                </span>
                {post.media_files && post.media_files.length > 0 && <span className="text-[10px]">🖼️</span>}
                {post.location && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    📍 {post.location}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-gray-400 text-[11px]">
                <span>{post.author_name}</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
