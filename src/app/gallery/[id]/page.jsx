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
  
  // Toast 알림
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });
  // 로그인 필요 안내 모달 팝업
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalNotice, setLoginModalNotice] = useState('');

  const router = useRouter();

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast({ visible: false, message: '', isError: false });
    }, 3000);
  };

  useEffect(() => {
    if (galleryId) {
      checkAuthStatus();
      loadGalleryInfo();
      loadPosts();
    }
  }, [galleryId]);

  // 접속 유저 상태 확인 (비로그인이어도 페이지 접근 차단 안 함)
  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
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

  // 비로그인 사용자가 로그인 필요 기능 클릭 시 팝업 안내
  const requireLogin = (actionName) => {
    if (!user) {
      setLoginModalNotice(`${actionName} 기능은 로그인이 필요합니다.`);
      setShowLoginModal(true);
      return true;
    }
    return false;
  };

  const createPost = async () => {
    if (requireLogin('게시글 작성')) return;
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
    if (requireLogin('댓글 작성')) return;
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

  // 좋아요 처리
  const handleLike = async (post) => {
    if (requireLogin('좋아요')) return;
    const newLikes = (post.likes || 0) + 1;

    const { error } = await supabase
      .from('posts')
      .update({ likes: newLikes })
      .eq('id', post.id);

    if (error) {
      showToast('좋아요 처리 중 오류가 발생했습니다.', true);
    } else {
      showToast('게시글을 추천했습니다! 👍');
      loadPosts();
    }
  };

  // 싫어요 처리
  const handleDislike = async (post) => {
    if (requireLogin('싫어요')) return;
    const newDislikes = (post.dislikes || 0) + 1;

    const { error } = await supabase
      .from('posts')
      .update({ dislikes: newDislikes })
      .eq('id', post.id);

    if (error) {
      showToast('싫어요 처리 중 오류가 발생했습니다.', true);
    } else {
      showToast('게시글을 비추천했습니다. 👎');
      loadPosts();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    showToast('로그아웃 되었습니다.');
  };

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

      {/* 로그인 필요 모달 팝업 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl text-center space-y-4">
            <h3 className="text-lg font-bold text-gray-900">로그인 안내 🔒</h3>
            <p className="text-sm text-gray-600">{loginModalNotice}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 transition"
              >
                취소
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex-1 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium"
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200 mb-6">
        <h2 className="text-2xl font-bold">🎮 {galleryName}</h2>
        <div className="flex gap-2 items-center">
          <Link href="/" className="border border-gray-300 px-3 py-1 text-sm rounded-md hover:bg-gray-100 transition">
            전체 목록
          </Link>
          {user ? (
            <button onClick={handleLogout} className="border border-gray-300 px-3 py-1 text-sm rounded-md hover:bg-gray-100 transition">
              로그아웃
            </button>
          ) : (
            <Link href="/login" className="bg-blue-600 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-700 transition font-medium">
              로그인
            </Link>
          )}
        </div>
      </header>

      {/* 글 쓰기 영역 (비로그인 상태일 때는 클릭 시 안내) */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-lg font-bold mb-3">✍️ 글 쓰기</h3>
        <input
          type="text"
          placeholder={user ? "제목" : "로그인 후 글 작성이 가능합니다."}
          value={title}
          onClick={() => !user && requireLogin('게시글 작성')}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md mb-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <textarea
          rows={4}
          placeholder={user ? "내용을 입력하세요" : "로그인 후 글 작성이 가능합니다."}
          value={content}
          onClick={() => !user && requireLogin('게시글 작성')}
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

      {/* 게시글 목록 (모든 사용자 조회 가능) */}
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

              {/* 추천 / 비추천 버튼 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleLike(p)}
                  className="flex items-center gap-1 border border-gray-300 px-3 py-1 rounded text-xs hover:bg-blue-50 hover:border-blue-300 transition text-gray-700"
                >
                  👍 추천 <span className="font-bold text-blue-600">{p.likes || 0}</span>
                </button>
                <button
                  onClick={() => handleDislike(p)}
                  className="flex items-center gap-1 border border-gray-300 px-3 py-1 rounded text-xs hover:bg-red-50 hover:border-red-300 transition text-gray-700"
                >
                  👎 비추천 <span className="font-bold text-red-600">{p.dislikes || 0}</span>
                </button>
              </div>

              {/* 댓글 목록 & 작성 구역 */}
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
                    placeholder={user ? "댓글 입력..." : "댓글을 입력하려면 로그인해 주세요."}
                    value={commentInputs[p.id] || ''}
                    onClick={() => !user && requireLogin('댓글 작성')}
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
