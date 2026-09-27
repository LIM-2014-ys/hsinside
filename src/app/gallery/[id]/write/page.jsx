'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PostWritePage() {
  const { id: galleryId } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
      } else {
        setUser(user);
      }
    });
  }, []);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      alert('파일은 최대 5개까지 첨부할 수 있습니다.');
      return;
    }

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    const newPreviews = selectedFiles.map((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return {
        file,
        url: URL.createObjectURL(file),
        type: isImage ? 'image' : isVideo ? 'video' : 'document',
        name: file.name
      };
    });

    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert('제목과 내용을 입력해 주세요.');

    setLoading(true);

    try {
      const mediaFiles = [];
      const docFiles = [];

      // 기존에 존재하는 'post_images' 버킷에 업로드
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post_images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(filePath);

        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          mediaFiles.push({ url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'video' });
        } else {
          docFiles.push({ url: publicUrl, name: file.name });
        }
      }

      let location = 'Seoul';
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData.city) location = ipData.city;
      } catch (err) {}

      const authorNickname = user.user_metadata?.display_name || user.email.split('@')[0];
      const authorAvatar = user.user_metadata?.avatar_url || '';
      const postCode = Number(Date.now().toString() + Math.floor(Math.random() * 90 + 10));

      const { error: insertError } = await supabase.from('posts').insert([
        {
          gallery_id: galleryId,
          title,
          content,
          author_email: user.email,
          author_name: authorNickname,
          author_avatar: authorAvatar,
          location,
          post_code: postCode,
          media_files: mediaFiles,
          doc_files: docFiles
        }
      ]);

      if (insertError) throw insertError;

      alert('게시글이 성공적으로 등록되었습니다.');
      router.push(`/gallery/${galleryId}`);
    } catch (err) {
      alert(`등록 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 p-6 bg-white border rounded-xl shadow-sm space-y-4">
      <h1 className="text-base font-bold border-b pb-3 text-gray-900">✍️ 게시글 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none"
            placeholder="제목을 입력해 주세요."
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">내용</label>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border rounded-md text-xs leading-relaxed focus:outline-none"
            placeholder="내용을 작성해 주세요."
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">파일 첨부 (사진, 동영상, 문서)</label>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt,.xlsx"
            onChange={handleFileChange}
            className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {previews.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-bold text-gray-600">첨부 파일 미리보기 ({previews.length}/5)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previews.map((item, idx) => (
                <div key={idx} className="relative border rounded-lg p-2 bg-gray-50 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-bold z-10"
                  >
                    ✕
                  </button>

                  {item.type === 'image' && (
                    <img src={item.url} alt="미리보기" className="w-full h-24 object-cover rounded-md" />
                  )}

                  {item.type === 'video' && (
                    <video src={item.url} controls className="w-full h-24 object-cover rounded-md" />
                  )}

                  {item.type === 'document' && (
                    <div className="h-24 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-2xl">📄</span>
                      <span className="text-[10px] text-gray-600 break-all w-full mt-1">{item.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition"
        >
          {loading ? '업로드 중...' : '게시글 등록'}
        </button>
      </form>
    </div>
  );
}
