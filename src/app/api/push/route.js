import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

webpush.setVapidDetails(
  'mailto:admin@hsinside.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(req) {
  try {
    const { type, targetUserId, targetEmail, title, body, url } = await req.json();

    let targetUserIds = [];

    // 1. DM 수신용: 이메일 기반 수신자 ID 조회
    if (targetEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', targetEmail)
        .maybeSingle();

      if (profile) targetUserIds.push(profile.id);
    }

    // 2. 단일 타겟 ID 지정 시
    if (targetUserId && type !== 'new_post') {
      targetUserIds.push(targetUserId);
    }

    // 3. 새 글 작성 알림: 작성자를 팔로우하는 모든 팔로워 ID 조회
    if (type === 'new_post' && targetUserId) {
      const { data: followerRows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetUserId);

      if (followerRows && followerRows.length > 0) {
        targetUserIds = followerRows.map((f) => f.follower_id);
      }
    }

    // 중복 ID 제거
    targetUserIds = [...new Set(targetUserIds)];

    if (targetUserIds.length === 0) {
      return NextResponse.json({ success: true, message: '발송 대상이 없습니다.' });
    }

    // 대상 유저들의 푸시 구독(Subscription) 정보 조회
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: '구독 정보를 찾을 수 없습니다.' });
    }

    // 푸시 발송
    const payload = JSON.stringify({ title, body, url });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        // 만료된 구독 정보(410, 404) 자동 삭제
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('푸시 발송 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
