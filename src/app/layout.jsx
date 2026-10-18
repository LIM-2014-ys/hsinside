import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'HSinside',
  description: 'HSinside 커뮤니티 갤러리',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HSinside',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-icon.png',
  },
};

export const viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        {/* 상단 공통 헤더 */}
        <Header />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
