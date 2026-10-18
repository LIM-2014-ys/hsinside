'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function GalleryListPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!galleryId) return;

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
        console.error('게시글 목록 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [galleryId]);

  // 날짜 포맷 함수 (모바일용 가다듬기)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      // 오늘 작성된 글은 시간 표시 (예: 14:30)
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    // 이전 날짜는 월.일 (예: 10.24)
    return `${date.getMonth() + 1}.${date.getDate()}`;
  };

  return (
    <div className="max-w-4xl mx-auto my-4 sm:my-8 px-3 sm:px-4 font-sans text-xs sm:text-sm space-y-4">
      {/* 갤러리 헤더 & 글쓰기 버튼 */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-base sm:text-lg font-black text-gray-900">
            📌 {galleryId.toUpperCase()} 갤러리
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5">자유롭게 이야기를 나누는 공간입니다.</p>
        </div>

        <Link
          href={`/gallery/${galleryId}/write`}
          className="px-3 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px] sm:text-xs shrink-0 touch-manipulation shadow-xs"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100">
        {loading ? (
          <div className="py-12 text-center text-gray-400 font-bold text-xs">
            📄 목록을 불러오는 중입니다...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-medium text-xs space-y-2">
            <p>등록된 게시글이 없습니다.</p>
            <p className="text-[11px] text-gray-300">첫 번째 글을 작성해 보세요!</p>
          </div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/gallery/${galleryId}/${post.id}`}
              className="p-3.5 sm:p-4 flex items-center justify-between gap-2 hover:bg-gray-50/80 active:bg-gray-100/80 transition block group"
            >
              {/* 왼쪽: 제목, 작성자, 댓글 수 */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="font-bold text-gray-900 group-hover:text-emerald-600 text-xs sm:text-sm truncate leading-snug">
                    {post.title}
                  </h2>
                  {post.file_url && (
                    <span className="text-[10px] shrink-0 text-gray-400">🖼️</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-400 min-w-0">
                  <span className="font-semibold text-gray-600 truncate max-w-[100px] sm:max-w-[150px]">
                    {post.author_name || '익명'}
                  </span>
                  <AdminBadge email={post.author_email} />
                </div>
              </div>

              {/* 오른쪽: 작성일 (절대 줄바꿈 안 됨) */}
              <div className="text-right shrink-0 whitespace-nowrap pl-2">
                <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium whitespace-nowrap shrink-0 block">
                  {formatDate(post.created_at)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
