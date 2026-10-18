'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 이미 앱(standalone)으로 열린 상태인지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // iOS Safari 감지
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 안드로이드 / 크롬 브라우저 설치 프롬프트 이벤트 감지
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // 이미 설치되어 있거나 설치 프롬프트 이벤트가 지원되지 않는 경우(iOS가 아닌 경우) 숨김
  if (isInstalled) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-sm my-4 flex items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-2xl shrink-0">📱</span>
          <div className="truncate">
            <p className="font-black text-xs text-white">HSinside 앱으로 설치하기</p>
            <p className="text-[10px] text-emerald-100 truncate">홈 화면에 추가하여 앱처럼 편리하게 이용하세요</p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-xl transition shrink-0 shadow-sm"
        >
          앱 설치
        </button>
      </div>

      {/* iOS 안내 모달 */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-xs w-full space-y-4 shadow-xl text-xs font-sans">
            <h3 className="text-sm font-black text-gray-900 border-b pb-2">📲 iOS 홈 화면에 추가</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 font-medium text-[11px] leading-relaxed">
              <li>Safari 하단 중앙의 <strong>공유 버튼(↑)</strong>을 누릅니다.</li>
              <li>목록에서 <strong>'홈 화면에 추가'</strong>를 선택합니다.</li>
              <li>우측 상단 <strong>'추가'</strong>를 누르면 설치 완료!</li>
            </ol>
            <div className="text-right pt-2">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px]"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
