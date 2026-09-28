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

      try {
        const isNumeric = !isNaN(galleryId) && galleryId.trim() !== '';

        // 1. galleries 테이블에서 갤러리 데이터 조회
        let galleryData = null;

        if (isNumeric) {
          // URL이 숫자 ID로 들어온 경우 (/gallery/1)
          const { data } = await supabase
            .from('galleries')
            .select('*')
            .eq('id', Number(galleryId))
            .maybeSingle();
          galleryData = data;
        }

        if (!galleryData) {
          // URL이 갤러리 이름으로 들어왔거나 ID 조회가 안 된 경우 (/gallery/임준서)
          const { data } = await supabase
            .from('galleries')
            .select('*')
            .eq('name', galleryId)
            .maybeSingle();
          galleryData = data;
        }

        // 갤러리 정보 세팅 (없으면 URL에 입력된 값 그대로 사용)
        const actualId = galleryData ? galleryData.id : (isNumeric ? Number(galleryId) : galleryId);
        const actualName = galleryData ? galleryData.name : galleryId;

        setGalleryInfo({
          id: actualId,
          name: actualName,
        });

        // 2. posts 테이블 조회
        let postsList = [];

        // 2-1) 숫자 ID 기반으로 게시글 우선 조회 (가장 일반적인 DB 구조)
        if (galleryData?.id || isNumeric) {
          const searchTargetId = galleryData ? galleryData.id : Number(galleryId);
          const { data: dataById } = await supabase
            .from('posts')
            .select('*')
            .eq('gallery_id', searchTargetId)
            .order('created_at', { ascending: false });

          if (dataById && dataById.length > 0) {
            postsList = dataById;
          }
        }

        // 2-2) 숫자 ID 결과가 없고, gallery_id 컬럼에 이름("임준서") 형태로 저장되어 있는 경우 2차 조회
        if (postsList.length === 0 && actualName) {
          const { data: dataByName } = await supabase
            .from('posts')
            .select('*')
            .eq('gallery_id', String(actualName))
            .order('created_at', { ascending: false });

          if (dataByName && dataByName.length > 0) {
            postsList = dataByName;
          }
        }

        setPosts(postsList);
      } catch (error) {
        console.error('갤러리 데이터를 불러오는 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [galleryId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto my-12 text-center text-xs text-gray-500">목록 불러오는 중...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      {/* 상단 헤더 */}
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
