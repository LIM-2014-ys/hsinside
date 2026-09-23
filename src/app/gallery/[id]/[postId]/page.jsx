'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage({ params }) {
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);

  // 추천/비추천 개수 및 나의 투표 상태
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [userVote, setUserVote] = useState(null); // 'like' | 'dislike' | null
  const [voteLoading, setVoteLoading] = useState(false);

  useEffect(() => {
    fetchPostAndVotes();
  }, []);

  const fetchPostAndVotes = async () => {
    // 1. 유저 정보 조회
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // 2. 게시글 상세 정보 조회
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('id', params.id)
      .single();

    setPost(postData);

    if (postData) {
      // 3. 해당 게시글의 전체 추천/비추천 목록 조회
      const { data: votes } = await supabase
        .from('post_likes')
        .select('user_email, vote_type')
        .eq('post_id', params.id);

      if (votes) {
        // 추천 / 비추천 개수 집계
        const likes = votes.filter((v) => v.vote_type === 'like').length;
        const dislikes = votes.filter((v) => v.vote_type === 'dislike').length;
        setLikeCount(likes);
        setDislikeCount(dislikes);

        // 현재 유저가 반응한 기록이 있는지 확인
        if (user) {
          const myVote = votes.find((v) => v.user_email === user.email);
          setUserVote(myVote ? myVote.vote_type : null);
        }
      }
    }
  };

  // 추천 or 비추천 버튼 클릭 핸들러
  const handleVote = async (type) => {
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (voteLoading) return;
    setVoteLoading(true);

    try {
      if (userVote === type) {
        // 이미 추천/비추천을 누른 상태에서 같은 버튼을 누르면 '취소'
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', params.id)
          .eq('user_email', user.email);
      } else {
        // 처음 누르거나, 추천 ↔ 비추천 간 변경 (UPSERT)
        await supabase
          .from('post_likes')
          .upsert(
            {
              post_id: params.id,
              user_email: user.email,
              vote_type: type,
            },
            { onConflict: 'post_id, user_email' }
          );
      }

      // 최신 개수 및 내 투표 상태 다시 불러오기
      await fetchPostAndVotes();
    } catch (err) {
      console.error('투표 오류:', err);
      alert('처리에 실패했습니다.');
    } finally {
      setVoteLoading(false);
    }
  };

  if (!post) return <div className="p-8 text-center text-xs text-gray-500">로딩 중...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
        <p className="text-xs text-gray-500 mt-1">작성자: {post.author_email}</p>
      </div>

      <div className="text-sm text-gray-800 leading-relaxed border-t border-b py-6 min-h-[150px]">
        {post.content}
      </div>

      {/* 추천 / 비추천 버튼 영역 */}
      <div className="flex justify-center items-center gap-4 pt-2">
        {/* 추천 버튼 */}
        <button
          onClick={() => handleVote('like')}
          disabled={voteLoading}
          className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition ${
            userVote === 'like'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span>👍 추천</span>
          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
            {likeCount}
          </span>
        </button>

        {/* 비추천 버튼 */}
        <button
          onClick={() => handleVote('dislike')}
          disabled={voteLoading}
          className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition ${
            userVote === 'dislike'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span>👎 비추천</span>
          <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-[10px]">
            {dislikeCount}
          </span>
        </button>
      </div>
    </div>
  );
}
