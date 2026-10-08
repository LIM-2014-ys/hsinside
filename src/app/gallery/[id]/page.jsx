'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('gallery_id', galleryId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setPosts(data);
        }
      } catch (err) {
        console.error('게시글 불러오기 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    if (galleryId) {
      fetchPosts();
    }
  }, [galleryId]);

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.author_name && post.author_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs">
      {/* 갤러리 헤더 및 글쓰기 버튼 */}
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            📌 갤러리 (#{galleryId})
          </h1>
          <p className="text-gray-400 text-[11px] mt-0.5">
            자유롭게 의견을 나누는 공간입니다.
          </p>
        </div>
        <Link
          href={`/gallery/${galleryId}/write`}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-500/20 text-xs"
        >
          ✍️ 글쓰기
        </Link>
      </div>

      {/* 검색 창 */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="제목 또는 작성자로 검색..."
          className="w-full max-w-xs px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* 게시글 리스트 테이블 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-bold">
            📄 게시글을 불러오는 중입니다...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-gray-400 font-bold">등록된 게시글이 없습니다.</p>
            <Link
              href={`/gallery/${galleryId}/write`}
              className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
            >
              첫 게시글 작성하기
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-gray-400 font-bold text-[11px]">
              <span className="col-span-7">제목</span>
              <span className="col-span-3 text-center">작성자</span>
              <span className="col-span-2 text-right">작성일</span>
            </div>

            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/gallery/${galleryId}/${post.slug || post.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-gray-50/80 transition text-gray-800"
              >
                <div className="col-span-7 font-semibold truncate flex items-center gap-1.5">
                  {post.file_url && <span className="text-emerald-600 text-[10px]">📁</span>}
                  <span className="hover:underline">{post.title}</span>
                </div>
                <div className="col-span-3 text-center text-gray-500 font-medium truncate text-[11px]">
                  {post.author_name || post.author_email?.split('@')[0] || '익명'}
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
