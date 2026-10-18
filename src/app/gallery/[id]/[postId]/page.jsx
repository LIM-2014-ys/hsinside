'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import AdminBadge from '@/components/AdminBadge';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();

  const galleryId = params.id;
  const postId = params.postId;

  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 사용자 정보 및 크롬 알림 권한 요청
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();

    // 크롬 알림 권한 요청
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // 게시글 및 댓글 초기 조회
  useEffect(() => {
    if (!postId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (!postError && postData) {
          setPost(postData);
        }

        const { data: commentData, error: commentError } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (!commentError && commentData) {
          setComments(commentData);
        }
      } catch (err) {
        console.error('데이터 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

  // Supabase Realtime: 실시간 댓글 감지 및 멘션 알림
  useEffect(() => {
    if (!postId || !user) return;

    const currentNickname =
      user?.user_metadata?.nickname ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0];

    const channel = supabase
      .channel(`comments-realtime-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const newC = payload.new;

          // 중복 추가 방지
          setComments((prev) => {
            if (prev.some((c) => c.id === newC.id)) return prev;
            return [...prev, newC];
          });

          // 본인이 쓴 글이 아니고, @내닉네임 이 포함된 경우 크롬 알림 발생
          if (
            currentNickname &&
            newC.author_email !== user.email &&
            newC.content.includes(`@${currentNickname}`)
          ) {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('💬 HSInside 멘션 알림', {
                body: `${newC.author_name}님이 회원님을 멘션했습니다: "${newC.content}"`,
                icon: '/favicon.ico',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user]);

  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const targetStr = (fileName || url).toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(targetStr);
  };

  // 댓글 본문의 @닉네임 하이라이트 렌더링 함수
  const renderCommentContent = (content) => {
    if (!content) return null;
    const mentionRegex = /(@[a-zA-Z0-9가-힣_-]+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, idx) => {
      if (mentionRegex.test(part)) {
        return (
          <span key={idx} className="text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleDeletePost = async () => {
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        setErrorMessage(`게시글 삭제 실패: ${error.message}`);
        setShowDeleteConfirm(false);
      } else {
        router.push(`/gallery/${galleryId}`);
      }
    } catch {
      setErrorMessage('게시글 삭제 처리 중 오류가 발생했습니다.');
      setShowDeleteConfirm(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setErrorMessage('');
    setSubmittingComment(true);

    try {
      const commentAuthorName = 
        user?.user_metadata?.nickname ||
        user?.user_metadata?.display_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        '익명';

      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            content: newComment.trim(),
            author_name: commentAuthorName,
            author_email: user?.email || null,
          },
        ])
        .select('*')
        .single();

      if (error) {
        setErrorMessage(`댓글 작성 실패: ${error.message}`);
      } else if (data) {
        setComments((prev) => {
          if (prev.some((c) => c.id === data.id)) return prev;
          return [...prev, data];
        });
        setNewComment('');
      }
    } catch {
      setErrorMessage('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        setErrorMessage(`댓글 삭제 실패: ${error.message}`);
      } else {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch {
      setErrorMessage('댓글 삭제 처리 중 오류가 발생했습니다.');
    }
  };

  const isAdmin = isAdminEmail(user?.email);
  const isPostAuthor = user?.email && post?.author_email === user.email;
  const canModifyPost = isPostAuthor || isAdmin;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-16 text-center text-gray-400 font-bold text-xs">
        📄 게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto my-16 text-center text-gray-400 font-bold text-xs space-y-3">
        <p>존재하지 않거나 삭제된 게시글입니다.</p>
        <Link
          href={`/gallery/${galleryId}`}
          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const hasImage = isImageFile(post.file_url, post.file_name);

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs space-y-6">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl text-xs">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 상단 네비게이션 & 수정/삭제 버튼 */}
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
        >
          ← 갤러리 목록으로
        </Link>

        {canModifyPost && (
          <div className="flex items-center gap-2">
            <Link
              href={`/gallery/${galleryId}/${postId}/edit`}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-[11px]"
            >
              ✏️ 게시글 수정
            </Link>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`px-3 py-1.5 font-bold rounded-xl transition text-[11px] ${
                  isAdmin && !isPostAuthor
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isAdmin && !isPostAuthor ? '🛡️ 관리자 삭제' : '🗑️ 삭제'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                <span className="text-rose-700 text-[10px] font-bold px-1">삭제할까요?</span>
                <button
                  onClick={handleDeletePost}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition"
                >
                  확인
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-[10px] transition"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 게시글 본문 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-snug">{post.title}</h1>

          <div className="flex items-center justify-between text-gray-400 text-[11px] mt-2 pt-2 border-t border-gray-50">
            <div className="flex items-center">
              <span className="font-bold text-gray-700">
                {post.author_name || '익명'}
              </span>
              <AdminBadge email={post.author_email} />
            </div>
            <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
          </div>
        </div>

        <div className="text-gray-800 leading-relaxed min-h-[100px] whitespace-pre-wrap text-xs pt-2 border-t border-gray-50">
          {post.content}
        </div>

        {hasImage && (
          <div className="pt-4 border-t border-gray-50 flex justify-center bg-gray-50/50 rounded-2xl p-2 border border-gray-100/80">
            <img
              src={post.file_url}
              alt={post.file_name || '첨부 이미지'}
              className="max-w-full h-auto rounded-xl shadow-sm object-contain max-h-[600px]"
            />
          </div>
        )}

        {post.file_url && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/70 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="text-sm">{hasImage ? '🖼️' : '📎'}</span>
              <span className="font-semibold text-gray-700 truncate text-xs">
                {post.file_name || '첨부파일'}
              </span>
            </div>
            <a
              href={post.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-[11px] shrink-0 transition"
            >
              다운로드
            </a>
          </div>
        )}
      </div>

      {/* 댓글 및 멘션 영역 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-gray-900">💬 댓글 ({comments.length})</h3>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            placeholder={user ? "댓글을 입력하세요. (@닉네임 으로 멘션 가능)" : "로그인 후 댓글을 작성할 수 있습니다."}
            disabled={!user || submittingComment}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!user || submittingComment || !newComment.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50"
          >
            등록
          </button>
        </form>

        <div className="divide-y divide-gray-100 pt-2">
          {comments.length === 0 ? (
            <p className="text-center py-6 text-gray-400 font-medium">등록된 댓글이 없습니다.</p>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor = user?.email && comment.author_email === user.email;
              const canDeleteComment = isCommentAuthor || isAdmin;

              return (
                <div key={comment.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-900 text-[11px]">
                        {comment.author_name || '익명'}
                      </span>
                      <AdminBadge email={comment.author_email} />
                      <span className="text-gray-400 text-[10px] ml-1">
                        {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-gray-700 text-xs leading-normal">
                      {renderCommentContent(comment.content)}
                    </p>
                  </div>

                  {canDeleteComment && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className={`text-[10px] px-2 py-1 font-bold rounded-lg transition ${
                        isAdmin && !isCommentAuthor
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'text-gray-400 hover:text-rose-600 hover:bg-gray-50'
                      }`}
                    >
                      {isAdmin && !isCommentAuthor ? '🛡️ 관리자 삭제' : '삭제'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
