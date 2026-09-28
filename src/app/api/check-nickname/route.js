import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { nickname } = await req.json();

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: '닉네임을 입력해 주세요.' }, { status: 400 });
    }

    const targetNickname = nickname.trim().toLowerCase();

    // 전체 유저 목록을 불러와 닉네임 중복 비교
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isDuplicate = users.some(
      (user) => user.user_metadata?.display_name?.trim().toLowerCase() === targetNickname
    );

    return NextResponse.json({ isAvailable: !isDuplicate });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
