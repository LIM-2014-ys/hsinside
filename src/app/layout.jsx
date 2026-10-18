import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SessionManager from '@/components/SessionManager';
import PushInitializer from '@/components/PushInitializer'; // 👈 추가

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
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        <SessionManager>
          <PushInitializer /> {/* 👈 추가 */}
          <Header />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </SessionManager>
      </body>
    </html>
  );
}
