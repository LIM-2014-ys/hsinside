'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryRequestModal({ isOpen, onClose, user }) {
  const [galleryName, setGalleryName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast({ visible: false, message: '', isError: false });
    }, 3000);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showToast('갤러리 신청은 로그인이 필요합니다.', true);
      return;
    }

    if (!galleryName.trim() || !reason.trim()) {
      showToast('갤러리 이름과 신청 사유를 모두 입력해 주세요.', true);
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('gallery_requests').insert([
      {
        gallery_name: galleryName.trim(),
        reason: reason.trim(),
        applicant_email: user.email,
        status: 'pending'
      }
    ]);

    setLoading(false);

    if (error) {
      if (error.message.includes('row-level security policy')) {
        showToast('데이터베이스 보안 권한(RLS) 설정으로 인해 신청에 실패했습니다.', true);
      } else {
        showToast(`신청 중 오류가 발생했습니다: ${error.message}`, true);
      }
    } else {
      showToast('갤러리 개설 신청이 정상적으로 접수되었습니다!');
      setGalleryName('');
      setReason('');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {toast.visible && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-md shadow-lg text-sm text-white transition-all transform ${
            toast.isError ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📢 새 갤러리 개설 신청</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              신청할 갤러리 이름
            </label>
            <input
              type="text"
              value={galleryName}
              onChange={(e) => setGalleryName(e.target.value)}
              placeholder="예: 리그오브레전드, 요리"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              개설 사유 및 설명
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="갤러리 개설 목적을 간단히 적어주세요."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-xs hover:bg-gray-300 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {loading ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
