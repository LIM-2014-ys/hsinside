'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const REPORT_REASONS = [
  '욕설, 비방 및 인신공격',
  '불법 정보 또는 음란물',
  '스팸, 도배 및 홍보성 글',
  '개인정보 노출 및 침해',
  '저작권 및 명예훼손 침해',
  '기타 사유',
];

export default function ReportModal({ postId, postAuthorId, isOpen, onClose }) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ text: '로그인 후 신고 기능을 이용하실 수 있습니다.', type: 'error' });
        return;
      }

      // 본인 게시물 신고 방지
      if (user.id === postAuthorId) {
        setMessage({ text: '자신이 작성한 게시물은 신고할 수 없습니다.', type: 'error' });
        return;
      }

      setLoading(true);

      const { error } = await supabase.from('reports').insert([
        {
          reporter_id: user.id,
          post_id: postId,
          reason: selectedReason,
          details: details.trim(),
        },
      ]);

      if (error) {
        // 중복 신고 유니크 제약조건(23505) 에러 핸들링
        if (error.code === '23505') {
          setMessage({ text: '이미 신고 접수된 게시물입니다.', type: 'error' });
        } else {
          setMessage({ text: '신고 접수 중 오류가 발생했습니다: ' + error.message, type: 'error' });
        }
      } else {
        setMessage({ text: '✓ 신고가 정상적으로 접수되었습니다. 관리자 검토 후 조치됩니다.', type: 'success' });
        setTimeout(() => {
          onClose();
          setMessage({ text: '', type: '' });
          setDetails('');
        }, 1500);
      }
    } catch (err) {
      setMessage({ text: '처리 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
            <span>🚨</span> 게시물 신고하기
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition font-bold"
          >
            ✕
          </button>
        </div>

        {/* 모달 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-gray-800 mb-2">신고 사유 선택 *</label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition select-none ${
                    selectedReason === reason
                      ? 'border-rose-500 bg-rose-50/50 font-bold text-rose-900'
                      : 'border-gray-200 bg-gray-50/30 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-rose-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1.5">
              상세 사유 기재 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="검토에 도움이 될 만한 상세 내용을 작성해 주세요."
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none transition"
            />
          </div>

          {/* 메세지 피드백 */}
          {message.text && (
            <div
              className={`p-3 rounded-xl font-bold text-center text-[11px] border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition shadow-lg shadow-rose-500/20 disabled:bg-gray-300"
            >
              {loading ? '신고 접수 중...' : '신고하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
