'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminGalleryRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // 갤러리 신청 목록 로드
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    } catch (err) {
      console.error('신청 목록 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 갤러리 승인 처리 (galleries 테이블에 신규 갤러리 자동 생성)
  const handleApprove = async (req) => {
    setActionLoadingId(req.id);
    setFeedbackMsg({ text: '', type: '' });

    try {
      // 1. galleries 테이블에 새 갤러리 등록
      const { error: insertError } = await supabase.from('galleries').insert([
        {
          name: req.name,
          description: req.description || '새롭게 개설된 갤러리입니다.',
        },
      ]);

      if (insertError) {
        setFeedbackMsg({
          text: `갤러리 생성 실패: ${insertError.message}`,
          type: 'error',
        });
        setActionLoadingId(null);
        return;
      }

      // 2. gallery_requests 상태를 'approved'로 변경
      const { error: updateError } = await supabase
        .from('gallery_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (updateError) {
        setFeedbackMsg({
          text: `상태 업데이트 실패: ${updateError.message}`,
          type: 'error',
        });
      } else {
        setFeedbackMsg({
          text: `🎉 '${req.name}' 갤러리가 성공적으로 승인 및 개설되었습니다!`,
          type: 'success',
        });
        fetchRequests();
      }
    } catch {
      setFeedbackMsg({
        text: '승인 처리 중 예기치 못한 오류가 발생했습니다.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 갤러리 거절 처리
  const handleReject = async (reqId, reqName) => {
    setActionLoadingId(reqId);
    setFeedbackMsg({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('gallery_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);

      if (error) {
        setFeedbackMsg({
          text: `거절 처리 실패: ${error.message}`,
          type: 'error',
        });
      } else {
        setFeedbackMsg({
          text: `'${reqName}' 갤러리 신청이 거절 처리되었습니다.`,
          type: 'info',
        });
        fetchRequests();
      }
    } catch {
      setFeedbackMsg({
        text: '거절 처리 중 오류가 발생했습니다.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            🛡️ 갤러리 개설 신청 관리 (관리자)
          </h1>
          <p className="text-gray-400 text-[11px] mt-0.5">
            이용자들이 제출한 갤러리 개설 신청을 검토하고 승인/거절합니다.
          </p>
        </div>
        <Link
          href="/gallery/request"
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
        >
          ← 신청 목록으로
        </Link>
      </div>

      {/* 알림 메시지 피드백 */}
      {feedbackMsg.text && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-bold border transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedbackMsg.type === 'info'
              ? 'bg-slate-100 text-slate-800 border-slate-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* 신청서 테이블 리스트 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-bold">
            📄 신청서 데이터를 불러오는 중...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-bold">
            대기 중인 갤러리 개설 신청 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-gray-400 font-bold text-[11px]">
              <span className="col-span-3">신청 갤러리명 / 설명</span>
              <span className="col-span-4">신청 사유</span>
              <span className="col-span-2">신청자 계정</span>
              <span className="col-span-3 text-right">상태 / 승인 관리</span>
            </div>

            {requests.map((req) => (
              <div
                key={req.id}
                className="grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-gray-50/80 transition"
              >
                <div className="col-span-3">
                  <p className="font-extrabold text-gray-900 text-xs">
                    {req.name}
                  </p>
                  <p className="text-gray-400 text-[10px] truncate mt-0.5">
                    {req.description || '설명 없음'}
                  </p>
                </div>

                <div className="col-span-4 text-gray-700 leading-relaxed font-medium">
                  {req.reason}
                </div>

                <div className="col-span-2 text-gray-500 font-medium text-[11px] truncate">
                  {req.applicant_email || '익명 사용자'}
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoadingId === req.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm text-[11px] disabled:opacity-50"
                      >
                        {actionLoadingId === req.id ? '처리 중...' : '승인'}
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.name)}
                        disabled={actionLoadingId === req.id}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition text-[11px] disabled:opacity-50"
                      >
                        거절
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status === 'approved' ? '✓ 개설 승인됨' : '✕ 신청 반려됨'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
