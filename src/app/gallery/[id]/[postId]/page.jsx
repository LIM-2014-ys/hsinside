{/* 게시글 본문 텍스트 */}
<div className="text-sm text-gray-800 leading-relaxed min-h-[100px] whitespace-pre-wrap">
  {post.content}
</div>

{/* 첨부된 사진 이미지 갤러리 표시 */}
{post.image_urls && post.image_urls.length > 0 && (
  <div className="space-y-4 pt-4 border-t">
    <h3 className="text-xs font-bold text-gray-600">📷 첨부 사진 ({post.image_urls.length})</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {post.image_urls.map((url, index) => (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:opacity-95 transition"
        >
          <img
            src={url}
            alt={`첨부 이미지 ${index + 1}`}
            className="w-full h-auto max-h-[400px] object-cover rounded-xl"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  </div>
)}
