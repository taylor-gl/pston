import type { User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase/client';

export interface UserPermissions {
  roles: string[];
  permissions: string[];
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }

  return user;
}

export async function getUserPermissions(userId?: string): Promise<UserPermissions | null> {
  const targetUserId = userId || (await getCurrentUser())?.id;

  if (!targetUserId) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_user_profile', {
    user_id: targetUserId,
  });

  if (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }

  return data || { roles: [], permissions: [] };
}

export async function hasPermission(permissionName: string, userId?: string): Promise<boolean> {
  const targetUserId = userId || (await getCurrentUser())?.id;

  if (!targetUserId) {
    return false;
  }

  const { data, error } = await supabase.rpc('has_permission', {
    user_id: targetUserId,
    permission_name: permissionName,
  });

  if (error) {
    console.error('Error checking permission:', error);
    return false;
  }

  return data === true;
}
