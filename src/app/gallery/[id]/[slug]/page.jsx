import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GalleryPostDetailPage({ params }) {
  const { id, slug } = await params;

  // 1. slug(타임스탬프+난수)로 게시글 안전하게 조회
  let post = null;

  const { data: postBySlug } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (postBySlug) {
    post = postBySlug;
  } else {
    // 2. slug로 안 잡힐 경우 id(기존 레거시)로 조회
    const { data: postById } = await supabase
      .from('posts')
      .select('*')
      .eq('id', slug)
      .maybeSingle();

    post = postById;
  }

  // 게시글이 존재하지 않으면 404 처리
  if (!post) {
    notFound();
  }

  // 상단 이동 버튼용 갤러리 이름 조회
  const { data: gallery } = await supabase
    .from('galleries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const rawName = gallery?.name || gallery?.title;
  const galleryTitle = rawName
    ? rawName.endsWith('갤러리')
      ? rawName
      : `${rawName} 갤러리`
    : `${id} 갤러리`;

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-6 text-xs font-sans">
      {/* 상단 이동 버튼 */}
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/gallery/${id}`}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
        >
          ← {galleryTitle} 목록으로
        </Link>
        <span className="text-gray-400 text-[11px]">고유 링크 ID: {post.slug || post.id}</span>
      </div>

      {/* 게시글 헤더 */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{post.title}</h1>
        <div className="flex items-center justify-between text-gray-400 border-b pb-4 text-[11px]">
          <div>
            작성자: <strong className="text-gray-700">{post.author_name || '익명'}</strong> ({post.author_email})
          </div>
          <div>
            {new Date(post.created_at).toLocaleString('ko-KR')}
          </div>
        </div>
      </div>

      {/* 게시글 본문 */}
      <div className="py-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[150px]">
        {post.content}
      </div>

      {/* 첨부파일 다운로드 */}
      {post.file_url && (
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
          <span className="font-bold text-gray-700 block">📎 첨부된 파일</span>
          <a
            href={post.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
          >
            다운로드 / 파일 열기
          </a>
        </div>
      )}
    </div>
  );
}
