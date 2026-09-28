import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 환경변수 검증
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase 환경변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버 환경변수(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { nickname } = await req.json();

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: '닉네임을 입력해 주세요.' }, { status: 400 });
    }

    const targetNickname = nickname.trim().toLowerCase();

    // 전체 가입자 목록에서 닉네임 비교
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Supabase listUsers Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isDuplicate = data?.users?.some(
      (user) => user.user_metadata?.display_name?.trim().toLowerCase() === targetNickname
    );

    return NextResponse.json({ isAvailable: !isDuplicate });
  } catch (err) {
    console.error('Check Nickname Server Error:', err);
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
