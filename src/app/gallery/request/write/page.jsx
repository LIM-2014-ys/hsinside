'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryRequestWritePage() {
  const router = useRouter();

  const [requestedName, setRequestedName] = useState('');
  const [reason, setReason] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);

  // 로그인 유저 정보 자동으로 불러오기
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        setAuthorName(session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '');
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!requestedName.trim() || !reason.trim()) {
      alert('신청할 갤러리 이름과 신청 사유를 입력해 주세요.');
      return;
    }

    setLoading(true);

    // 고유 URL 주소용 타임스탬프 + 난수 slug 생성
    const generatedSlug = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullTitle = `[갤러리 신청] ${requestedName.trim()}`;

    try {
      const { error } = await supabase.from('posts').insert([
        {
          gallery_id: 'request',
          title: fullTitle,
          content: `신청 갤러리명: ${requestedName.trim()}\n\n신청 사유 및 설명:\n${reason.trim()}`,
          author_name: authorName.trim() || '익명',
          author_email: userEmail || 'guest@hsinside.local',
          user_id: userId,
          slug: generatedSlug,
        },
      ]);

      if (error) {
        alert('갤러리 신청 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('갤러리 신청이 정상적으로 등록되었습니다!');
        router.push('/gallery/request');
      }
    } catch {
      alert('갤러리 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/gallery/request"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
          >
            ← 신청 목록으로
          </Link>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            📢 새로운 갤러리 신청하기
          </h1>
        </div>
      </div>

      {/* 신청서 폼 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-bold text-gray-700 mb-1">
            신청할 갤러리 이름 *
          </label>
          <input
            type="text"
            value={requestedName}
            onChange={(e) => setRequestedName(e.target.value)}
            placeholder="예: 게임 갤러리, 요리 갤러리"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">
            신청자 닉네임
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="닉네임 입력"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition bg-gray-50"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">
            신청 사유 및 갤러리 소개 *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="해당 갤러리가 필요한 이유와 활동 목적을 자세히 적어주세요."
            rows={6}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition shadow-lg shadow-amber-500/20 disabled:bg-gray-200 text-xs"
          >
            {loading ? '신청서 제출 중...' : '갤러리 신청 완료하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
