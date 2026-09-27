'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const { id: galleryId, postId } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);

  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const isVotingRef = useRef(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostAndVotes();
  }, [postId]);

  const fetchPostAndVotes = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    const isNumberCode = !isNaN(Number(postId)) && postId.length >= 10;
    const query = supabase.from('posts').select('*');

    if (isNumberCode) {
      query.eq('post_code', parseInt(postId, 10));
    } else {
      query.eq('id', parseInt(postId, 10));
    }

    const { data: postData, error } = await query.single();

    if (error || !postData) {
      setLoading(false);
      return;
    }

    setPost(postData);

    const { data: votes } = await supabase
      .from('post_likes')
      .select('user_email, vote_type')
      .eq('post_id', postData.id);

    if (votes) {
      setLikeCount(votes.filter((v) => v.vote_type === 'like').length);
      setDislikeCount(votes.filter((v) => v.vote_type === 'dislike').length);

      if (user) {
        const myVote = votes.find((v) => v.user_email === user.email);
        setUserVote(myVote ? myVote.vote_type : null);
      }
    }

    setLoading(false);
  };

  const formatDetailDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const handleVote = async (type) => {
    if (!user) return alert('로그인이 필요합니다.');
    if (isVotingRef.current) return;
    isVotingRef.current = true;

    try {
      if (userVote === type) {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_email', user.email);
      } else {
        await supabase.from('post_likes').upsert(
          { post_id: post.id, user_email: user.email, vote_type: type },
          { onConflict: 'post_id, user_email' }
        );
      }
      await fetchPostAndVotes();
    } catch (err) {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => { isVotingRef.current = false; }, 300);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');
    if (!reportReason.trim()) return alert('신고 사유를 입력해 주세요.');

    setReportLoading(true);
    const { error } = await supabase.from('reports').insert([
      { post_id: post.id, reporter_email: user.email, reason: reportReason.trim() },
    ]);
    setReportLoading(false);

    if (error) {
      alert(`신고 실패: ${error.message}`);
    } else {
      alert('신고 접수가 완료되었습니다.');
      setShowReportModal(false);
      setReportReason('');
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('정말로 게시글을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);

    if (error) {
      alert(`삭제 실패: ${error.message}`);
    } else {
      alert('게시글이 삭제되었습니다.');
      router.push(`/gallery/${galleryId}`);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto p-12 text-center text-xs text-gray-500">로딩 중...</div>;
  if (!post) return <div className="max-w-3xl mx-auto p-12 text-center text-xs text-gray-500">존재하지 않거나 삭제된 게시글입니다.</div>;

  const isAuthor = user && user.email === post.author_email;
  const authorDisplayName = post.author_name || post.author_email?.split('@')[0] || '익명';

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-6 space-y-6 relative">
      <div className="border-b pb-4 flex items-center justify-between relative">
        <Link href={`/gallery/${galleryId}`} className="text-xs text-blue-600 hover:underline font-semibold">
          ← 갤러리로 돌아가기
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400">고유번호: {post.post_code || post.id}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600 text-lg font-bold px-2"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-20 py-1 text-xs">
                {isAuthor && (
                  <button onClick={() => { setShowMenu(false); handleDeletePost(); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold">
                    🗑️ 게시글 삭제
                  </button>
                )}
                <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
                  🚨 게시글 신고
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        {/* 작성자 프사 & 닉네임 영역 */}
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="프사" className="w-full h-full object-cover" />
            ) : (
              <span>{authorDisplayName.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">{authorDisplayName}</div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
              <span>{formatDetailDate(post.created_at)}</span>
              <span>•</span>
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-medium">📍 {post.location || 'Seoul'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 게시글 본문 */}
      <div className="text-sm text-gray-800 leading-relaxed min-h-[80px] whitespace-pre-wrap">
        {post.content}
      </div>

      {/* 신규 미디어 (사진 & 동영상) 바로보기 */}
      {post.media_files && post.media_files.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-xs font-bold text-gray-700">🎬 첨부 미디어 ({post.media_files.length})</h3>
          <div className="space-y-3">
            {post.media_files.map((item, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden border bg-black flex justify-center">
                {item.type === 'image' ? (
                  <img src={item.url} alt={`첨부 사진 ${idx + 1}`} className="max-h-[500px] w-auto object-contain" />
                ) : (
                  <video src={item.url} controls className="max-h-[450px] w-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기존에 작성된 이미지 데이터 호환 보장 */}
      {(!post.media_files || post.media_files.length === 0) && post.image_urls && post.image_urls.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-xs font-bold text-gray-700">📷 첨부 사진 ({post.image_urls.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {post.image_urls.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border bg-gray-50">
                <img src={url} alt={`첨부 이미지 ${idx + 1}`} className="w-full h-auto max-h-[400px] object-cover rounded-xl" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 첨부 문서 다운로드 목록 */}
      {post.doc_files && post.doc_files.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <h3 className="text-xs font-bold text-gray-700">📎 첨부 문서 파일 ({post.doc_files.length})</h3>
          <div className="space-y-1">
            {post.doc_files.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-gray-50 border rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition"
              >
                <span>📄</span>
                <span className="font-medium underline truncate">{doc.name || `첨부문서_${idx + 1}`}</span>
                <span className="text-[10px] text-gray-400 ml-auto font-normal">다운로드</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 추천 / 비추천 버튼 */}
      <div className="flex justify-center items-center gap-4 pt-6 border-t">
        <button
          onClick={() => handleVote('like')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold border flex items-center gap-2 ${
            userVote === 'like' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          👍 추천 <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">{likeCount}</span>
        </button>
        <button
          onClick={() => handleVote('dislike')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold border flex items-center gap-2 ${
            userVote === 'dislike' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          👎 비추천 <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800">{dislikeCount}</span>
        </button>
      </div>

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2">🚨 게시글 신고하기</h3>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <textarea
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="신고 사유를 작성해 주세요."
                className="w-full p-2.5 border rounded-md text-xs focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-gray-100 text-xs rounded">취소</button>
                <button type="submit" disabled={reportLoading} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded">
                  {reportLoading ? '접수 중...' : '신고 제출'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
