import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();

    // 전체 가입자 데이터에서 이메일 중복 여부 체크
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isExist = users.some(
      (u) => u.email?.trim().toLowerCase() === targetEmail
    );

    return NextResponse.json({ isAvailable: !isExist });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
