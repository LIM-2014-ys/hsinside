'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage({ params }) {
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);

  // 추천/비추천 개수 및 나의 투표 상태
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [userVote, setUserVote] = useState(null); // 'like' | 'dislike' | null
  
  // 연타 방지를 위한 즉시 동기화 Ref & Loading State
  const isVotingRef = useRef(false);
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
        const likes = votes.filter((v) => v.vote_type === 'like').length;
        const dislikes = votes.filter((v) => v.vote_type === 'dislike').length;
        setLikeCount(likes);
        setDislikeCount(dislikes);

        if (user) {
          const myVote = votes.find((v) => v.user_email === user.email);
          setUserVote(myVote ? myVote.vote_type : null);
        }
      }
    }
  };

  // 추천 or 비추천 버튼 클릭 핸들러 (연타 방지 포함)
  const handleVote = async (type) => {
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    // 🛑 [연타 방지 1단계] 실행 중이면 즉시 리턴 (useRef를 통해 동기적으로 즉시 막음)
    if (isVotingRef.current) return;
    
    isVotingRef.current = true;
    setVoteLoading(true);

    // 현재 상태 백업 (에러 발생 시 복구용)
    const prevVote = userVote;
    const prevLikes = likeCount;
    const prevDislikes = dislikeCount;

    // 🚀 [연타 방지 2단계] Optimistic Update (화면 수치를 즉시 반영하여 클릭 중복 유도 최소화)
    if (userVote === type) {
      // 취소
      setUserVote(null);
      if (type === 'like') setLikeCount((prev) => Math.max(0, prev - 1));
      if (type === 'dislike') setDislikeCount((prev) => Math.max(0, prev - 1));
    } else {
      // 신규 등록 또는 전환
      if (userVote === 'like') setLikeCount((prev) => Math.max(0, prev - 1));
      if (userVote === 'dislike') setDislikeCount((prev) => Math.max(0, prev - 1));

      setUserVote(type);
      if (type === 'like') setLikeCount((prev) => prev + 1);
      if (type === 'dislike') setDislikeCount((prev) => prev + 1);
    }

    try {
      if (prevVote === type) {
        // 이미 추천/비추천을 누른 상태에서 같은 버튼을 누르면 '취소'
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', params.id)
          .eq('user_email', user.email);

        if (error) throw error;
      } else {
        // 처음 누르거나, 추천 ↔ 비추천 간 변경 (UPSERT)
        const { error } = await supabase
          .from('post_likes')
          .upsert(
            {
              post_id: params.id,
              user_email: user.email,
              vote_type: type,
            },
            { onConflict: 'post_id, user_email' }
          );

        if (error) throw error;
      }
    } catch (err) {
      console.error('투표 오류:', err);
      // 에러 발생 시 원래 상태로 복구
      setUserVote(prevVote);
      setLikeCount(prevLikes);
      setDislikeCount(prevDislikes);
      alert('처리에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      // 🛑 [연타 방지 3단계] 0.5초 디바운스 타임아웃을 주어 연타 클릭 유입 차단
      setTimeout(() => {
        isVotingRef.current = false;
        setVoteLoading(false);
      }, 500);
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
            voteLoading ? 'cursor-not-allowed opacity-60' : ''
          } ${
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
            voteLoading ? 'cursor-not-allowed opacity-60' : ''
          } ${
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
