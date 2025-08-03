import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';

export const load: PageServerLoad = async (event) => {
  const { parent } = event;

  const { userContext } = await parent();

  if (!userContext) {
    throw redirect(302, '/auth');
  }

  const supabase = createSupabaseServerClient(event);

  const { data: profile } = await supabase
    .from('profiles')
    .select('setup_completed, username')
    .eq('id', userContext.id)
    .single();

  if (profile?.setup_completed) {
    throw redirect(302, '/');
  }

  return {
    userContext,
    existingUsername: profile?.username || '',
  };
};
