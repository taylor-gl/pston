import type { User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase/client';

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
