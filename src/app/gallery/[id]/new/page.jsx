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
  const [location, setLocation] = useState('Detecting...');

  // 이미지 관련 상태
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
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

    fetchUserLocation();
  }, [router]);

  // IP 기반 위치 추적
  const fetchUserLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.city) {
          setLocation(data.city);
          return;
        }
      }
      setLocation('Seoul');
    } catch {
      setLocation('Seoul');
    }
  };

  // 이미지 파일 선택 핸들러
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      alert('이미지는 최대 5장까지 첨부할 수 있습니다.');
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // 미리보기 URL 생성
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);
  };

  // 이미지 삭제
  const handleRemoveImage = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);

    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedPreviews);
  };

  // Supabase Storage로 이미지 파일 업로드
  const uploadImages = async () => {
    const uploadedUrls = [];

    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('이미지 업로드 에러:', uploadError);
        continue;
      }

      // 업로드된 이미지의 Public URL 가져오기
      const { data } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        uploadedUrls.push(data.publicUrl);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    setLoading(true);

    try {
      // 1. 이미지 업로드 실행
      const imageUrls = await uploadImages();

      // 2. 게시글 등록 (image_urls 배열 저장)
      const postCode = parseInt(Date.now().toString(), 10);

      const { error } = await supabase.from('posts').insert([
        {
          title: title.trim(),
          content: content.trim(),
          gallery_id: parseInt(galleryId, 10),
          author_email: user.email,
          author_name: user.user_metadata?.display_name || user.email.split('@')[0],
          post_code: postCode,
          location: location === 'Detecting...' ? 'Seoul' : location,
          image_urls: imageUrls, // 업로드된 이미지 URL 목록
        },
      ]);

      if (error) throw error;

      router.push(`/gallery/${galleryId}/${postCode}`);
    } catch (err) {
      console.error('게시글 작성 에러:', err);
      alert(`게시글 등록 실패: ${err.message}`);
    } finally {
      setLoading(false);
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

        {/* 사진 첨부 섹션 */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            📷 사진 첨부 (최대 5장)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />

          {/* 이미지 미리보기 목록 */}
          {previewUrls.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative group flex-shrink-0">
                  <img
                    src={url}
                    alt={`미리보기 ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
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
            {loading ? '이미지 및 글 등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
