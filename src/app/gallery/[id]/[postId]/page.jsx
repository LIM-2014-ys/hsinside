'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const { id: galleryId, postId } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError || !postData) {
        alert('존재하지 않거나 삭제된 게시글입니다.');
        router.push(`/gallery/${galleryId}`);
        return;
      }
      setPost(postData);
      fetchComments();
      setLoading(false);
    }

    fetchData();
  }, [galleryId, postId, router]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) setComments(data);
  };

  // 신고 제출 공통 함수
  const handleReport = async (targetType, targetId) => {
    if (!user) return alert('로그인 후 신고가 가능합니다.');

    const reason = prompt('신고 사유를 입력해 주세요 (예: 스팸, 욕설, 타인 비방 등):');
    if (!reason || !reason.trim()) return;

    const { error } = await supabase.from('reports').insert([
      {
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim(),
        reporter_email: user.email,
      },
    ]);

    if (error) {
      alert(`신고 접수 실패: ${error.message}`);
    } else {
      alert('신고가 접수되었습니다. 관리자 검토 후 조치됩니다.');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');
    if (!newComment.trim()) return alert('댓글 내용을 입력해 주세요.');

    setSubmitting(true);
    const authorNickname = user.user_metadata?.display_name || user.email.split('@')[0];

    const { error } = await supabase.from('comments').insert([
      {
        post_id: postId,
        author_email: user.email,
        author_name: authorNickname,
        content: newComment.trim(),
        parent_id: null,
      },
    ]);

    setSubmitting(false);

    if (error) {
      alert(`댓글 작성 실패: ${error.message}`);
    } else {
      setNewComment('');
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) fetchComments();
  };

  if (loading) return <div className="max-w-2xl mx-auto my-12 text-center text-xs text-gray-500">로딩 중...</div>;

  const rootComments = comments.filter((c) => !c.parent_id);

  return (
    <div className="max-w-2xl mx-auto my-6 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <Link href={`/gallery/${galleryId}`} className="text-xs font-bold text-gray-600 hover:text-black">
          ← 목록으로 돌아가기
        </Link>
        {/* 게시글 신고 버튼 */}
        <button
          onClick={() => handleReport('post', post.id)}
          className="text-xs text-red-500 hover:underline font-semibold"
        >
          🚨 게시글 신고
        </button>
      </div>

      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">{post.title}</h1>
        <div className="flex justify-between items-center text-xs text-gray-500 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">{post.author_name}</span>
            <span>•</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          {post.location && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px]">📍 {post.location}</span>}
        </div>

        <div className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap py-2">{post.content}</div>
      </div>

      {/* 댓글 영역 */}
      <div className="pt-6 border-t space-y-4">
        <h2 className="text-xs font-bold text-gray-900">💬 댓글 ({comments.length})</h2>

        <form onSubmit={handleCommentSubmit} className="space-y-2">
          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? '댓글을 입력해 주세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
            disabled={!user || submitting}
            className="w-full p-3 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!user || submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition disabled:bg-gray-300"
            >
              {submitting ? '등록 중...' : '댓글 작성'}
            </button>
          </div>
        </form>

        <div className="space-y-3 pt-2">
          {rootComments.map((comment) => {
            const isMyComment = user && user.email === comment.author_email;
            return (
              <div key={comment.id} className="border-b pb-3 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">{comment.author_name}</span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                    {isMyComment ? (
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:underline">
                        삭제
                      </button>
                    ) : (
                      <button onClick={() => handleReport('comment', comment.id)} className="text-gray-400 hover:text-red-500">
                        🚨 신고
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">{comment.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
