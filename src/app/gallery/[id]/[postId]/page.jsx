'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminBadge from '@/components/AdminBadge';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params.id;
  const postId = params.postId;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  // 1. 현재 사용자 정보 조회
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // 2. 게시글 및 댓글 데이터 불러오기
  const fetchPostAndComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      // 게시글 상세 조회
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (postError || !postData) {
        console.error('게시글 조회 실패:', postError);
      } else {
        setPost(postData);
      }

      // 댓글 목록 조회
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (!commentsError && commentsData) {
        setComments(commentsData);
      }
    } catch (err) {
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  // 🔔 백그라운드 푸시 알림 발송 함수 (게시글 작성자 + @멘션 대상자)
  const triggerPushNotifications = async (newCommentContent, postAuthorId) => {
    if (!currentUser) return;

    const currentUserId = currentUser.id;
    const currentUserName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0] ||
      '익명';

    // 🔍 1. 댓글 본문에서 @닉네임 멘션 추출 (예: "@홍길동" -> "홍길동")
    const mentionMatches = newCommentContent.match(/@([a-zA-Z0-9가-힣_-]+)/g);
    let mentionedUserIds = [];

    if (mentionMatches && mentionMatches.length > 0) {
      const mentionedNames = [...new Set(mentionMatches.map((m) => m.slice(1)))];

      for (const name of mentionedNames) {
        try {
          // profiles 테이블에서 닉네임 검색
          const { data: profileUsers } = await supabase
            .from('profiles')
            .select('id, nickname, username, display_name')
            .or(`nickname.ilike.${name},username.ilike.${name},display_name.ilike.${name}`);

          if (profileUsers && profileUsers.length > 0) {
            profileUsers.forEach((u) => {
              if (u.id !== currentUserId) mentionedUserIds.push(u.id);
            });
          } else {
            // profiles에 없을 경우 comments/posts 작성자 이름으로 fallback 검색
            const { data: matchedComments } = await supabase
              .from('comments')
              .select('user_id')
              .ilike('author_name', name)
              .limit(5);

            if (matchedComments && matchedComments.length > 0) {
              matchedComments.forEach((c) => {
                if (c.user_id && c.user_id !== currentUserId) {
                  mentionedUserIds.push(c.user_id);
                }
              });
            }
          }
        } catch (err) {
          console.error(`멘션 대상(${name}) 조회 오류:`, err);
        }
      }
    }

    // 중복 ID 제거
    mentionedUserIds = [...new Set(mentionedUserIds)];

    // 📤 2. @멘션된 유저들에게 "💬 멘션 알림" 푸시 발송
    for (const targetUserId of mentionedUserIds) {
      try {
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: targetUserId,
            title: '💬 멘션 알림',
            body: `${currentUserName}님이 회원님을 언급했습니다: "${newCommentContent}"`,
            url: `/gallery/${galleryId}/${postId}`,
          }),
        });
      } catch (err) {
        console.error('멘션 푸시 발송 실패:', err);
      }
    }

    // 📤 3. 게시글 작성자에게 "💬 새 댓글 알림" 푸시 발송
    // (본인이 작성자이거나, 이미 멘션 알림을 받은 경우는 중복 발송 제외)
    if (
      postAuthorId &&
      postAuthorId !== currentUserId &&
      !mentionedUserIds.includes(postAuthorId)
    ) {
      try {
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: postAuthorId,
            title: '💬 새 댓글 알림',
            body: `${currentUserName}님: "${newCommentContent}"`,
            url: `/gallery/${galleryId}/${postId}`,
          }),
        });
      } catch (err) {
        console.error('게시글 작성자 푸시 발송 실패:', err);
      }
    }
  };

  // ✏️ 댓글 제출 핸들러
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentUser || submittingComment) return;

    setSubmittingComment(true);
    const savedContent = commentInput.trim();
    const authorName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0] ||
      '익명';

    try {
      // 1. DB에 댓글 저장
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: currentUser.id,
            author_name: authorName,
            author_email: currentUser.email,
            content: savedContent,
          },
        ])
        .select('*')
        .single();

      if (error) {
        alert('댓글 등록에 실패했습니다.');
        console.error('댓글 등록 오류:', error);
      } else {
        setComments((prev) => [...prev, newComment]);
        setCommentInput('');

        // 2. ⚡️ 백그라운드 푸시 알림 트리거 (게시글 작성자 및 멘션 유저)
        const postAuthorId = post?.user_id || post?.author_id;
        triggerPushNotifications(savedContent, postAuthorId);
      }
    } catch (err) {
      console.error('댓글 작성 예외:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 🗑️ 댓글 삭제 핸들러
  const handleDeleteComment = async (commentId) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) {
        alert('댓글 삭제 실패');
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
    }
  };

  // 🗑️ 게시글 삭제 핸들러
  const handleDeletePost = async () => {
    if (!confirm('게시글을 삭제하시겠습니까? 복구할 수 없습니다.')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) {
        alert('게시글 삭제에 실패했습니다.');
      } else {
        router.push(`/gallery/${galleryId}`);
      }
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
    }
  };

  // 이미지 파일 여부 확인
  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const targetStr = (fileName || url).toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(targetStr);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-16 text-center text-gray-400 font-bold text-xs">
        📄 게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto my-16 text-center space-y-3">
        <p className="text-gray-500 font-bold text-xs">존재하지 않거나 삭제된 게시글입니다.</p>
        <Link
          href={`/gallery/${galleryId}`}
          className="inline-block px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const postAuthorUuid = post.user_id || post.author_id;
  const isPostAuthor = currentUser && currentUser.id === postAuthorUuid;

  return (
    <div className="max-w-4xl mx-auto my-6 px-3 sm:px-4 font-sans text-xs space-y-6">
      {/* ⬅️ 상단 목록 이동 버튼 */}
      <div>
        <Link
          href={`/gallery/${galleryId}`}
          className="text-[11px] text-gray-400 hover:text-gray-600 font-bold inline-flex items-center gap-1 transition"
        >
          ← 갤러리 목록으로
        </Link>
      </div>

      {/* 📌 게시글 본문 카드리뉴얼 */}
      <article className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* 게시글 제목 및 버튼 */}
        <div className="border-b border-gray-100 pb-3.5 space-y-2">
          <h1 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
            {post.title}
          </h1>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              {postAuthorUuid ? (
                <Link
                  href={`/mypage/${postAuthorUuid}`}
                  className="font-bold text-gray-800 hover:text-emerald-600 hover:underline transition"
                >
                  {post.author_name || '익명'}
                </Link>
              ) : (
                <span className="font-bold text-gray-800">{post.author_name || '익명'}</span>
              )}
              <AdminBadge email={post.author_email} />
              <span className="text-gray-300">•</span>
              <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
            </div>

            {isPostAuthor && (
              <button
                onClick={handleDeletePost}
                className="text-rose-500 hover:text-rose-700 font-bold transition text-[11px]"
              >
                삭제
              </button>
            )}
          </div>
        </div>

        {/* 첨부파일/이미지 노출 */}
        {post.file_url && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
            {isImageFile(post.file_url, post.file_name) ? (
              <div className="rounded-lg overflow-hidden max-h-[500px] flex justify-center bg-black/5">
                <img
                  src={post.file_url}
                  alt={post.file_name || '첨부 이미지'}
                  className="object-contain max-w-full h-auto"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-gray-700 truncate">
                  📎 {post.file_name || '첨부파일'}
                </span>
                <a
                  href={post.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition shrink-0"
                >
                  다운로드
                </a>
              </div>
            )}
          </div>
        )}

        {/* 게시글 본문 */}
        <div className="text-gray-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap min-h-[100px] pt-2">
          {post.content}
        </div>
      </article>

      {/* 💬 댓글 영역 */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <h2 className="font-black text-gray-900 text-sm flex items-center gap-1.5">
          💬 댓글 <span className="text-emerald-600">{comments.length}</span>개
        </h2>

        {/* 댓글 입력 폼 */}
        {currentUser ? (
          <form onSubmit={handleCommentSubmit} className="space-y-2">
            <div className="relative">
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="댓글을 작성해 보세요. (@닉네임 으로 상대방을 지목하면 알림이 갑니다)"
                rows={3}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition resize-none"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>💡 <code>@닉네임</code>을 입력하면 해당 사용자에게 즉시 알림이 전송됩니다.</span>
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="px-4 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-xs transition touch-manipulation shadow-xs shrink-0"
              >
                {submittingComment ? '등록 중...' : '댓글 등록'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-500 font-medium text-xs">
            댓글을 남기시려면{' '}
            <Link href="/login" className="text-emerald-600 font-bold underline">
              로그인
            </Link>
            해 주세요.
          </div>
        )}

        {/* 댓글 목록 */}
        <div className="divide-y divide-gray-100 pt-2">
          {comments.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-medium">
              첫 번째 댓글을 작성해 보세요!
            </div>
          ) : (
            comments.map((comment) => {
              const commentAuthorUuid = comment.user_id;
              const isCommentAuthor = currentUser && currentUser.id === commentAuthorUuid;

              return (
                <div key={comment.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {commentAuthorUuid ? (
                        <Link
                          href={`/mypage/${commentAuthorUuid}`}
                          className="font-bold text-gray-800 hover:text-emerald-600 hover:underline transition"
                        >
                          {comment.author_name || '익명'}
                        </Link>
                      ) : (
                        <span className="font-bold text-gray-800">{comment.author_name || '익명'}</span>
                      )}
                      <AdminBadge email={comment.author_email} />
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400 text-[10px]">
                        {new Date(comment.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>

                    {isCommentAuthor && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-rose-500 font-bold transition text-[10px]"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap pl-0.5">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
