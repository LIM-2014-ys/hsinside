'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between text-xs">
        <Link href="/" className="font-bold text-gray-900 text-sm">
          커뮤니티
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-gray-600 font-medium">
                {user.user_metadata?.display_name || user.email?.split('@')[0]}님
              </span>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-semibold">
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-2.5 py-1 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
