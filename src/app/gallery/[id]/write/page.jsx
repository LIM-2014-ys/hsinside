'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function WritePostPage() {
  const { id: rawGalleryId } = useParams();
  const galleryId = decodeURIComponent(rawGalleryId);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [autoLocation, setAutoLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. 접속 시 브라우저 GPS 위치 자동 수집 (사용자 입력 X)
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setAutoLocation(`${lat}, ${lng}`);
        },
        (error) => {
          console.warn('위치 권한 거부 또는 실패:', error.message);
        }
      );
    }
  }, []);

  // 파일 선택 변경 핸들러
  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // 2. 글 저장 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const uploadedFileUrls = [];

      // 3. 첨부파일 Supabase Storage('attachments')에 업로드
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('파일 업로드 에러:', uploadError);
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            uploadedFileUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // 4. posts 테이블에 저장 (gallery_id, title, content, author_name, location, media_files)
      const { error: insertError } = await supabase.from('posts').insert([
        {
          gallery_id: galleryId,
          title: title.trim(),
          content: content.trim(),
          author_name: authorName.trim() || '익명',
          location: autoLocation, // 자동으로 가져온 위치 저장
          media_files: uploadedFileUrls, // 업로드된 파일 URL 배열 저장
        },
      ]);

      if (insertError) {
        alert('글 등록에 실패했습니다: ' + insertError.message);
      } else {
        alert('글이 성공적으로 등록되었습니다.');
        router.push(`/gallery/${encodeURIComponent(galleryId)}`);
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-base font-bold text-gray-900">✏️ 새 글 작성</h1>
        <Link
          href={`/gallery/${encodeURIComponent(galleryId)}`}
          className="text-xs text-gray-500 hover:underline"
        >
          취소
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-gray-700 mb-1">작성자</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="닉네임 (미입력 시 익명)"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={8}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* 파일 첨부 영역 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">파일 첨부</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full text-xs text-gray-500 border rounded-md p-2 bg-gray-50 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {files.length > 0 && (
            <p className="mt-1 text-[11px] text-gray-500">
              선택된 파일: {files.map((f) => f.name).join(', ')}
            </p>
          )}
        </div>

        <div className="pt-4 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {submitting ? '등록 중...' : '게시글 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
