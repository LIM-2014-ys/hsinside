import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: '서버 환경변수(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: `Supabase 오류: ${error.message}` }, { status: 500 });
    }

    // ⭐ 핵심: 실제 이메일 인증(email_confirmed_at)을 완료한 유저만 중복으로 처리
    const isConfirmedUserExist = data?.users?.some(
      (user) => user.email?.trim().toLowerCase() === targetEmail && user.email_confirmed_at !== null
    );

    return NextResponse.json({ isAvailable: !isConfirmedUserExist });
  } catch (err) {
    return NextResponse.json({ error: `서버 오류: ${err.message}` }, { status: 500 });
  }
}
