import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const publicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BHdKkw3BjcrNyfFvCiahQH6fzxKznwEcwTIgX3pjzHLaggQb60FNKuJMC2hPcHGWJFwPrjov91ikVAAHI5KRNAE';
const privateKey =
  process.env.VAPID_PRIVATE_KEY ||
  '5GYfvvbjNKZ9dFmd058oIDMsXBlqXvgxpi6V-WWp0lo';

webPush.setVapidDetails('mailto:admin@example.com', publicKey, privateKey);

export async function POST(request) {
  try {
    const { targetUserId, title, body, url } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // 대상 유저의 알림 구독 정보 조회
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found for user' });
    }

    const payload = JSON.stringify({ title, body, url });

    // 등록된 모든 기기로 백그라운드 푸시 발송
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
      } catch (err) {
        // 더 이상 유효하지 않은 구독 주소는 DB에서 삭제
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('푸시 발송 API 오류:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
