'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import GalleryRequestModal from '@/components/GalleryRequestModal';

export default function HomePage() {
  const [galleries, setGalleries] = useState([]);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. 유저 정보 조회
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 2. 갤러리 목록 조회
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGalleries(data);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* 상단 히어로 배너 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            🔥 hsinside 커뮤니티에 오신 것을 환영합니다!
          </h1>
          <p className="text-sm text-gray-600">
            다양한 주제의 갤러리에서 자유롭게 이야기를 나눠보세요.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow transition whitespace-nowrap"
        >
          + 새 갤러리 신청
        </button>
      </section>

      {/* 갤러리 목록 구역 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>📌</span> 활성 갤러리 목록
          </h2>
          <span className="text-xs text-gray-500">총 {galleries.length}개</span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            갤러리 목록을 불러오는 중입니다...
          </div>
        ) : galleries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
            <p className="text-sm text-gray-500">아직 개설된 갤러리가 없습니다.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded hover:bg-blue-100 transition"
            >
              첫 갤러리 신청하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleries.map((gallery) => (
              <Link
                key={gallery.id}
                href={`/gallery/${gallery.id}`}
                className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition text-base">
                      {gallery.name}
                    </h3>
                    <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded">
                      갤러리
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {gallery.description || '설명이 없습니다.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
                  <span>바로가기 →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 갤러리 개설 신청 모달 */}
      <GalleryRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
    </div>
  );
}
