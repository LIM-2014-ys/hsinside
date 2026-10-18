import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SessionManager from '@/components/SessionManager';

export const metadata = {
  title: 'HSinside',
  description: 'HSinside 커뮤니티 갤러리',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // iOS 상단바 깔끔하게 처리
    title: 'HSinside',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-icon.png',
  },
};

export const viewport = {
  themeColor: '#ffffff', // 👈 기존 '#10b981'(초록색)에서 '#ffffff'(흰색)로 변경!
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        <SessionManager>
          {/* 상단 공통 헤더 */}
          <Header />

          {/* 메인 콘텐츠 영역 */}
          <main className="flex-1 w-full">
            {children}
          </main>

          {/* 하단 공통 푸터 */}
          <Footer />
        </SessionManager>
      </body>
    </html>
  );
}
