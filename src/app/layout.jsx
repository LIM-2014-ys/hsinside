import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

        {/* 메인 콘텐츠 영역 (중앙 정렬 및 적절한 높이/여백 확보) */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* 하단 푸터 */}
        <Footer />
      </body>
    </html>
  );
}
