'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GalleryRequestListPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.error('신청 목록 로딩 에러:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">📋 갤러리 개설 신청 현황</h1>
          <p className="text-gray-400 text-[11px] mt-0.5">사용자들이 신청한 갤러리 목록 및 개설 진행 상황입니다.</p>
        </div>
        <Link
          href="/gallery-request/write"
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-500/20 text-xs"
        >
          ➕ 갤러리 신청하기
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-bold">📄 신청 내역을 불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-gray-400 font-bold">등록된 갤러리 개설 신청이 없습니다.</p>
            <Link
              href="/gallery-request/write"
              className="inline-block px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl transition text-[11px]"
            >
              첫 갤러리 개설 신청하기
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-gray-400 font-bold text-[11px]">
              <span className="col-span-4">신청 갤러리명</span>
              <span className="col-span-5">소개 / 개설 사유</span>
              <span className="col-span-3 text-right">상태 / 신청일</span>
            </div>

            {requests.map((req) => (
              <div key={req.id} className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-gray-50/80 transition">
                <div className="col-span-4 font-bold text-gray-900 truncate">
                  {req.name}
                  {req.description && <p className="text-gray-400 font-normal text-[10px] truncate">{req.description}</p>}
                </div>
                <div className="col-span-5 text-gray-600 truncate text-[11px]">
                  {req.reason}
                </div>
                <div className="col-span-3 text-right space-y-0.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : req.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {req.status === 'approved' ? '승인완료' : req.status === 'rejected' ? '반려됨' : '검토중'}
                  </span>
                  <p className="text-gray-400 text-[10px]">
                    {new Date(req.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
