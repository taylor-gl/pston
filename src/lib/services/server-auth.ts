import { createSupabaseServerClient } from '$lib/supabase/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { PublicProfile } from '$lib/types';

export interface ServerUserContext {
  id: string;
  email: string;
  profile: PublicProfile;
  permissions: string[];
  roles: string[];
  isBanned: boolean;
  canDeleteFigure: boolean;
  canDeleteExamples: boolean;
  canViewPrivateProfiles: boolean;
}

export async function getServerUserContext(event: RequestEvent): Promise<ServerUserContext | null> {
  const supabase = createSupabaseServerClient(event);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  try {
    const { data: userProfile, error: profileError } = await supabase.rpc('get_user_profile', {
      user_id: user.id,
    });

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return null;
    }

    if (!userProfile) {
      return null;
    }

    const { data: banStatus, error: banError } = await supabase.rpc('is_user_banned', {
      user_id: user.id,
    });

    if (banError) {
      console.error('Error checking ban status:', banError);
    }

    const isBanned = banStatus || false;

    const permissions = userProfile.permissions || [];
    const roles = userProfile.roles || [];
    const hasPermission = (perm: string) => permissions.includes(perm);

    return {
      id: user.id,
      email: user.email!,
      profile: userProfile,
      permissions,
      roles,
      isBanned,
      canDeleteFigure: hasPermission('can_delete_public_figures'),
      canDeleteExamples: hasPermission('can_delete_pronunciation_examples'),
      canViewPrivateProfiles: hasPermission('can_view_private_profiles'),
    };
  } catch (error) {
    console.error('Error in getServerUserContext:', error);
    return null;
  }
}

export async function getServerUserId(event: RequestEvent): Promise<string | null> {
  const supabase = createSupabaseServerClient(event);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}
