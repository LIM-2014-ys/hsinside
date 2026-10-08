'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const galleryId = params.id;
  const rawSlug = params.slug;

  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  // 검열 이미지 강제 표시 토글 상태
  const [showCensoredImage, setShowCensoredImage] = useState(false);

  // 댓글 관련 상태
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 신고 모달 상태
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('음란물 / 불법정보');
  const [reportDetail, setReportDetail] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!rawSlug) return;
      const decodedSlug = decodeURIComponent(rawSlug);

      // 1. 세션 및 정지 상태 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = session.user;
        setCurrentUser(user);

        const userStatus = user.user_metadata?.status;
        const userBanned = user.user_metadata?.banned;
        if (userStatus === '이용정지' || userBanned === true) {
          setIsBanned(true);
        }
      }

      // 2. 게시글 안전 조회
      let postData = null;

      const { data: slugMatch } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', decodedSlug)
        .maybeSingle();

      postData = slugMatch;

      if (!postData && !isNaN(Number(decodedSlug))) {
        const { data: idMatch } = await supabase
          .from('posts')
          .select('*')
          .eq('id', Number(decodedSlug))
          .maybeSingle();
        postData = idMatch;
      }

      if (!postData) {
        alert('존재하지 않거나 삭제된 게시글입니다.');
        router.replace(`/gallery/${galleryId}`);
        return;
      }

      setPost(postData);

      // 3. 댓글 목록 조회
      const { data: commentData } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postData.id)
        .order('created_at', { ascending: true });

      if (commentData) {
        setComments(commentData);
      }

      setLoading(false);
    };

    fetchData();
  }, [galleryId, rawSlug, router]);

  const isAuthor = Boolean(
    currentUser &&
    post &&
    ((post.user_id && post.user_id === currentUser.id) ||
      (post.author_email && post.author_email === currentUser.email))
  );

  // 댓글 작성
  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('로그인 후 댓글을 작성할 수 있습니다.');
      router.push('/login');
      return;
    }

    if (isBanned) {
      alert('🚫 이용 정지 상태이므로 댓글 작성이 불가능합니다.');
      return;
    }

    if (!newComment.trim()) {
      alert('댓글 내용을 입력해 주세요.');
      return;
    }

    setSubmittingComment(true);

    try {
      const authorName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || '익명';

      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: post.id,
            user_id: currentUser.id,
            author_name: authorName,
            author_email: currentUser.email,
            content: newComment.trim(),
          },
        ])
        .select();

      if (error) {
        alert('댓글 등록 오류: ' + error.message);
      } else if (data) {
        setComments((prev) => [...prev, data[0]]);
        setNewComment('');
      }
    } catch {
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId, commentUserEmail) => {
    if (currentUser?.email !== commentUserEmail) {
      alert('본인의 댓글만 삭제할 수 있습니다.');
      return;
    }

    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) {
        alert('댓글 삭제 실패: ' + error.message);
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 글 삭제
  const handleDeletePost = async () => {
    if (!isAuthor) return;
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) {
        alert('삭제 실패: ' + error.message);
      } else {
        alert('게시글이 성공적으로 삭제되었습니다.');
        router.replace(`/gallery/${galleryId}`);
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 신고 제출
  const handleReportSubmit = async (e) => {
    e.preventDefault();

    if (isAuthor) {
      alert('본인 글은 신고할 수 없습니다.');
      return;
    }

    setSubmittingReport(true);

    try {
      const { error } = await supabase.from('reports').insert([
        {
          target_title: post.title,
          target_author: post.author_name || post.author_email,
          reason: reportReason,
          content: reportDetail.trim() || '세부 사유 없음',
          reporter_email: currentUser?.email || '익명 유저',
        },
      ]);

      if (error) {
        alert('신고 접수 실패: ' + error.message);
      } else {
        alert('신고가 정상 접수되었습니다.');
        setIsReportModalOpen(false);
        setReportDetail('');
      }
    } catch {
      alert('신고 접수 중 오류가 발생했습니다.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        📄 게시글 데이터를 불러오는 중입니다...
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 상단 버튼 */}
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
        >
          ← 목록으로
        </Link>

        <div className="flex items-center gap-2">
          {isAuthor ? (
            <>
              <Link
                href={`/gallery/${galleryId}/${rawSlug}/edit`}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
              >
                ✏️ 수정
              </Link>
              <button
                onClick={handleDeletePost}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition text-[11px] border border-rose-200"
              >
                🗑️ 삭제
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-[11px] shadow-sm"
            >
              🚨 신고
            </button>
          )}
        </div>
      </div>

      {/* 게시글 제목 및 날짜 */}
      <div className="space-y-3 border-b pb-5">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug tracking-tight">
          {post.title}
        </h1>
        <div className="flex items-center justify-between text-gray-500 font-medium text-[11px]">
          <span className="font-bold text-gray-800">
            {post.author_name || post.author_email?.split('@')[0] || '익명'}
          </span>
          <time className="text-gray-400">
            {new Date(post.created_at).toLocaleString('ko-KR')}
          </time>
        </div>
      </div>

      {/* 🖼️ 선택적 사진 검열 로직 */}
      {post.file_url && (
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative">
          {/* post.is_censored가 true일 때만 검열 필터 적용 */}
          {post.is_censored && !showCensoredImage ? (
            <div className="relative py-12 px-4 text-center space-y-3 bg-gray-100 rounded-xl border border-gray-200">
              <span className="text-3xl block">👁️‍🗨️</span>
              <p className="font-bold text-gray-700 text-xs">
                관리자 또는 규제 기준에 의해 검열 처리된 이미지입니다.
              </p>
              <button
                onClick={() => setShowCensoredImage(true)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-[11px] transition shadow-md"
              >
                검열된 원본 사진 보기
              </button>
            </div>
          ) : (
            <div className="relative">
              <img
                src={post.file_url}
                alt="첨부파일"
                className="max-h-96 rounded-xl object-contain mx-auto"
              />
              {post.is_censored && (
                <button
                  onClick={() => setShowCensoredImage(false)}
                  className="mt-2 text-[10px] text-gray-400 hover:underline block mx-auto font-medium"
                >
                  🔒 사진 다시 숨기기
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 게시글 본문 */}
      <div className="py-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap min-h-[140px]">
        {post.content}
      </div>

      {/* 💬 댓글 섹션 */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="font-bold text-sm text-gray-900">
          💬 댓글 <span className="text-blue-600 font-extrabold">{comments.length}</span>개
        </h3>

        <form onSubmit={handleCommentSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              isBanned
                ? '🚫 계정이 정지되어 댓글 작성이 불가능합니다.'
                : '댓글을 입력해 주세요...'
            }
            disabled={isBanned}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-rose-50 disabled:text-rose-400 disabled:border-rose-200"
          />
          <button
            type="submit"
            disabled={submittingComment || isBanned}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/20 disabled:bg-gray-200 disabled:shadow-none text-xs shrink-0"
          >
            {submittingComment ? '등록 중...' : '댓글 등록'}
          </button>
        </form>

        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-medium border border-dashed border-gray-200 rounded-2xl">
            첫 번째 댓글을 작성해 보세요!
          </div>
        ) : (
          <div className="space-y-2 divide-y divide-gray-100">
            {comments.map((comment) => (
              <div key={comment.id} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-[11px]">
                      {comment.author_name || comment.author_email?.split('@')[0] || '익명'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(comment.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed">{comment.content}</p>
                </div>

                {currentUser?.email === comment.author_email && (
                  <button
                    onClick={() => handleDeleteComment(comment.id, comment.author_email)}
                    className="text-gray-400 hover:text-rose-500 font-bold text-[10px] shrink-0"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚨 신고 모달 */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <div className="border-b pb-3">
              <h3 className="text-base font-black text-gray-900">🚨 게시글 신고하기</h3>
            </div>
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">신고 사유 *</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="음란물 / 불법정보">음란물 / 불법정보</option>
                  <option value="욕설 / 비방 / 혐오표현">욕설 / 비방 / 혐오표현</option>
                  <option value="스팸 / 도배 / 광고성 게시물">스팸 / 도배 / 광고성 게시물</option>
                  <option value="기타 사유">기타 사유</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">상세 사유 (선택)</label>
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="구체적인 사유를 작성하세요."
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-md shadow-rose-500/20"
                >
                  {submittingReport ? '접수 중...' : '신고 접수'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
