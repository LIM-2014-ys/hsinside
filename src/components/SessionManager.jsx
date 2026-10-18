'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SessionManager({ children }) {
  useEffect(() => {
    const THREE_HOURS = 3 * 60 * 60 * 1000; // 3시간 (밀리초)

    // PWA(홈 화면 추가/앱 모드) 접속 여부 확인
    const checkIsPWA = () => {
      if (typeof window === 'undefined') return false;
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      );
    };

    // 일반 웹 접속 시 3시간 초과 여부 검사 및 자동 로그아웃
    const checkWebTimeout = async () => {
      const isPWA = checkIsPWA();

      // PWA 환경이면 3시간 제한 없이 무제한 유지
      if (isPWA) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const loginTimestamp = localStorage.getItem('web_login_timestamp');

      if (loginTimestamp) {
        const timePassed = Date.now() - parseInt(loginTimestamp, 10);

        // 3시간 초과 시 자동 로그아웃 실행
        if (timePassed > THREE_HOURS) {
          localStorage.removeItem('web_login_timestamp');
          await supabase.auth.signOut();
          alert('웹 접속 후 3시간이 지나 안전하게 로그아웃되었습니다.');
          window.location.href = '/login';
        }
      } else {
        // 로그인 상태지만 타임스탬프가 없으면 현재 시각 저장
        localStorage.setItem('web_login_timestamp', Date.now().toString());
      }
    };

    checkWebTimeout();

    // Supabase 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('web_login_timestamp', Date.now().toString());
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('web_login_timestamp');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
