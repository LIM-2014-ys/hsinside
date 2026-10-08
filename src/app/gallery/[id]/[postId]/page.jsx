'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import AdminBadge from '@/components/AdminBadge';

function getTimeStampId(dateString) {
  if (!dateString) return '';
  return new Date(dateString).getTime();
}

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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

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
        console.error('데이터 조회 중 오류 발생:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

  const handleDeletePost = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        alert(`게시글 삭제 실패: ${error.message}`);
      } else {
        alert('게시글이 삭제되었습니다.');
        router.push(`/gallery/${galleryId}`);
      }
    } catch {
      alert('게시글 삭제 처리 중 오류가 발생했습니다.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            content: newComment.trim(),
            author_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '익명',
            author_email: user?.email || null,
          },
        ])
        .select('*')
        .single();

      if (error) {
        alert(`댓글 작성 실패: ${error.message}`);
      } else if (data) {
        setComments([...comments, data]);
        setNewComment('');
      }
    } catch {
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        alert(`댓글 삭제 실패: ${error.message}`);
      } else {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch {
      alert('댓글 삭제 처리 중 오류가 발생했습니다.');
    }
  };

  const isAdmin = isAdminEmail(user?.email);
  const isPostAuthor = user?.email && post?.author_email === user.email;
  const canDeletePost = isPostAuthor || isAdmin;

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

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
        >
          ← 갤러리 목록으로
        </Link>

        {canDeletePost && (
          <button
            onClick={handleDeletePost}
            className={`px-3 py-1.5 font-bold rounded-xl transition text-[11px] ${
              isAdmin && !isPostAuthor
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isAdmin && !isPostAuthor ? '🛡️ 관리자 강제 삭제' : '🗑️ 게시글 삭제'}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <span className="inline-block px-2 py-0.5 mb-1 bg-gray-100 text-gray-500 font-bold rounded-md text-[10px] font-mono">
            No. #{getTimeStampId(post.created_at)}
          </span>

          <h1 className="text-xl font-black text-gray-900 leading-snug">{post.title}</h1>

          <div className="flex items-center justify-between text-gray-400 text-[11px] mt-2 pt-2 border-t border-gray-50">
            <div className="flex items-center">
              <span className="font-bold text-gray-700">
                {post.author_name || post.author_email?.split('@')[0] || '익명'}
              </span>
              <AdminBadge email={post.author_email} />
            </div>
            <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
          </div>
        </div>

        <div className="text-gray-800 leading-relaxed min-h-[150px] whitespace-pre-wrap text-xs pt-2">
          {post.content}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-gray-900">💬 댓글 ({comments.length})</h3>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            placeholder={user ? '댓글을 작성해 보세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
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
                    <p className="text-gray-700 text-xs leading-normal">{comment.content}</p>
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
