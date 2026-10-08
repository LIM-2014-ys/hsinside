'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params.id;

  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 현재 로그인한 사용자 정보 로드
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // 게시글 등록 처리
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // author_email과 author_name을 명시적으로 포함하여 DB 저장
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            gallery_id: galleryId,
            title: title.trim(),
            content: content.trim(),
            author_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '익명',
            author_email: user?.email || null,
          },
        ])
        .select('*')
        .single();

      if (error) {
        alert(`게시글 등록 실패: ${error.message}`);
      } else if (data) {
        alert('게시글이 등록되었습니다.');
        router.push(`/gallery/${galleryId}`);
      }
    } catch (err) {
      console.error('글 작성 오류:', err);
      alert('게시글 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href={`/gallery/${galleryId}`}
            className="text-[11px] text-gray-400 hover:text-gray-600 font-bold mb-1 inline-block transition"
          >
            ← 갤러리로 돌아가기
          </Link>
          <h1 className="text-xl font-black text-gray-900">✏️ 새 게시글 작성</h1>
        </div>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            제목
          </label>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            내용
          </label>
          <textarea
            rows={10}
            placeholder="내용을 작성해 보세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href={`/gallery/${galleryId}`}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-xs"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '게시글 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
