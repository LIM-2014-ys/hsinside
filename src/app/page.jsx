'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [galleries, setGalleries] = useState([]);
  const [reqId, setReqId] = useState('');
  const [reqName, setReqName] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadGalleries();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    } else {
      setUser(session.user);
    }
  };

  const loadGalleries = async () => {
    const { data, error } = await supabase
      .from('galleries')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) setGalleries(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const submitGalleryRequest = async () => {
    const formattedId = reqId.trim().toLowerCase().replace(/\s+/g, '-');
    const name = reqName.trim();

    if (!formattedId || !name) return alert('ID와 이름을 입력해 주세요.');

    const { error } = await supabase.from('gallery_requests').insert([{
      gallery_id: formattedId,
      gallery_name: name,
      applicant_email: user.email
    }]);

    if (error) alert('신청 실패: ' + error.message);
    else {
      alert('갤러리 신청이 완료되었습니다! 어드민 승인 후 자동으로 개설됩니다.');
      setReqId('');
      setReqName('');
    }
  };

  if (!user) return <p>로딩 중...</p>;

  return (
    <div>
      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200 mb-6">
        <h2 className="text-2xl font-bold">🏫 hsinside</h2>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user.email}</span>
          <button
            onClick={handleLogout}
            className="border border-gray-300 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-100 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-lg font-bold mb-1">📌 갤러리 목록</h3>
        <p className="text-gray-500 text-xs mb-4">이동할 갤러리를 선택하세요.</p>
        
        {galleries.length === 0 ? (
          <p className="text-sm text-gray-500">개설된 갤러리가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {galleries.map((g) => (
              <div key={g.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-between items-start gap-3">
                <h4 className="font-semibold">{g.name}</h4>
                <Link
                  href={`/gallery/${g.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md font-medium transition"
                >
                  입장하기
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-bold mb-1">📝 새 갤러리 개설 신청</h3>
        <p className="text-gray-500 text-xs mb-4">신청 후 어드민이 승인하면 자동으로 갤러리가 생성됩니다.</p>
        
        <input
          type="text"
          placeholder="갤러리 ID (영문소문자, 예: game)"
          value={reqId}
          onChange={(e) => setReqId(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md mb-3 text-sm focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="갤러리 이름 (예: 게임 갤러리)"
          value={reqName}
          onChange={(e) => setReqName(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md mb-4 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={submitGalleryRequest}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md font-medium transition"
        >
          갤러리 신청하기
        </button>
      </section>
    </div>
  );
}
