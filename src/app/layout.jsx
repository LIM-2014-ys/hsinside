import './globals.css';

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
  maximumScale: 1,
  userScalable: false, // 앱 느낌을 주도록 화면 임의 확대/축소 방지
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased selection:bg-emerald-100">
        {children}
      </body>
    </html>
  );
}
