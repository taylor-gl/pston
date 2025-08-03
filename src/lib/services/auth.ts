import type { User } from '@supabase/supabase-js';
import type { PublicProfile } from '$lib/types';
import { supabase } from '$lib/supabase/client';

export interface UserPermissions {
  roles: string[];
  permissions: string[];
}

export interface UserWithProfile {
  user: User;
  profile: PublicProfile;
}

export async function getCurrentUser(): Promise<User | null> {
  const userWithProfile = await getCurrentUserWithProfile();
  return userWithProfile?.user || null;
}

export async function getCurrentUserWithProfile(): Promise<UserWithProfile | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Don't log session missing errors as they're normal when not logged in
      if (error.name !== 'AuthSessionMissingError') {
        console.error('Error getting current user:', error);
      }
      return null;
    }

    if (!user) {
      return null;
    }

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, avatar_url, created_at, updated_at, setup_completed, terms_accepted_at'
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return null;
    }

    if (!profile) {
      return null;
    }

    return {
      user,
      profile,
    };
  } catch (error: any) {
    // Handle any other unexpected errors
    if (error?.name !== 'AuthSessionMissingError') {
      console.error('Error getting current user:', error);
    }
    return null;
  }
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

export async function banUser(
  userId: string,
  shouldBan: boolean = true
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('ban_user_admin', {
      target_user_id: userId,
      should_ban: shouldBan,
    });

    if (error) {
      console.error('Error banning user:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: data.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to ban user';
    console.error('Error banning user:', err);
    return { success: false, message };
  }
}

export async function getUserBanStatus(userId: string): Promise<{ banned: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('banned')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting user ban status:', error);
      return null;
    }

    return { banned: data.banned || false };
  } catch (err) {
    console.error('Error getting user ban status:', err);
    return null;
  }
}

export async function checkCurrentUserBanStatus(): Promise<boolean> {
  try {
    // Check ban status directly - RLS policies enforce immediately
    const { data, error } = await supabase.rpc('is_user_banned');

    if (error) {
      console.error('Error checking ban status:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error checking ban status:', err);
    return false;
  }
}

export async function checkAndHandleBanStatus(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const isBanned = await checkCurrentUserBanStatus();

  if (isBanned) {
    await supabase.auth.signOut();

    // Force clear all session data and redirect
    if (typeof window !== 'undefined') {
      // Clear any cached session data
      localStorage.clear();
      sessionStorage.clear();

      // Force a full page refresh to the homepage with banned parameter
      window.location.replace('/?banned=true');
    }
  }
}
