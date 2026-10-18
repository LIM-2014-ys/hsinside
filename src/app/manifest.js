export default function manifest() {
  return {
    name: 'HSinside',
    short_name: 'HSinside',
    description: 'HSinside 커뮤니티 갤러리',
    start_url: '/',
    display: 'standalone', // 브라우저 주소창 제거 (앱처럼 실행)
    background_color: '#ffffff',
    theme_color: '#10b981', // 테마 색상 (에메랄드)
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
