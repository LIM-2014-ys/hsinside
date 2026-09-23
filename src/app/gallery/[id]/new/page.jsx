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
  const [location, setLocation] = useState('Detecting...'); // 위치 추적 상태
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. 유저 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/login');
      } else {
        setUser(user);
      }
    });

    // 2. IP 기반 사용자 실제 접속 도시 위치 추적
    fetchUserLocation();
  }, [router]);

  // IP Geolocation API를 사용하여 접속 위치(도시명) 자동 감지
  const fetchUserLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        // 감지된 도시 이름 (예: Seoul, Hanam-si 등)
        if (data.city) {
          setLocation(data.city);
          return;
        }
      }
      // 백업 API
      const backupRes = await fetch('http://ip-api.com/json/');
      if (backupRes.ok) {
        const backupData = await backupRes.json();
        if (backupData.city) {
          setLocation(backupData.city);
          return;
        }
      }
      setLocation('Seoul'); // 추적 실패 시 기본값
    } catch (err) {
      console.warn('위치 추적 실패, 기본값 설정:', err);
      setLocation('Seoul');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    setLoading(true);
    const postCode = parseInt(Date.now().toString(), 10);

    const { error } = await supabase
      .from('posts')
      .insert([
        {
          title: title.trim(),
          content: content.trim(),
          gallery_id: parseInt(galleryId, 10),
          author_email: user.email,
          author_name: user.user_metadata?.display_name || user.email.split('@')[0],
          post_code: postCode,
          location: location === 'Detecting...' ? 'Seoul' : location, // 추적된 실제 접속 위치 저장
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">✍️ 새 게시글 작성</h1>
        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100">
          📍 접속 위치: {location}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">내용</label>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 작성해 보세요."
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded"
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
