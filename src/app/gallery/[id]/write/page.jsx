'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostWritePage() {
  const { id: galleryId } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [isLocLoading, setIsLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/login');
        return;
      }
      setUser(user);
    }
    checkUser();
  }, [router]);

  // HTML5 Geolocation API로 실제 GPS/네트워크 위치 가져오기
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // OpenStreetMap Nominatim 역지오코딩 (위도/경도 -> 주소 변환)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ko`
          );
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;
            // 시/도 + 구/군/동 조합하여 깔끔하게 표기
            const city = addr.city || addr.province || addr.state || '';
            const district = addr.borough || addr.suburb || addr.city_district || addr.county || addr.town || '';
            const formattedLoc = `${city} ${district}`.trim() || '현재 위치';
            
            setLocation(formattedLoc);
          } else {
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        } catch (error) {
          alert('위치명을 불러오지 못했습니다.');
        } finally {
          setIsLocLoading(false);
        }
      },
      (error) => {
        setIsLocLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('위치 권한 허용이 거부되었습니다. 브라우저 설정에서 위치 권한을 확인해 주세요.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('위치 정보를 사용할 수 없습니다.');
            break;
          case error.TIMEOUT:
            alert('위치 요청 시간이 초과되었습니다.');
            break;
          default:
            alert('위치 정보를 가져오는 중 오류가 발생했습니다.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 게시글 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert('제목과 내용을 모두 입력해 주세요.');

    setSubmitting(true);
    const authorNickname = user.user_metadata?.display_name || user.email.split('@')[0];

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          gallery_id: galleryId,
          author_email: user.email,
          author_name: authorNickname,
          title: title.trim(),
          content: content.trim(),
          location: location || null,
        },
      ])
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      alert(`글 작성 실패: ${error.message}`);
    } else {
      // 올바른 상세페이지 경로로 이동 (/gallery/[galleryId]/[postId])
      router.push(`/gallery/${galleryId}/${data.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h1 className="text-base font-bold text-gray-900">✏️ {galleryId} 갤러리 글쓰기</h1>
        <Link href={`/gallery/${galleryId}`} className="text-xs text-gray-500 hover:text-black">
          취소
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* 위치 입력 및 자동 감지 버튼 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">📍 작성 위치</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 서울특별시 마포구 (선택 사항)"
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleFetchLocation}
              disabled={isLocLoading}
              className="px-3 py-2 bg-gray-100 border text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition disabled:opacity-50"
            >
              {isLocLoading ? '위치 찾는 중...' : '🎯 내 위치 감지'}
            </button>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해 주세요"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* 본문 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">내용</label>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 작성해 주세요..."
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {submitting ? '등록 중...' : '작성 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
