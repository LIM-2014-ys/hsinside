'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';

export default function PostEditPage() {
  const params = useParams();
  const router = useRouter();

  const galleryId = params.id;
  const postId = params.postId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 권한 검증 및 데이터 조회
  useEffect(() => {
    if (!postId) return;

    const checkAuthAndFetchPost = async () => {
      setLoading(true);
      try {
        // 1. 현재 로그인된 사용자 정보 가져오기
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          alert('로그인이 필요한 서비스입니다.');
          router.replace(`/gallery/${galleryId}/${postId}`);
          return;
        }

        // 2. 게시글 데이터 조회
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (postError || !postData) {
          setErrorMessage('존재하지 않거나 삭제된 게시글입니다.');
          setLoading(false);
          return;
        }

        // 3. 수정 권한 검증 (작성자 본인 또는 관리자만 허용)
        const isAuthor = currentUser.email && postData.author_email === currentUser.email;
        const isAdmin = isAdminEmail(currentUser.email);

        if (!isAuthor && !isAdmin) {
          alert('게시글 수정 권한이 없습니다.');
          router.replace(`/gallery/${galleryId}/${postId}`);
          return;
        }

        // 권한 통과 시 기존 입력값 세팅
        setTitle(postData.title || '');
        setContent(postData.content || '');
      } catch (err) {
        console.error('수정 권한 확인 오류:', err);
        setErrorMessage('수정 권한을 확인하는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchPost();
  }, [postId, galleryId, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMessage('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        setErrorMessage(`수정 실패: ${error.message}`);
      } else {
        router.push(`/gallery/${galleryId}/${postId}`);
      }
    } catch {
      setErrorMessage('게시글 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-12 text-center text-gray-400 font-bold text-xs px-4">
        🔒 수정 권한 및 게시글 정보를 확인 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-4 sm:my-8 px-3 sm:px-4 font-sans text-xs space-y-4">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between border-b pb-3">
        <h1 className="text-sm sm:text-base font-bold text-gray-900">
          ✏️ 게시글 수정
        </h1>
        <Link
          href={`/gallery/${galleryId}/${postId}`}
          className="px-3 py-1.5 bg-gray-100 active:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px] touch-manipulation"
        >
          취소
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl text-xs">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 수정 폼 카드 */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-gray-800 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1">
            내용
          </label>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-gray-800 leading-relaxed touch-manipulation resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50 touch-manipulation"
          >
            {submitting ? '수정 중...' : '수정 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
