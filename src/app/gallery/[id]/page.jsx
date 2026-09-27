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
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{gallery ? gallery.name : '갤러리'}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{gallery?.description || '커뮤니티 게시판'}</p>
        </div>
        <Link
          href={`/gallery/${galleryId}/write`}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
            <tr>
              <th className="p-3 w-16 text-center">번호</th>
              <th className="p-3">제목</th>
              <th className="p-3 w-36">작성자</th>
              <th className="p-3 w-24 text-center">작성일</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">게시글이 없습니다. 첫 글을 작성해 보세요!</td>
              </tr>
            ) : (
              posts.map((post) => {
                const authorDisplayName = post.author_name || post.author_email?.split('@')[0] || '익명';
                const hasMedia = (post.media_files && post.media_files.length > 0) || (post.image_urls && post.image_urls.length > 0);
                const hasDocs = post.doc_files && post.doc_files.length > 0;

                return (
                  <tr key={post.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-center text-gray-400 text-[11px]">{post.post_code || post.id}</td>
                    <td className="p-3 font-medium text-gray-900">
                      <Link href={`/gallery/${galleryId}/${post.post_code || post.id}`} className="hover:underline flex items-center gap-1.5">
                        <span className="truncate">{post.title}</span>
                        {hasMedia && <span className="text-[10px]">🎬</span>}
                        {hasDocs && <span className="text-[10px]">📎</span>}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                          {post.author_avatar ? (
                            <img src={post.author_avatar} alt="프사" className="w-full h-full object-cover" />
                          ) : (
                            <span>{authorDisplayName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="truncate max-w-[100px] text-gray-800">{authorDisplayName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-gray-400 text-[11px]">{formatDate(post.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
