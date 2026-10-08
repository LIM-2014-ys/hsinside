'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminGalleryRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

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
      console.error('목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (req) => {
    setActionLoadingId(req.id);
    setFeedbackMsg({ text: '', type: '' });

    try {
      // 1. galleries 테이블에 신규 갤러리 추가
      const { error: insertError } = await supabase.from('galleries').insert([
        {
          name: req.name,
          description: req.description || '새롭게 개설된 갤러리입니다.',
        },
      ]);

      if (insertError) {
        setFeedbackMsg({ text: `갤러리 개설 실패: ${insertError.message}`, type: 'error' });
        setActionLoadingId(null);
        return;
      }

      // 2. 신청 상태 approved 업데이트
      const { error: updateError } = await supabase
        .from('gallery_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (updateError) {
        setFeedbackMsg({ text: `상태 변경 실패: ${updateError.message}`, type: 'error' });
      } else {
        setFeedbackMsg({ text: `'${req.name}' 갤러리가 성공적으로 승인 및 생성되었습니다!`, type: 'success' });
        fetchRequests();
      }
    } catch {
      setFeedbackMsg({ text: '승인 처리 중 오류 발생', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (reqId, reqName) => {
    setActionLoadingId(reqId);
    setFeedbackMsg({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('gallery_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);

      if (error) {
        setFeedbackMsg({ text: `거절 실패: ${error.message}`, type: 'error' });
      } else {
        setFeedbackMsg({ text: `'${reqName}' 갤러리 신청이 거절되었습니다.`, type: 'info' });
        fetchRequests();
      }
    } catch {
      setFeedbackMsg({ text: '거절 처리 중 오류 발생', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-10 px-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">🛡️ 갤러리 신청 관리 (관리자)</h1>
          <p className="text-gray-400 text-[11px] mt-0.5">신청된 갤러리를 승인하여 자동으로 사이트에 개설합니다.</p>
        </div>
        <Link href="/gallery-request" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs">
          ← 신청 현황 보기
        </Link>
      </div>

      {feedbackMsg.text && (
        <div className={`mb-6 p-4 rounded-2xl text-xs font-bold border ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : feedbackMsg.type === 'info'
            ? 'bg-slate-100 text-slate-800 border-slate-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedbackMsg.text}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-bold">📄 데이터 불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-bold">신청 내역이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div key={req.id} className="grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-gray-50/80 transition">
                <div className="col-span-3">
                  <p className="font-extrabold text-gray-900 text-xs">{req.name}</p>
                  <p className="text-gray-400 text-[10px] truncate mt-0.5">{req.description || '설명 없음'}</p>
                </div>
                <div className="col-span-4 text-gray-700 font-medium">{req.reason}</div>
                <div className="col-span-2 text-gray-500 text-[11px] truncate">{req.applicant_email || '익명'}</div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoadingId === req.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px] disabled:opacity-50"
                      >
                        승인
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
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {req.status === 'approved' ? '✓ 승인됨' : '✕ 거절됨'}
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
