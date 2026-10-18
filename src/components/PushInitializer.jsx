'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { subscribeUserToPush } from '@/lib/pushSubscription';

export default function PushInitializer() {
  useEffect(() => {
    const initPush = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await subscribeUserToPush(user.id);
      }
    };

    initPush();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        subscribeUserToPush(session.user.id);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return null;
}
