'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();

  const galleryId = params.id;
  const postId = params.postId;

  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [currentFileUrl, setCurrentFileUrl] = useState(null);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [deleteFileFlag, setDeleteFileFlag] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 사용자 정보 및 게시글 기존 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (postError || !postData) {
          setErrorMessage('게시글 정보를 불러올 수 없습니다.');
          return;
        }

        // 권한 체크 (작성자 또는 관리자)
        const isAdmin = isAdminEmail(currentUser?.email);
        const isAuthor = currentUser?.email && postData.author_email === currentUser.email;

        if (!isAuthor && !isAdmin) {
          setErrorMessage('게시글을 수정할 권한이 없습니다.');
          return;
        }

        setPost(postData);
        setTitle(postData.title || '');
        setContent(postData.content || '');
        setCurrentFileUrl(postData.file_url || null);
        setCurrentFileName(postData.file_name || null);
      } catch (err) {
        console.error('데이터 조회 오류:', err);
        setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

  // 수정 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim() || !content.trim()) {
      setErrorMessage('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);

    try {
      let updatedFileUrl = currentFileUrl;
      let updatedFileName = currentFileName;

      // 파일 삭제가 요청된 경우
      if (deleteFileFlag) {
        updatedFileUrl = null;
        updatedFileName = null;
      }

      // 새 파일이 업로드된 경우
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${galleryId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase
          .storage
          .from('gallery-files')
          .upload(filePath, file);

        if (uploadError) {
          setErrorMessage(`파일 업로드 실패: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase
          .storage
          .from('gallery-files')
          .getPublicUrl(filePath);

        updatedFileUrl = publicUrlData?.publicUrl || null;
        updatedFileName = file.name;
      }

      // DB 게시글 업데이트
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          file_url: updatedFileUrl,
          file_name: updatedFileName,
        })
        .eq('id', postId);

      if (updateError) {
        setErrorMessage(`게시글 수정 실패: ${updateError.message}`);
      } else {
        router.push(`/gallery/${galleryId}/${postId}`);
      }
    } catch (err) {
      console.error('글 수정 오류:', err);
      setErrorMessage('게시글 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-16 text-center text-gray-400 font-bold text-xs">
        📄 게시글 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href={`/gallery/${galleryId}/${postId}`}
            className="text-[11px] text-gray-400 hover:text-gray-600 font-bold mb-1 inline-block transition"
          >
            ← 게시글로 돌아가기
          </Link>
          <h1 className="text-xl font-black text-gray-900">✏️ 게시글 수정</h1>
        </div>
      </div>

      {/* 수정 폼 */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            제목
          </label>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
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
            onChange={(e) => {
              setContent(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition resize-y"
          />
        </div>

        {/* 기존 첨부파일 표시 및 변경 영역 */}
        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            사진 및 파일 첨부
          </label>

          {currentFileUrl && !deleteFileFlag && (
            <div className="mb-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <span className="text-gray-700 text-[11px] truncate pr-2">
                현재 파일: <strong>{currentFileName || '첨부파일'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setDeleteFileFlag(true)}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-[10px] transition shrink-0"
              >
                기존 파일 삭제
              </button>
            </div>
          )}

          {deleteFileFlag && (
            <div className="mb-2 p-2 bg-rose-50 text-rose-600 text-[11px] rounded-xl flex items-center justify-between font-semibold">
              <span>기존 첨부파일이 삭제 예정 상태입니다.</span>
              <button
                type="button"
                onClick={() => setDeleteFileFlag(false)}
                className="text-gray-500 underline text-[10px]"
              >
                취소
              </button>
            </div>
          )}

          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              if (e.target.files?.[0]) {
                setDeleteFileFlag(false);
              }
            }}
            disabled={submitting}
            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition cursor-pointer"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href={`/gallery/${galleryId}/${postId}`}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-xs"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50"
          >
            {submitting ? '수정 중...' : '게시글 수정 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
