'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostWritePage() {
  const router = useRouter();
  const params = useParams();
  const galleryId = params.id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 파일 업로드 상태
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const checkAuthAndBan = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('로그인 후 글을 작성할 수 있습니다.');
        router.replace('/login');
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      const userStatus = currentUser.user_metadata?.status;
      const userBanned = currentUser.user_metadata?.banned;

      if (userStatus === '이용정지' || userBanned === true) {
        setIsBanned(true);
        alert('🚫 귀하의 계정은 현재 이용 정지 상태이므로 글 작성이 제한됩니다.');
        router.replace(`/gallery/${galleryId}`);
      }
    };

    checkAuthAndBan();
  }, [galleryId, router]);

  // 📁 파일 직접 업로드 처리
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (isBanned) {
      alert('🚫 이용 정지 상태에서는 파일 업로드가 불가능합니다.');
      return;
    }

    setFile(selectedFile);
    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      setUploadedFileUrl(publicUrlData.publicUrl);
      alert('파일 업로드가 완료되었습니다.');
    } catch (err) {
      alert('파일 업로드 실패: ' + (err.message || '오류가 발생했습니다.'));
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  // ✍️ 게시글 DB 저장
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (isBanned) {
      alert('🚫 정지 상태에서는 글을 작성할 수 없습니다.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    setLoading(true);

    const generatedSlug = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const authorName = user.user_metadata?.display_name || user.email?.split('@')[0] || '익명';

    try {
      const { error } = await supabase.from('posts').insert([
        {
          gallery_id: galleryId,
          title: title.trim(),
          content: content.trim(),
          author_name: authorName,
          author_email: user.email,
          user_id: user.id,
          file_url: uploadedFileUrl || null,
          is_censored: false, // 📌 업로드 시 기본 검열 해제(false) 저장
          slug: generatedSlug,
        },
      ]);

      if (error) {
        alert('글 작성 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('게시글이 성공적으로 등록되었습니다.');
        router.push(`/gallery/${galleryId}`);
      }
    } catch {
      alert('글 작성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (isBanned) return null;

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
        >
          ← 목록으로
        </Link>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">✍ 새 글 작성</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-bold text-gray-700 mb-1">게시글 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">첨부 파일 / 이미지 (선택)</label>
          <div className="p-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
            <input
              type="file"
              accept="image/*, .pdf, .zip"
              onChange={handleFileChange}
              disabled={uploading}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {uploading && <p className="text-blue-600 font-bold text-[11px]">⏳ 파일 업로드 진행 중...</p>}
            {uploadedFileUrl && (
              <div className="pt-2 flex items-center gap-2 text-emerald-600 font-bold text-[11px]">
                <span>✓ 파일 업로드 완료</span>
                {file && <span className="text-gray-400 font-normal">({file.name})</span>}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 작성하세요..."
            rows={8}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-200 text-xs"
          >
            {loading ? '게시글 등록 중...' : '작성 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
