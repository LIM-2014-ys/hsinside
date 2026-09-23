'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const { id: galleryId, postId } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);

  // 추천 / 비추천 상태
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const isVotingRef = useRef(false);

  // 더보기 메뉴 및 신고 모달 상태
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostAndVotes();
  }, [postId]);

  const fetchPostAndVotes = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    const isNumberCode = !isNaN(Number(postId)) && postId.length >= 10;
    const query = supabase.from('posts').select('*');

    if (isNumberCode) {
      query.eq('post_code', parseInt(postId, 10));
    } else {
      query.eq('id', parseInt(postId, 10));
    }

    const { data: postData, error } = await query.single();

    if (error || !postData) {
      console.error('게시글 불러오기 실패:', error);
      setLoading(false);
      return;
    }

    setPost(postData);

    // 추천/비추천 카운트 및 투표 상태 가져오기
    const { data: votes } = await supabase
      .from('post_likes')
      .select('user_email, vote_type')
      .eq('post_id', postData.id);

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

    setLoading(false);
  };

  // 날짜/시간 (년-월-일 시:분:초) 포맷 함수
  const formatDetailDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  // 추천 / 비추천 통합 클릭 핸들러 (연타 완벽 차단 및 단일 선택)
  const handleVote = async (type) => {
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (isVotingRef.current) return;
    isVotingRef.current = true;

    try {
      if (userVote === type) {
        // 이미 눌린 경우 -> 취소
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_email', user.email);
      } else {
        // 신규 클릭 또는 추천 ↔ 비추천 전환 (UPSERT)
        await supabase
          .from('post_likes')
          .upsert(
            {
              post_id: post.id,
              user_email: user.email,
              vote_type: type,
            },
            { onConflict: 'post_id, user_email' }
          );
      }

      await fetchPostAndVotes();
    } catch (err) {
      console.error('투표 오류:', err);
      alert('처리에 실패하였습니다.');
    } finally {
      setTimeout(() => {
        isVotingRef.current = false;
      }, 300);
    }
  };

  // 신고 제출 처리
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!reportReason.trim()) {
      alert('신고 사유를 입력해 주세요.');
      return;
    }

    setReportLoading(true);

    const { error } = await supabase.from('reports').insert([
      {
        post_id: post.id,
        reporter_email: user.email,
        reason: reportReason.trim(),
      },
    ]);

    setReportLoading(false);

    if (error) {
      alert(`신고 실패: ${error.message}`);
    } else {
      alert('신고 접수가 완료되었습니다. 관리자 검토 후 조치됩니다.');
      setShowReportModal(false);
      setReportReason('');
    }
  };

  // 게시글 삭제
  const handleDeletePost = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('posts').delete().eq('id', post.id);

    if (error) {
      alert(`삭제 실패: ${error.message}`);
    } else {
      alert('게시글이 삭제되었습니다.');
      router.push(`/gallery/${galleryId}`);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto p-12 text-center text-xs text-gray-500">게시글 로딩 중...</div>;
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
        <p className="text-gray-600 text-sm">존재하지 않거나 삭제된 게시글입니다.</p>
        <Link href={`/gallery/${galleryId}`} className="inline-block px-4 py-2 bg-blue-600 text-white text-xs rounded">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isAuthor = user && user.email === post.author_email;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-6 space-y-6 relative">
      {/* 상단 갤러리 이동 & 점 세 개 더보기 메뉴 */}
      <div className="border-b pb-4 flex items-center justify-between relative">
        <Link href={`/gallery/${galleryId}`} className="text-xs text-blue-600 hover:underline font-semibold">
          ← 갤러리로 돌아가기
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400">고유번호: {post.post_code || post.id}</span>

          {/* 점 세 개 더보기 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600 text-lg font-bold px-2"
              title="더보기"
            >
              ⋮
            </button>

            {/* 더보기 드롭다운 메뉴 */}
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 text-xs">
                {isAuthor && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDeletePost();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold"
                  >
                    🗑️ 게시글 삭제
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                >
                  🚨 게시글 신고
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 게시글 제목 및 상세 작성 정보 (초 단위 시각 및 자동 추적 위치 표시) */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 border-b pb-4">
          <span>작성자: <strong>{post.author_name || post.author_email}</strong></span>
          <span>•</span>
          {/* 년-월-일 시:분:초 */}
          <span>{formatDetailDate(post.created_at)}</span>
          <span>•</span>
          {/* 게시글 작성 시 자동 추적된 실제 도시 위치 */}
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[11px] font-medium">
            📍 {post.location || 'Seoul'}
          </span>
        </div>
      </div>

      {/* 게시글 본문 */}
      <div className="text-sm text-gray-800 leading-relaxed min-h-[150px] whitespace-pre-wrap">
        {post.content}
      </div>

      {/* 추천 / 비추천 버튼 영역 */}
      <div className="flex justify-center items-center gap-4 pt-6 border-t">
        {/* 추천 */}
        <button
          onClick={() => handleVote('like')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 border shadow-sm ${
            userVote === 'like'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span>👍 추천</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            userVote === 'like' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
          }`}>
            {likeCount}
          </span>
        </button>

        {/* 비추천 */}
        <button
          onClick={() => handleVote('dislike')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 border shadow-sm ${
            userVote === 'dislike'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span>👎 비추천</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            userVote === 'dislike' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'
          }`}>
            {dislikeCount}
          </span>
        </button>
      </div>

      {/* 신고하기 모달 팝업 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2">🚨 게시글 신고하기</h3>
            <p className="text-xs text-gray-600">부적절하거나 유해한 내용이 포함된 경우 신고 사유를 적어주세요.</p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <textarea
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="신고 사유를 입력하세요 (예: 욕설, 광고성 게시물 등)"
                className="w-full p-2.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-red-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={reportLoading}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {reportLoading ? '접수 중...' : '신고 제출'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
