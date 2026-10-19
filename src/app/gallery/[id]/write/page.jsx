'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PostWritePage() {
  const params = useParams();
  const router = useRouter();
  
  // URL 파라미터가 [id]일 경우 params.id로 추출
  const galleryId = params.id || 'free';

  const [currentUser, setCurrentUser] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      setCurrentUser(user);
    };
    getUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !currentUser || submitting) return;

    setSubmitting(true);
    try {
      const authorDisplayName =
        currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.nickname ||
        currentUser.email?.split('@')[0] ||
        '익명';

      const postPayload = {
        gallery_id: galleryId,
        user_id: currentUser.id,
        author_id: currentUser.id,
        author_name: authorDisplayName,
        title: title.trim(),
        content: content.trim(),
      };

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert([postPayload])
        .select()
        .single();

      if (error) {
        console.error('DB Insert 에러 상세:', error);
        alert(`글 작성 실패: ${error.message}`);
        return;
      }

      if (newPost) {
        // 🚀 팔로워 푸시 알림 연동
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_post',
            targetUserId: currentUser.id,
            title: `📢 ${authorDisplayName}님이 새 글을 올렸습니다.`,
            body: title.trim(),
            url: `/gallery/${galleryId}/${newPost.id}`,
          }),
        }).catch((err) => console.error('새 글 푸시 발송 실패:', err));

        router.push(`/gallery/${galleryId}/${newPost.id}`);
      }
    } catch (err) {
      console.error('글 작성 처리 예외:', err);
      alert('글 작성 중 시스템 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-6 p-6 bg-white border border-gray-100 rounded-3xl shadow-xs space-y-4 font-sans text-xs">
      <h1 className="text-base font-black text-gray-900 border-b pb-3">✍️ 새 글 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-bold text-gray-700 mb-1">제목</label>
          <input
            type="text"
            placeholder="제목을 입력해 주세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">내용</label>
          <textarea
            rows={8}
            placeholder="내용을 작성해 주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs resize-none leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl transition disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '게시글 등록하기'}
        </button>
      </form>
    </div>
  );
}
