'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchGalleries = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // galleries 테이블에서 목록 조회
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('갤러리 로딩 에러:', error);
        setErrorMessage(`데이터를 불러오지 못했습니다. (${error.message})`);
      } else {
        setGalleries(data || []);
      }
    } catch (err) {
      console.error('네트워크 또는 시스템 오류:', err);
      setErrorMessage('서버와 연결하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  return (
    <div className="space-y-8 min-h-[400px]">
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
      </section>

      {/* 갤러리 목록 구역 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>📌</span> 활성 갤러리 목록
          </h2>
          <span className="text-xs text-gray-500">총 {galleries.length}개</span>
        </div>

        {/* 로딩 중일 때 */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
            <div className="animate-pulse space-y-2">
              <p className="font-medium text-gray-600">갤러리 목록을 불러오는 중입니다...</p>
            </div>
          </div>
        ) : errorMessage ? (
          /* 에러 발생 시 안내 표시 */
          <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center space-y-3">
            <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
            <p className="text-xs text-gray-500">
              Supabase에 <code className="bg-red-100 px-1 py-0.5 rounded">galleries</code> 테이블이 존재하는지 확인해주세요.
            </p>
            <button
              onClick={fetchGalleries}
              className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 transition"
            >
              다시 시도하기
            </button>
          </div>
        ) : galleries.length === 0 ? (
          /* 갤러리가 하나도 없을 때 */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
            <p className="text-sm text-gray-500">아직 개설된 갤러리가 없습니다.</p>
            <p className="text-xs text-gray-400">어드민 대시보드에서 새 갤러리를 개설해 보세요.</p>
          </div>
        ) : (
          /* 갤러리 카드 리스트 출력 */
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
    </div>
  );
}
