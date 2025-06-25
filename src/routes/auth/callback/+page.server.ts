import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

import { createSupabaseServerClient } from '$lib/supabase/server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const code = event.url.searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  throw redirect(303, '/');
};
