'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function AdminPage() {
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session.user);
    loadPendingRequests();
  };

  const loadPendingRequests = async () => {
    const { data } = await supabase
      .from('gallery_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
  };

  const approveGallery = async (requestId, galleryId, galleryName) => {
    const { error: insertError } = await supabase
      .from('galleries')
      .insert([{ id: galleryId, name: galleryName }]);

    if (insertError) return alert('갤러리 생성 실패: ' + insertError.message);

    await supabase
      .from('gallery_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    alert(`'${galleryName}' 갤러리가 승인되어 자동 개설되었습니다!`);
    loadPendingRequests();
  };

  const rejectGallery = async (requestId) => {
    await supabase
      .from('gallery_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    alert('신청을 거절했습니다.');
    loadPendingRequests();
  };

  if (!user) return <p>로딩 중...</p>;

  return (
    <div>
      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200 mb-6">
        <h2 className="text-2xl font-bold">⚙️ 어드민 대시보드</h2>
        <Link href="/" className="border border-gray-300 px-3 py-1 text-sm rounded-md hover:bg-gray-100 transition">
          메인으로 이동
        </Link>
      </header>

      <section className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-bold mb-4">⏳ 대기 중인 갤러리 신청 목록</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">대기 중인 신청이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-md">
                <div>
                  <div className="font-semibold text-sm">{r.gallery_name} <span className="text-xs text-gray-400">(ID: {r.gallery_id})</span></div>
                  <div className="text-xs text-gray-500">신청자: {r.applicant_email}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveGallery(r.id, r.gallery_id, r.gallery_name)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded transition"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => rejectGallery(r.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
