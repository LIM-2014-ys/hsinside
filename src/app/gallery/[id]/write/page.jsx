'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function WritePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // 1. 토스트 알림 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  // 2. 페이지 로드 시 로그인 유저 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        showToast('로그인이 필요한 페이지입니다.', 'error');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      } else {
        setUser(currentUser);
      }
    };
    checkUser();
  }, [router]);

  // 3. 게시글 작성 등록 처리
  const handleSubmitPost = async (e) => {
    e.preventDefault();

    if (!title.trim()) return showToast('제목을 입력해 주세요.', 'error');
    if (!content.trim()) return showToast('내용을 입력해 주세요.', 'error');

    setLoading(true);

    try {
      // 로그인된 최신 유저 정보 확인
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        showToast('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.', 'error');
        setLoading(false);
        return;
      }

      // DB insert: author_email에 currentUser.email 전달 (NOT NULL 오류 해결)
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            author_email: currentUser.email, // 👈 NOT NULL 컬럼 값 필수 전달
            author_name: currentUser.user_metadata?.display_name || currentUser.email.split('@')[0],
            user_id: currentUser.id,
          },
        ]);

      if (error) {
        showToast('글 등록 실패: ' + error.message, 'error');
      } else {
        showToast('게시글이 성공적으로 등록되었습니다!', 'success');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1200);
      }
    } catch {
      showToast('게시글 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 🔔 토스트 UI */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900/90 text-white backdrop-blur-md rounded-2xl shadow-2xl transition-all duration-300">
          {toast.type === 'success' && <span className="text-emerald-400 font-bold">✓</span>}
          {toast.type === 'error' && <span className="text-rose-400 font-bold">✕</span>}
          {toast.type === 'info' && <span className="text-blue-400 font-bold">ℹ</span>}
          <span className="font-semibold text-xs tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* 헤더 영역 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">✏️ 글 작성하기</h1>
          <p className="text-gray-400 mt-1 text-[11px]">hsinside 커뮤니티에 새 글을 공유해 보세요.</p>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition"
        >
          취소
        </Link>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={handleSubmitPost} className="space-y-5">
        {/* 작성자 정보 표시 영역 */}
        {user && (
          <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between text-gray-600">
            <span className="font-semibold">
              작성자: <strong className="text-gray-900">{user.user_metadata?.display_name || '사용자'}</strong>
            </span>
            <span className="text-[11px] text-gray-400">{user.email}</span>
          </div>
        )}

        {/* 제목 입력 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1.5">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 내용 입력 */}
        <div>
          <label className="block font-bold text-gray-700 mb-1.5">내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 자유롭게 작성하세요..."
            rows={12}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y"
          />
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition"
          >
            돌아가기
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim()}
            className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? '등록 중...' : '게시글 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
