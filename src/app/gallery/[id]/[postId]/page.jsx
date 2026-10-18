'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import AdminBadge from '@/components/AdminBadge';
import ReportModal from '@/components/ReportModal';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();

  const galleryId = params.id;
  const postId = params.postId;

  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [registeredNicknames, setRegisteredNicknames] = useState(new Set());
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // 사용자 정보 로드 및 알림 권한 요청
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // 게시글, 댓글 및 등록된 닉네임 데이터 조회
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

        // 등록된 닉네임 수집 (profiles 테이블 + 게시글/댓글 작성자)
        const nameSet = new Set();

        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname');

        if (profileData) {
          profileData.forEach((p) => {
            if (p.nickname) nameSet.add(p.nickname.trim());
          });
        }

        if (postData?.author_name) nameSet.add(postData.author_name.trim());
        if (commentData) {
          commentData.forEach((c) => {
            if (c.author_name) nameSet.add(c.author_name.trim());
          });
        }

        setRegisteredNicknames(nameSet);
      } catch (err) {
        console.error('데이터 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

  // Realtime 실시간 감지: 댓글 작성 알림 및 멘션 알림
  useEffect(() => {
    if (!postId || !user || !post) return;

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

          setComments((prev) => {
            if (prev.some((c) => c.id === newC.id)) return prev;
            return [...prev, newC];
          });

          if (newC.author_name) {
            setRegisteredNicknames((prev) => new Set(prev).add(newC.author_name.trim()));
          }

          if (newC.author_email !== user.email) {
            const hasNotificationPermission =
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted';

            if (hasNotificationPermission) {
              const commenterName = newC.author_name || '익명';

              if (post.author_email && post.author_email === user.email) {
                new Notification('💬 게시물 댓글 알림', {
                  body: `${commenterName}님이 회원님의 게시물에 댓글을 달았습니다: "${newC.content}"`,
                  icon: '/favicon.ico',
                });
              } else if (currentNickname && newC.content.includes(`@${currentNickname}`)) {
                new Notification('💬 멘션 알림', {
                  body: `${commenterName}님이 회원님을 멘션했습니다: "${newC.content}"`,
                  icon: '/favicon.ico',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user, post]);

  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const targetStr = (fileName || url).toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(targetStr);
  };

  // 유튜브 URL 파싱 및 Embed 플레이어 주소 추출
  const getYouTubeEmbedUrl = (urlStr) => {
    try {
      const validUrl = urlStr.startsWith('www.') ? `https://${urlStr}` : urlStr;
      const parsed = new URL(validUrl);
      let videoId = null;

      if (parsed.hostname.includes('youtube.com')) {
        if (parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
        } else if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0]?.split('?')[0];
        } else {
          videoId = parsed.searchParams.get('v');
        }
      } else if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1).split('/')[0]?.split('?')[0];
      }

      return (videoId && videoId.length === 11) ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  };

  // 멘션 및 하이퍼링크 렌더링 함수 (isComment: 댓글 여부 구분)
  const renderContent = (content, isComment = false) => {
    if (!content) return null;

    const tokenRegex = /((?:https?:\/\/|www\.)[^\s]+|@[^\s,.:;!?"'()\[\]{}]+)/g;
    const parts = content.split(tokenRegex);
    const youtubeEmbeds = [];

    const renderedText = parts.map((part, idx) => {
      if (!part) return null;

      // 1. 등록된 닉네임 멘션 처리
      if (part.startsWith('@')) {
        const rawNickname = part.slice(1).trim();
        if (registeredNicknames.has(rawNickname)) {
          return (
            <span key={idx} className="text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded break-all">
              {part}
            </span>
          );
        }
        return part;
      }

      // 2. 범용 URL 감지 및 하이퍼링크 처리 (이모지 제거됨)
      if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
        let cleanUrl = part;
        let trailingPunct = '';

        const matchPunct = cleanUrl.match(/([.,;:!?)]+)$/);
        if (matchPunct) {
          trailingPunct = matchPunct[0];
          cleanUrl = cleanUrl.slice(0, -trailingPunct.length);
        }

        const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
        
        const targetHref = href
          .replace('://m.sports.naver.com', '://sports.naver.com')
          .replace('://m.news.naver.com', '://news.naver.com');

        // 게시글 본문일 경우에만 유튜브 미디어 플레이어 추출
        if (!isComment) {
          const embedUrl = getYouTubeEmbedUrl(targetHref);
          if (embedUrl && !youtubeEmbeds.includes(embedUrl)) {
            youtubeEmbeds.push(embedUrl);
          }
        }

        return (
          <span key={idx}>
            <a
              href={targetHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium break-all active:text-blue-900"
            >
              {cleanUrl}
            </a>
            {trailingPunct}
          </span>
        );
      }

      return part;
    });

    return (
      <div className="space-y-3">
        <div>{renderedText}</div>

        {/* 게시글 본문일 때만 유튜브 동영상 플레이어 삽입 */}
        {!isComment && youtubeEmbeds.map((embedUrl, yIdx) => (
          <div key={yIdx} className="my-3 aspect-video w-full max-w-lg overflow-hidden rounded-xl border border-gray-100 shadow-xs bg-black">
            <iframe
              src={embedUrl}
              title={`YouTube video player ${yIdx + 1}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ))}
      </div>
    );
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
        setRegisteredNicknames((prev) => new Set(prev).add(commentAuthorName.trim()));
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
      <div className="max-w-4xl mx-auto my-12 text-center text-gray-400 font-bold text-xs px-4">
        📄 게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto my-12 text-center text-gray-400 font-bold text-xs space-y-3 px-4">
        <p>존재하지 않거나 삭제된 게시글입니다.</p>
        <Link
          href={`/gallery/${galleryId}`}
          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const hasImage = isImageFile(post.file_url, post.file_name);

  return (
    <div className="max-w-4xl mx-auto my-4 sm:my-8 px-3 sm:px-4 font-sans text-xs space-y-4 sm:space-y-6">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl text-xs">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 상단 네비게이션 & 버튼 */}
      <div className="flex items-center justify-between gap-2 border-b pb-3 sm:pb-4">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px] shrink-0 touch-manipulation"
        >
          ← 갤러리 목록
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {!isPostAuthor && (
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="px-3 py-1.5 bg-gray-100 active:bg-rose-50 text-gray-600 hover:text-rose-600 border border-transparent hover:border-rose-200 font-bold rounded-xl transition text-[11px] flex items-center gap-1 active:scale-95 touch-manipulation"
            >
              🚨 신고
            </button>
          )}

          {canModifyPost && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href={`/gallery/${galleryId}/${postId}/edit`}
                className="px-3 py-1.5 bg-emerald-50 active:bg-emerald-100 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-[11px] touch-manipulation"
              >
                ✏️ 수정
              </Link>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`px-3 py-1.5 font-bold rounded-xl transition text-[11px] touch-manipulation ${
                    isAdmin && !isPostAuthor
                      ? 'bg-rose-100 text-rose-700 active:bg-rose-200'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {isAdmin && !isPostAuthor ? '🛡️ 관리자 삭제' : '🗑️ 삭제'}
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
                  <span className="text-rose-700 text-[10px] sm:text-[11px] font-bold px-1">삭제할까요?</span>
                  <button
                    onClick={handleDeletePost}
                    className="px-2.5 py-1 bg-rose-600 active:bg-rose-700 text-white font-bold rounded-lg text-[10px] sm:text-[11px] transition touch-manipulation"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 bg-gray-200 active:bg-gray-300 text-gray-700 font-bold rounded-lg text-[10px] sm:text-[11px] transition touch-manipulation"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 게시글 본문 카드 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <div>
          <h1 className="text-[13px] sm:text-[15px] font-bold text-gray-900 leading-snug break-words">
            {post.title}
          </h1>

          <div className="flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] mt-2 pt-2 border-t border-gray-50 gap-2 min-w-0">
            <div className="flex items-center gap-1 truncate min-w-0">
              <span className="font-bold text-gray-700 truncate">
                {post.author_name || '익명'}
              </span>
              <AdminBadge email={post.author_email} />
            </div>
            <span className="shrink-0 whitespace-nowrap text-gray-400">
              {new Date(post.created_at).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>

        {/* 게시글 본문 (유튜브 영상 플레이어 삽입 포함) */}
        <div className="text-gray-800 leading-normal min-h-[60px] sm:min-h-[80px] whitespace-pre-wrap text-[11px] sm:text-[12px] pt-2 border-t border-gray-50 break-words select-text">
          {renderContent(post.content, false)}
        </div>

        {hasImage && (
          <div className="pt-3 border-t border-gray-50 flex justify-center bg-gray-50/50 rounded-xl p-1.5 sm:p-2 border border-gray-100/80">
            <img
              src={post.file_url}
              alt={post.file_name || '첨부 이미지'}
              className="max-w-full h-auto rounded-lg sm:rounded-xl shadow-xs object-contain max-h-[70vh] sm:max-h-[600px] w-full"
            />
          </div>
        )}

        {post.file_url && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/70 p-2.5 sm:p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="text-xs sm:text-sm shrink-0">{hasImage ? '🖼️' : '📎'}</span>
              <span className="font-semibold text-gray-700 truncate text-[10px] sm:text-[11px]">
                {post.file_name || '첨부파일'}
              </span>
            </div>
            <a
              href={post.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-2.5 py-1.5 bg-white border border-gray-200 active:bg-gray-100 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-[10px] sm:text-[11px] shrink-0 transition touch-manipulation"
            >
              다운로드
            </a>
          </div>
        )}
      </div>

      {/* 댓글 영역 (하단 댓글은 텍스트 하이퍼링크만 깔끔하게 연결) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <h3 className="font-bold text-xs sm:text-sm text-gray-900">💬 댓글 ({comments.length})</h3>

        <form onSubmit={handleAddComment} className="flex gap-1.5">
          <input
            type="text"
            placeholder={user ? "댓글 입력... (@닉네임 멘션)" : "로그인 후 작성 가능"}
            disabled={!user || submittingComment}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-[11px] placeholder:text-[10px] sm:placeholder:text-[11px] text-gray-800 disabled:bg-gray-50 touch-manipulation"
          />
          <button
            type="submit"
            disabled={!user || submittingComment || !newComment.trim()}
            className="px-3.5 py-2 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px] shrink-0 disabled:opacity-50 touch-manipulation"
          >
            등록
          </button>
        </form>

        <div className="divide-y divide-gray-100 pt-1">
          {comments.length === 0 ? (
            <p className="text-center py-5 text-gray-400 font-medium text-[11px]">등록된 댓글이 없습니다.</p>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor = user?.email && comment.author_email === user.email;
              const canDeleteComment = isCommentAuthor || isAdmin;

              return (
                <div key={comment.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-gray-900 text-[11px] truncate max-w-[140px]">
                        {comment.author_name || '익명'}
                      </span>
                      <AdminBadge email={comment.author_email} />
                      <span className="text-gray-400 text-[9px] sm:text-[10px] ml-0.5 whitespace-nowrap shrink-0">
                        {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div className="text-gray-700 text-[11px] sm:text-xs leading-snug break-words select-text">
                      {renderContent(comment.content, true)}
                    </div>
                  </div>

                  {canDeleteComment && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className={`text-[10px] px-2 py-0.5 font-bold rounded-lg transition shrink-0 touch-manipulation ${
                        isAdmin && !isCommentAuthor
                          ? 'bg-rose-50 text-rose-600 active:bg-rose-100'
                          : 'text-gray-400 active:text-rose-600 hover:text-rose-600 active:bg-gray-50'
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

      {/* 신고 모달 */}
      <ReportModal
        postId={postId}
        postAuthorId={post.user_id || post.author_id}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}
