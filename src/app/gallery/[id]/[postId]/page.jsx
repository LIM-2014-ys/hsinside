'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import AdminBadge from '@/components/AdminBadge';
import ReportModal from '@/components/ReportModal';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();

  const galleryId = params.id;
  const postId = params.postId;

  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [registeredNicknames, setRegisteredNicknames] = useState(new Set());
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // ❤️ 좋아요 상태
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // 사용자 정보 로드
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // 게시글, 댓글, 좋아요 여부 데이터 조회
  useEffect(() => {
    if (!postId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. 조회수 +1
        await supabase.rpc('increment_views', { post_id: postId });

        // 2. 게시글 상세 정보
        const { data: postData } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (postData) {
          setPost(postData);
          setLikeCount(postData.likes_count || 0);
        }

        // 3. 현재 유저의 좋아요 누름 여부 확인
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', currentUser.id)
            .maybeSingle();

          setHasLiked(!!likeData);
        }

        // 4. 댓글 목록
        const { data: commentData } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (commentData) setComments(commentData);

        // 5. 닉네임 수집
        const nameSet = new Set();
        const { data: profileData } = await supabase.from('profiles').select('display_name, nickname');
        if (profileData) {
          profileData.forEach((p) => {
            const name = p.display_name || p.nickname;
            if (name) nameSet.add(name.trim());
          });
        }
        if (postData?.author_name) nameSet.add(postData.author_name.trim());
        if (commentData) {
          commentData.forEach((c) => {
            if (c.author_name) nameSet.add(c.author_name.trim());
          });
        }
        setRegisteredNicknames(nameSet);
      } catch (err) {
        console.error('데이터 로드 에러:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

  // ❤️ 좋아요 토글 함수
  const handleToggleLike = async () => {
    if (!user) {
      alert('로그인 후 이용 가능합니다.');
      return;
    }

    try {
      const { data: isNowLiked, error } = await supabase.rpc('toggle_post_like', {
        p_post_id: postId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('좋아요 에러:', error);
        return;
      }

      setHasLiked(isNowLiked);
      setLikeCount((prev) => (isNowLiked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {
      console.error('좋아요 처리 중 오류:', err);
    }
  };

  const isImageFile = (url, fileName) => {
    if (!url) return false;
    const targetStr = (fileName || url).toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(targetStr);
  };

  const renderContent = (content) => {
    if (!content) return null;
    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  const isAdmin = isAdminEmail(user?.email);
  const isPostAuthor = user?.email && post?.author_email === user.email;
  const canModifyPost = isPostAuthor || isAdmin;

  if (loading) return <div className="text-center py-12 text-gray-400 font-bold text-xs">📄 로딩 중...</div>;
  if (!post) return <div className="text-center py-12 text-gray-400 font-bold text-xs">게시글을 찾을 수 없습니다.</div>;

  const hasImage = isImageFile(post.file_url, post.file_name);
  const postAuthorUuid = post.user_id || post.author_id;

  return (
    <div className="max-w-4xl mx-auto my-6 px-3 sm:px-4 font-sans text-xs space-y-4">
      {/* 상단 버튼 */}
      <div className="flex items-center justify-between border-b pb-3">
        <Link href={`/gallery/${galleryId}`} className="px-3 py-1.5 bg-gray-100 font-bold rounded-xl text-gray-700">
          ← 목록으로
        </Link>
      </div>

      {/* 본문 카드 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h1 className="text-base font-bold text-gray-900">{post.title}</h1>
          <div className="flex items-center justify-between text-gray-400 text-[11px] mt-2 pt-2 border-t border-gray-50">
            <span>{post.author_name || '익명'}</span>
            <div className="flex gap-2">
              <span>👀 {post.views || 0}</span>
              <span>•</span>
              <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>
        </div>

        <div className="text-gray-800 leading-relaxed text-xs pt-2 border-t border-gray-50">
          {renderContent(post.content)}
        </div>

        {hasImage && (
          <div className="pt-3 flex justify-center">
            <img src={post.file_url} alt="첨부 이미지" className="max-w-full rounded-xl object-contain max-h-[500px]" />
          </div>
        )}

        {/* ❤️ 좋아요 버튼 */}
        <div className="pt-4 flex justify-center">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-extrabold text-xs transition shadow-xs ${
              hasLiked
                ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-500'
            }`}
          >
            <span>{hasLiked ? '❤️' : '🤍'}</span>
            <span>좋아요</span>
            <span className="ml-1 font-black">{likeCount}</span>
          </button>
        </div>
      </div>

      <ReportModal postId={postId} postAuthorId={postAuthorUuid} isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </div>
  );
}
