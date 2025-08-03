import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';

export const load: PageServerLoad = async (event) => {
  const { parent, params } = event;

  const { userContext } = await parent();

  if (!userContext) {
    throw redirect(302, '/auth');
  }

  if (!userContext.canViewPrivateProfiles) {
    throw error(403, 'Unauthorized');
  }

  const supabase = createSupabaseServerClient(event);

  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.userId)
    .single();

  if (profileError || !targetProfile) {
    throw error(404, 'User not found');
  }

  const { data: banStatus } = await supabase.rpc('is_user_banned', { user_id: params.userId });

  return {
    userContext,
    targetProfile,
    userBanned: banStatus || false,
  };
};
