'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewPostPage() {
  const { id: galleryId } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/login');
      } else {
        setUser(user);
      }
    });
  }, [router]);

  // 13자리 고유 숫자 생성 함수 (예: 5348590389028)
  const generatePostCode = () => {
    return parseInt(Date.now().toString(), 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    const postCode = generatePostCode();

    const { error } = await supabase
      .from('posts')
      .insert([
        {
          title: title.trim(),
          content: content.trim(),
          gallery_id: parseInt(galleryId, 10),
          author_email: user.email,
          author_name: user.email.split('@')[0],
          post_code: postCode,
          likes: 0
        }
      ]);

    setLoading(false);

    if (error) {
      alert(`게시글 등록 실패: ${error.message}`);
    } else {
      router.push(`/gallery/${galleryId}/${postCode}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow border border-gray-200 mt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">✍️ 새 게시글 작성</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">내용</label>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="자유롭게 이야기를 써보세요."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
