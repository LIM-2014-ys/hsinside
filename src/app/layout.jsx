import './globals.css';

export const metadata = {
  title: 'hsinside',
  description: 'hsinside 커뮤니티',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-md p-6 min-h-[80vh]">
          {children}
        </div>
      </body>
    </html>
  );
}
