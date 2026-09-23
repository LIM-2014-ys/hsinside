'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryPage() {
  const params = useParams();
  const galleryId = params?.id;

  const [user, setUser] = useState(null);
  const [galleryName, setGalleryName] = useState('');
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  
  // alert 대신 사용할 토스트 메시지 상태
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });
  const router = useRouter();

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast({ visible: false, message: '', isError: false });
    }, 3000);
  };

  useEffect(() => {
    if (galleryId) {
      checkAuthAndInit();
    }
  }, [galleryId]);

  const checkAuthAndInit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session.user);
    loadGalleryInfo();
    loadPosts();
  };

  const loadGalleryInfo = async () => {
    const { data } = await supabase
      .from('galleries')
      .select('name')
      .eq('id', galleryId)
      .single();

    if (data) setGalleryName(data.name);
    else setGalleryName(galleryId);
  };

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data);
      data.forEach((post) => loadComments(post.id));
    }
  };

  const createPost = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('제목과 내용을 모두 입력해 주세요.', true);
      return;
    }

    const { error } = await supabase.from('posts').insert([{
      gallery_id: galleryId,
      title: title.trim(),
      content: content.trim(),
      author_email: user.email
    }]);

    if (error) {
      showToast('글 작성 실패: ' + error.message, true);
    } else {
      setTitle('');
      setContent('');
      showToast('게시글이 등록되었습니다!');
      loadPosts();
    }
  };

  const loadComments = async (postId) => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data) {
      setComments((prev) => ({ ...prev, [postId]: data }));
    }
  };

  const addComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) {
      showToast('댓글 내용을 입력해 주세요.', true);
      return;
    }

    const { error } = await supabase.from('comments').insert([{
      post_id: postId,
      content: text,
      author_email: user.email
    }]);

    if (error) {
      showToast('댓글 작성 실패: ' + error.message, true);
    } else {
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      showToast('댓글이 작성되었습니다.');
      loadComments(postId);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return <p className="p-4 text-center text-sm text-gray-500">로딩 중...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 relative">
      {/* Toast 알림 팝업 */}
      {toast.visible && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-md shadow-lg text-sm text-white transition-all transform ${
          toast.isError ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200 mb-6">
        <h2 className="text-2xl font-bold">🎮 {galleryName}</h2>
        <div className="flex gap-2">
          <Link href="/" className="border border-gray-300 px-3 py-1 text-sm rounded-md hover:bg-gray-100 transition">
            전체 목록
          </Link>
          <button onClick={handleLogout} className="border border-gray-300 px-3 py-1 text-sm rounded-md hover:bg-gray-100 transition">
            로그아웃
          </button>
        </div>
      </header>

      <section className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-lg font-bold mb-3">✍️ 글 쓰기</h3>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md mb-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <textarea
          rows={4}
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md mb-3 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={createPost}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md font-medium transition"
        >
          게시글 등록
        </button>
      </section>

      <section className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-bold mb-4">📋 게시글 목록</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">게시글이 없습니다. 첫 글을 작성해 보세요!</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <strong className="text-base">{p.title}</strong>
                <span className="text-xs text-gray-500">{p.author_email} | {new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mb-4">{p.content}</p>

              <div className="border-t border-dashed border-gray-200 pt-3 mt-3">
                <div className="space-y-1 mb-3">
                  {(comments[p.id] || []).map((c) => (
                    <div key={c.id} className="text-xs bg-gray-50 p-2 rounded">
                      <span className="font-semibold">{c.author_email}</span>: {c.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="댓글 입력..."
                    value={commentInputs[p.id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                    className="flex-1 p-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => addComment(p.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded transition"
                  >
                    등록
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
