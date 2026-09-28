import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 환경변수 존재 여부 검증
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: '서버 환경변수(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const { nickname } = await req.json();

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: '닉네임을 입력해 주세요.' }, { status: 400 });
    }

    const targetNickname = nickname.trim().toLowerCase();
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 전체 가입자 목록 조회
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: `Supabase 오류: ${error.message}` }, { status: 500 });
    }

    const isDuplicate = data?.users?.some(
      (u) => u.user_metadata?.display_name?.trim().toLowerCase() === targetNickname
    );

    return NextResponse.json({ isAvailable: !isDuplicate });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 내부 예외 발생: ${err.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}
