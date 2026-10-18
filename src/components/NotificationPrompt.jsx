'use client';

import { useState, useEffect } from 'react';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState('default'); // 'default' | 'granted' | 'denied'
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 브라우저 알림 지원 여부 확인
    if (!('Notification' in window)) return;

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // 알림 권한이 허용('granted')되어 있지 않으면 접속할 때마다 배너 표시
    if (currentPermission !== 'granted') {
      setShowPrompt(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;

    if (permission === 'denied') {
      // 이미 거부된 경우 브라우저 팝업이 다시 뜨지 않으므로 설정 안내 표시
      alert(
        '현재 브라우저에서 알림이 차단되어 있습니다.\n\n[브라우저 주소창 왼쪽 자물쇠/설정 아이콘] ➔ [알림 허용]으로 변경해 주세요.'
      );
      return;
    }

    // 알림 권한 요청 (default 상태일 때 브라우저 팝업 표시)
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      setShowPrompt(false);
      alert('🔔 실시간 알림이 설정되었습니다!');
    }
  };

  // 이미 허용했거나 알림 기능 미지원이면 안 띔
  if (!showPrompt || permission === 'granted') return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3.5 rounded-2xl shadow-sm my-3 flex items-center justify-between gap-3 font-sans text-xs">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <span className="text-xl shrink-0">🔔</span>
        <div className="truncate">
          <p className="font-black text-white">실시간 알림 받기</p>
          <p className="text-[10px] text-amber-100 truncate">
            {permission === 'denied'
              ? '알림이 차단되어 있습니다. 클릭하여 차단 해제 방법 확인'
              : '새 댓글 및 멘션 알림을 놓치지 않고 받으세요'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRequestPermission}
        className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 font-extrabold text-[11px] rounded-xl transition shrink-0 shadow-sm"
      >
        {permission === 'denied' ? '설정 안내' : '알림 허용'}
      </button>
    </div>
  );
}
