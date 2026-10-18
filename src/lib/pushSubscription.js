import { supabase } from '@/lib/supabaseClient';

// VAPID Public Key(Base64)를 브라우저 PushManager 규격에 맞게 변환
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('알림 권한이 거부되었습니다.');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 환경변수가 없거나 로드되지 않을 경우 기본 키를 대체 사용
      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BHdKkw3BjcrNyfFvCiahQH6fzxKznwEcwTIgX3pjzHLaggQb60FNKuJMC2hPcHGWJFwPrjov91ikVAAHI5KRNAE';

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const subscriptionJSON = subscription.toJSON();
    const endpoint = subscriptionJSON.endpoint;
    const p256dh = subscriptionJSON.keys?.p256dh;
    const auth = subscriptionJSON.keys?.auth;

    if (!endpoint || !p256dh || !auth) return;

    await supabase.from('push_subscriptions').upsert(
      [
        {
          user_id: userId,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'endpoint' }
    );

    console.log('✅ 푸시 알림 구독 정보 등록 완료');
  } catch (err) {
    console.error('푸시 구독 처리 실패:', err);
  }
}
