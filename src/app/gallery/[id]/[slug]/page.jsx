'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const galleryId = params.id;
  const slug = params.slug;

  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 신고 모달 상태
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('음란물 / 불법정보');
  const [reportDetail, setReportDetail] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. 현재 로그인 유저 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }

      // 2. 게시글 데이터 불러오기 (slug 또는 id 매칭)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      if (error || !data) {
        alert('존재하지 않거나 삭제된 게시글입니다.');
        router.replace(`/gallery/${galleryId}`);
        return;
      }

      setPost(data);
      setLoading(false);
    };

    fetchData();
  }, [galleryId, slug, router]);

  // 작성자 본인 여부 확인
  const isAuthor = Boolean(
    currentUser &&
    post &&
    ((post.user_id && post.user_id === currentUser.id) ||
      (post.author_email && post.author_email === currentUser.email))
  );

  // 게시글 삭제 처리
  const handleDeletePost = async () => {
    if (!isAuthor) {
      alert('본인이 작성한 글만 삭제할 수 있습니다.');
      return;
    }

    const confirmDelete = confirm('정말로 이 게시글을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);

      if (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('게시글이 성공적으로 삭제되었습니다.');
        router.replace(`/gallery/${galleryId}`);
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 신고 제출 처리
  const handleReportSubmit = async (e) => {
    e.preventDefault();

    if (isAuthor) {
      alert('본인 글은 신고할 수 없습니다.');
      return;
    }

    setSubmittingReport(true);

    try {
      const { error } = await supabase.from('reports').insert([
        {
          target_title: post.title,
          target_author: post.author_name || post.author_email,
          reason: reportReason,
          content: reportDetail.trim() || '세부 사유 없음',
          reporter_email: currentUser?.email || '익명 유저',
        },
      ]);

      if (error) {
        alert('신고 접수 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('신고가 정상적으로 접수되었습니다. 관리자 검토 후 조치됩니다.');
        setIsReportModalOpen(false);
        setReportDetail('');
      }
    } catch {
      alert('신고 접수 중 오류가 발생했습니다.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        📄 게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!post) return null;

  // 날짜/시간 포맷팅
  const formattedDateTime = new Date(post.created_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 상단 헤더 & 목록 돌아가기 */}
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
        >
          ← 갤러리 목록으로
        </Link>

        {/* 조건부 버튼 (본인: 수정/삭제, 본인 외: 신고) */}
        <div className="flex items-center gap-2">
          {isAuthor ? (
            <>
              <Link
                href={`/gallery/${galleryId}/${slug}/edit`}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
              >
                ✏️ 수정
              </Link>
              <button
                onClick={handleDeletePost}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition text-[11px] border border-rose-200"
              >
                🗑️ 삭제
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-[11px] shadow-sm"
            >
              🚨 신고
            </button>
          )}
        </div>
      </div>

      {/* 게시글 제목 및 작성자/날짜 정보 (고유 ID/링크 띄우지 않음) */}
      <div className="space-y-3 border-b pb-5">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug tracking-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between text-gray-500 font-medium text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">
              {post.author_name || post.author_email?.split('@')[0] || '익명'}
            </span>
          </div>
          <time className="text-gray-400">{formattedDateTime}</time>
        </div>
      </div>

      {/* 첨부 이미지/파일이 있을 경우 */}
      {post.file_url && (
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <img
            src={post.file_url}
            alt="첨부 이미지"
            className="max-h-96 rounded-xl object-contain mx-auto"
          />
        </div>
      )}

      {/* 게시글 본문 */}
      <div className="py-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap min-h-[160px]">
        {post.content}
      </div>

      {/* 하단 버튼 바 */}
      <div className="border-t pt-5 flex items-center justify-between">
        <Link
          href={`/gallery/${galleryId}`}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
        >
          목록보기
        </Link>

        <div className="flex items-center gap-2">
          {isAuthor ? (
            <>
              <Link
                href={`/gallery/${galleryId}/${slug}/edit`}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
              >
                수정
              </Link>
              <button
                onClick={handleDeletePost}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition text-xs border border-rose-200"
              >
                삭제
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs shadow-md shadow-rose-500/20"
            >
              🚨 신고하기
            </button>
          )}
        </div>
      </div>

      {/* 🚨 신고 모달 (본인 외 사용자만 모달 열림) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <div className="border-b pb-3">
              <h3 className="text-base font-black text-gray-900">🚨 게시글 신고하기</h3>
              <p className="text-gray-400 text-[11px] mt-0.5">
                신고된 내용은 관리자 검토 후 제재 처리됩니다.
              </p>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">신고 사유 *</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="음란물 / 불법정보">음란물 / 불법정보</option>
                  <option value="욕설 / 비방 / 혐오표현">욕설 / 비방 / 혐오표현</option>
                  <option value="스팸 / 도배 / 광고성 게시물">스팸 / 도배 / 광고성 게시물</option>
                  <option value="개인정보 노출">개인정보 노출</option>
                  <option value="기타 사유">기타 사유</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">상세 사유 (선택)</label>
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="구체적인 신고 내용을 적어주세요."
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/20 disabled:bg-gray-200"
                >
                  {submittingReport ? '접수 중...' : '신고 접수'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
