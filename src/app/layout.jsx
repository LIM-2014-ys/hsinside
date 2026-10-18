import './globals.css';
// 기존에 헤더/푸터 컴포넌트 파일이 있다면 아래 경로를 프로젝트 상황에 맞게 연결해 주세요.
import Header from '@/components/Header'; 
import Footer from '@/components/Footer';

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

// 뷰포트 설정 보정 (비율 왜곡 및 자름 방지)
export const viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // iOS 노치 영역 대응
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased selection:bg-emerald-100 min-h-screen flex flex-col">
        {/* 공통 헤더 (Header 컴포넌트가 있는 경우) */}
        {typeof Header !== 'undefined' && <Header />}

        {/* 메인 페이지 콘텐츠 (중앙 정렬 및 비율 유지) */}
        <main className="flex-1 w-full">
          {children}
        </main>

        {/* 공통 푸터 (Footer 컴포넌트가 있는 경우) */}
        {typeof Footer !== 'undefined' && <Footer />}
      </body>
    </html>
  );
}
