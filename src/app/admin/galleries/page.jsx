'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminGalleriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState([]);

  // 신규 갤러리 생성 폼 상태
  const [newGalleryName, setNewGalleryName] = useState('');
  const [newGalleryDesc, setNewGalleryDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchGalleries = async () => {
      // 1. 로그인 여부 체크
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('로그인이 필요한 페이지입니다.');
        router.replace('/login');
        return;
      }

      // 2. DB에서 갤러리 목록 조회
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGalleries(data);
      }
      setLoading(false);
    };

    fetchGalleries();
  }, [router]);

  // 갤러리 추가 처리
  const handleCreateGallery = async (e) => {
    e.preventDefault();

    if (!newGalleryName.trim()) {
      alert('갤러리 이름을 입력해 주세요.');
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('galleries')
        .insert([
          {
            name: newGalleryName.trim(),
            description: newGalleryDesc.trim() || null,
          },
        ])
        .select();

      if (error) {
        alert('갤러리 생성 중 오류가 발생했습니다: ' + error.message);
      } else if (data) {
        alert(`[${newGalleryName}] 갤러리가 생성되었습니다.`);
        setGalleries((prev) => [data[0], ...prev]);
        setNewGalleryName('');
        setNewGalleryDesc('');
      }
    } catch {
      alert('갤러리 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 갤러리 삭제 처리
  const handleDeleteGallery = async (galleryId, galleryName) => {
    const confirmDelete = confirm(
      `정말로 [${galleryName}] 갤러리를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('galleries')
        .delete()
        .eq('id', galleryId);

      if (error) {
        alert('갤러리 삭제 실패: ' + error.message);
      } else {
        alert(`[${galleryName}] 갤러리가 성공적으로 삭제되었습니다.`);
        setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
      }
    } catch {
      alert('갤러리 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-16 p-8 bg-white border border-gray-100 rounded-3xl shadow-xl text-center text-xs font-semibold text-gray-500">
        🔒 갤러리 관리 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 상단 네비게이션 탭 */}
      <div className="border-b pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">⚙️ 관리자 센터</h1>
          <Link
            href="/"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition text-[11px]"
          >
            ← 메인으로
          </Link>
        </div>

        {/* 어드민 탭 (신고 / 유저 / 갤러리) */}
        <div className="flex gap-2 pt-1">
          <Link
            href="/admin/reports"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
          >
            🚨 신고 내역 관리
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
          >
            👥 유저 관리
          </Link>
          <Link
            href="/admin/galleries"
            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-md text-xs"
          >
            🖼️ 갤러리 관리
          </Link>
        </div>
      </div>

      {/* ➕ 갤러리 신규 생성 폼 */}
      <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
        <h2 className="font-bold text-sm text-emerald-900">✨ 새 갤러리 추가하기</h2>
        <form onSubmit={handleCreateGallery} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={newGalleryName}
            onChange={(e) => setNewGalleryName(e.target.value)}
            placeholder="갤러리 이름 (예: 자유 갤러리)"
            required
            className="sm:col-span-4 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <input
            type="text"
            value={newGalleryDesc}
            onChange={(e) => setNewGalleryDesc(e.target.value)}
            placeholder="갤러리 간단 설명 (선택)"
            className="sm:col-span-5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="sm:col-span-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-500/20 disabled:bg-gray-200 text-xs"
          >
            {creating ? '생성 중...' : '갤러리 생성'}
          </button>
        </form>
      </div>

      {/* 갤러리 목록 리스트 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-800">
            개설된 갤러리 목록 ({galleries.length}개)
          </h2>
        </div>

        {galleries.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-medium border border-gray-100 rounded-2xl">
            등록된 갤러리가 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-100 rounded-2xl divide-y divide-gray-100">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 font-bold text-gray-500 text-[11px]">
              <div className="col-span-3">갤러리명</div>
              <div className="col-span-5">설명</div>
              <div className="col-span-2 text-center">생성일</div>
              <div className="col-span-2 text-right">삭제 관리</div>
            </div>

            {galleries.map((gallery) => (
              <div key={gallery.id} className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-gray-50/50">
                <div className="col-span-3 font-bold text-gray-900 truncate">
                  <Link href={`/gallery/${gallery.id}`} className="hover:underline hover:text-emerald-600">
                    {gallery.name}
                  </Link>
                </div>
                <div className="col-span-5 text-gray-500 truncate pr-2">
                  {gallery.description || '설명 없음'}
                </div>
                <div className="col-span-2 text-center text-gray-400 text-[10px]">
                  {gallery.created_at
                    ? new Date(gallery.created_at).toLocaleDateString('ko-KR')
                    : '-'}
                </div>
                <div className="col-span-2 text-right">
                  <button
                    onClick={() => handleDeleteGallery(gallery.id, gallery.name)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition text-[11px] border border-rose-200"
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
