'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryDetailPage() {
  const { id: rawGalleryId } = useParams();
  // 한글 갤러리 이름 디코딩 처리 (예: %EC%9E%84... -> '임준서')
  const galleryId = decodeURIComponent(rawGalleryId);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    }

    fetchPosts();
  }, [galleryId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto my-12 text-center text-xs text-gray-500">목록 불러오는 중...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-lg font-bold text-gray-900">📌 {galleryId} 갤러리</h1>
        <Link
          href={`/gallery/${galleryId}/write`}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      <div className="divide-y text-xs">
        {posts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">등록된 게시글이 없습니다. 첫 글을 작성해 보세요!</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/gallery/${galleryId}/${post.id}`}
              className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition rounded-md group"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-gray-400 text-[11px] w-8">#{post.id}</span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition">
                  {post.title}
                </span>
                {post.media_files && post.media_files.length > 0 && <span className="text-[10px]">🖼️</span>}
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
