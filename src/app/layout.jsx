import './globals.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar'; // 상단 헤더 컴포넌트 추가

export const metadata = {
  title: 'hsinside - 커뮤니티',
  description: 'hsinside 커뮤니티 웹 서비스',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="flex flex-col min-h-screen bg-gray-50 text-gray-900 antialiased">
        {/* 상단 공통 네비게이션 바 */}
        <Navbar />

        {/* 메인 콘텐츠 영역 (중앙 정렬 및 적절한 패딩 적용) */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* 하단 푸터 */}
        <Footer />
      </body>
    </html>
  );
}
