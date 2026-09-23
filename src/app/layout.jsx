import './globals.css';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'hsinside - 커뮤니티',
  description: 'hsinside 커뮤니티 웹 서비스',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="flex flex-col min-h-screen bg-gray-50">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
