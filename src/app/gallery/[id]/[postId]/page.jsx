'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const { id: galleryId, postId } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeProcessing, setLikeProcessing] = useState(false);

  useEffect(() => {
    fetchPostAndUser();
  }, [postId]);

  const fetchPostAndUser = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 고유번호(post_code) 또는 id로 게시글 조회
    const isNumberCode = !isNaN(Number(postId)) && postId.length >= 10;
    const query = supabase.from('posts').select('*');

    if (isNumberCode) {
      query.eq('post_code', parseInt(postId, 10));
    } else {
      query.eq('id', parseInt(postId, 10));
    }

    const { data: postData, error } = await query.single();

    if (error || !postData) {
      console.error('게시글 조회 실패:', error);
      setLoading(false);
      return;
    }

    setPost(postData);

    // 유저가 이미 좋아요를 눌렀는지 확인
    if (user) {
      const { data: likeData } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postData.id)
        .eq('user_email', user.email)
        .maybeSingle();

      if (likeData) {
        setHasLiked(true);
      }
    }

    setLoading(false);
  };

  // 좋아요 토글 처리 (좋아요 추가 / 취소)
  const handleLikeToggle = async () => {
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (likeProcessing) return;
    setLikeProcessing(true);

    try {
      if (hasLiked) {
        // 1. 좋아요 취소
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_email', user.email);

        const newLikesCount = Math.max(0, (post.likes || 1) - 1);

        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);

        setPost((prev) => ({ ...prev, likes: newLikesCount }));
        setHasLiked(false);
      } else {
        // 2. 좋아요 추가
        await supabase
          .from('post_likes')
          .insert([{ post_id: post.id, user_email: user.email }]);

        const newLikesCount = (post.likes || 0) + 1;

        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);

        setPost((prev) => ({ ...prev, likes: newLikesCount }));
        setHasLiked(true);
      }
    } catch (err) {
      console.error('좋아요 토글 오류:', err);
      alert('좋아요 처리 중 오류가 발생하였습니다.');
    } finally {
      setLikeProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-sm text-gray-500">
        게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
        <p className="text-gray-600 text-sm">존재하지 않거나 삭제된 게시글입니다.</p>
        <Link
          href={`/gallery/${galleryId}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          갤러리 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-6 space-y-6">
      <div className="border-b pb-4 flex items-center justify-between">
        <Link
          href={`/gallery/${galleryId}`}
          className="text-xs text-blue-600 hover:underline font-semibold"
        >
          ← 갤러리로 돌아가기
        </Link>
        <span className="text-[11px] text-gray-400">
          고유번호: {post.post_code || post.id}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500 border-b pb-4">
          <span>작성자: <strong>{post.author_name || post.author_email}</strong></span>
          <span>•</span>
          <span>{new Date(post.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="text-sm text-gray-800 leading-relaxed min-h-[150px] whitespace-pre-wrap">
        {post.content}
      </div>

      <div className="flex justify-center pt-6 border-t">
        <button
          onClick={handleLikeToggle}
          disabled={likeProcessing}
          className={`px-6 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 border shadow-sm ${
            hasLiked
              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span>{hasLiked ? '❤️' : '🤍'}</span>
          <span>좋아요 {post.likes || 0}</span>
        </button>
      </div>
    </div>
  );
}
