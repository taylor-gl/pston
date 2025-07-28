import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

import { createSupabaseServerClient } from '$lib/supabase/server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const code = event.url.searchParams.get('code');
  const error = event.url.searchParams.get('error');
  const error_code = event.url.searchParams.get('error_code');

  // If there's an auth error (like user_banned), redirect to auth page
  if (error && error_code === 'user_banned') {
    throw redirect(303, '/auth?banned');
  }

  // If there's any other auth error, redirect to auth page
  if (error) {
    throw redirect(303, '/auth');
  }

  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    // If session was created successfully, check user status
    if (data.session && data.session.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('banned, setup_completed')
        .eq('id', data.session.user.id)
        .single();

      // If user is banned, sign them out and redirect to auth page with banned parameter
      if (profile?.banned) {
        await supabase.auth.signOut();
        throw redirect(303, '/auth?banned');
      }

      // If user hasn't completed setup, redirect to setup page
      if (!profile?.setup_completed) {
        throw redirect(303, '/setup');
      }
    }
  }

  throw redirect(303, '/');
};
