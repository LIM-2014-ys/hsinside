'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryRequestWritePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.reason.trim()) {
      setErrorMsg('갤러리 이름과 신청 사유를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('gallery_requests').insert([
        {
          name: formData.name.trim(),
          description: formData.description.trim(),
          reason: formData.reason.trim(),
          user_id: user?.id || null,
          applicant_email: user?.email || '익명 사용자',
          status: 'pending',
        },
      ]);

      if (error) {
        setErrorMsg(`신청 실패: ${error.message}`);
      } else {
        router.push('/gallery-request');
      }
    } catch {
      setErrorMsg('신청서 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-10 px-4 font-sans text-xs">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">✍️ 갤러리 개설 신청서</h1>
          <p className="text-gray-400 text-[11px] mt-0.5">원하시는 신규 갤러리의 주제와 개설 사유를 입력해 주세요.</p>
        </div>
        <Link
          href="/gallery-request"
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
        >
          취소
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
        <div>
          <label className="block font-bold text-gray-700 mb-1">갤러리 이름 *</label>
          <input
            type="text"
            required
            placeholder="예: 리그 오브 레전드, 영화 추천 등"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">갤러리한 줄 한 줄 설명</label>
          <input
            type="text"
            placeholder="갤러리 메인 상단에 표시될 짧은 소개글"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">개설 신청 사유 *</label>
          <textarea
            required
            rows={4}
            placeholder="이 갤러리가 필요한 이유를 간단히 적어주세요."
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-500/20 text-xs disabled:opacity-50"
        >
          {submitting ? '신청서 제출 중...' : '신청서 제출하기'}
        </button>
      </form>
    </div>
  );
}
