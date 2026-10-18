'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryRequestPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 현재 로그인 사용자 정보 조회
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!user) {
      setErrorMessage('갤러리 신청은 로그인 후 이용할 수 있습니다.');
      return;
    }

    if (!name.trim() || !description.trim()) {
      setErrorMessage('갤러리 이름과 설명을 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const applicantName =
        user?.user_metadata?.nickname ||
        user?.user_metadata?.display_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        '익명';

      // gallery_requests 테이블에 신청 내역 저장
      const { error } = await supabase
        .from('gallery_requests')
        .insert([
          {
            name: name.trim(),
            description: description.trim(),
            reason: reason.trim() || null,
            applicant_email: user.email,
            applicant_name: applicantName,
            status: 'pending',
          },
        ]);

      if (error) {
        setErrorMessage(`신청 실패: ${error.message}`);
      } else {
        setSuccessMessage('갤러리 개설 신청이 완료되었습니다. 관리자 승인 후 개설됩니다.');
        setName('');
        setDescription('');
        setReason('');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      console.error('갤러리 신청 오류:', err);
      setErrorMessage('신청 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 font-sans text-xs space-y-6">
      {/* 상단 헤더 */}
      <div className="border-b pb-4">
        <Link
          href="/"
          className="text-[11px] text-gray-400 hover:text-gray-600 font-bold mb-1 inline-block transition"
        >
          ← 전체 갤러리 목록
        </Link>
        <h1 className="text-xl font-black text-gray-900">🏛️ 갤러리 개설 신청</h1>
        <p className="text-gray-500 text-[11px] mt-1">
          원하는 주제의 갤러리가 없다면 직접 개설을 신청해 보세요.
        </p>
      </div>

      {/* 폼 영역 */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-xl text-xs">
            ✅ {successMessage}
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            갤러리 이름 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="예: 개발자 잡담 갤러리"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            갤러리 소개/설명 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="갤러리의 성격이나 다룰 주제를 짧게 설명해 주세요"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-1.5 text-xs">
            개설 신청 사유 (선택)
          </label>
          <textarea
            rows={4}
            placeholder="개설이 필요한 이유나 운영 계획을 자유롭게 적어주세요..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-xs"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !description.trim() || !user}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-50"
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
