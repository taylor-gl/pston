-- Add user banning support using both Supabase's auth.users.banned_until and local RLS enforcement
-- This provides both login prevention AND database-level operation blocking

-- Add banned column to profiles for RLS policy enforcement (synced with auth.users.banned_until)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(banned);

-- Create server-side function to ban/unban users (requires service role)
CREATE OR REPLACE FUNCTION public.ban_user_admin(target_user_id UUID, should_ban BOOLEAN DEFAULT TRUE)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT public.has_permission(current_user_id, 'can_ban_users') THEN
    RAISE EXCEPTION 'Permission denied: cannot ban users';
  END IF;
  
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  -- Update the profiles table banned status (single source of truth)
  UPDATE public.profiles 
  SET banned = should_ban,
      updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Also update auth.users.banned_until to prevent login and keep them in sync
  -- Set banned_until to far future if banning, NULL if unbanning
  UPDATE auth.users 
  SET banned_until = CASE 
    WHEN should_ban THEN (NOW() + INTERVAL '100 years')
    ELSE NULL
  END
  WHERE id = target_user_id;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'user_id', target_user_id,
    'banned', should_ban,
    'message', CASE 
      WHEN should_ban THEN 'User has been banned from all operations' 
      ELSE 'User has been unbanned' 
    END
  );
END;
$$;

-- Update ALL RLS policies to block banned users from ALL operations
-- Profiles policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id AND NOT COALESCE(banned, false)
  );

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND NOT COALESCE((SELECT banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- Pronunciation examples policies
DROP POLICY IF EXISTS "Authenticated users can insert pronunciation examples" ON public.pronunciation_examples;
DROP POLICY IF EXISTS "update_with_permission" ON public.pronunciation_examples;

CREATE POLICY "Authenticated users can insert pronunciation examples" ON public.pronunciation_examples
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND NOT COALESCE((SELECT banned FROM public.profiles WHERE id = auth.uid()), false)
  );

CREATE POLICY "update_with_permission" ON public.pronunciation_examples
  FOR UPDATE USING (
    public.has_permission(auth.uid(), 'can_delete_pronunciation_examples')
    AND NOT COALESCE((SELECT banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- Public figures policies
DROP POLICY IF EXISTS "Authenticated users can insert public figures" ON public.public_figures;
DROP POLICY IF EXISTS "Users can update their own public figures" ON public.public_figures;

CREATE POLICY "Authenticated users can insert public figures" ON public.public_figures
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND NOT COALESCE((SELECT banned FROM public.profiles WHERE id = auth.uid()), false)
  );

CREATE POLICY "Users can update their own public figures" ON public.public_figures
  FOR UPDATE USING (
    auth.uid() = created_by
    AND NOT COALESCE((SELECT banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- Block banned users from voting or any other operations by adding similar checks to all future policies
-- This ensures banned users cannot perform ANY database operations

-- Grant execute permission on the ban function
GRANT EXECUTE ON FUNCTION public.ban_user_admin(UUID, BOOLEAN) TO authenticated;

-- Create a function to sync ban status from auth.users to profiles
-- This handles cases where Supabase dashboard is used to ban users
CREATE OR REPLACE FUNCTION public.sync_user_ban_status()
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  sync_count INTEGER := 0;
BEGIN
  -- Sync profiles.banned based on auth.users.banned_until
  -- This handles cases where someone uses Supabase dashboard to ban users
  UPDATE public.profiles 
  SET banned = CASE 
    WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN true
    ELSE false
  END,
  updated_at = NOW()
  FROM auth.users au
  WHERE profiles.id = au.id
  AND profiles.banned != CASE 
    WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN true
    ELSE false
  END;
  
  GET DIAGNOSTICS sync_count = ROW_COUNT;
  
  -- Log the sync operation
  IF sync_count > 0 THEN
    RAISE NOTICE 'Synced % user ban statuses from auth.users to profiles', sync_count;
  END IF;
  
  RETURN sync_count;
END;
$$;

-- Grant permission to call sync function
GRANT EXECUTE ON FUNCTION public.sync_user_ban_status() TO authenticated;

-- Function to check if user is banned - profiles.banned is source of truth but sync first
CREATE OR REPLACE FUNCTION public.is_user_banned(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  auth_banned BOOLEAN;
  profile_banned BOOLEAN;
BEGIN
  -- First, instantly sync any changes from auth.users to profiles for this specific user
  SELECT banned_until IS NOT NULL AND banned_until > NOW() 
  INTO auth_banned
  FROM auth.users 
  WHERE id = user_id;
  
  SELECT banned 
  INTO profile_banned
  FROM public.profiles 
  WHERE id = user_id;
  
  -- If auth status differs from profile status, sync immediately
  IF COALESCE(auth_banned, false) != COALESCE(profile_banned, false) THEN
    UPDATE public.profiles 
    SET banned = COALESCE(auth_banned, false),
        updated_at = NOW()
    WHERE id = user_id;
    
    profile_banned := COALESCE(auth_banned, false);
  END IF;
  
  -- Return the profiles.banned status (single source of truth)
  RETURN COALESCE(profile_banned, false);
END;
$$;

-- Update RLS policies to use the new function that checks both sources
-- Profiles policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id AND NOT public.is_user_banned()
  );

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND NOT public.is_user_banned()
  );

-- Pronunciation examples policies
DROP POLICY IF EXISTS "Authenticated users can insert pronunciation examples" ON public.pronunciation_examples;
DROP POLICY IF EXISTS "update_with_permission" ON public.pronunciation_examples;

CREATE POLICY "Authenticated users can insert pronunciation examples" ON public.pronunciation_examples
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND NOT public.is_user_banned()
  );

CREATE POLICY "update_with_permission" ON public.pronunciation_examples
  FOR UPDATE USING (
    public.has_permission(auth.uid(), 'can_delete_pronunciation_examples')
    AND NOT public.is_user_banned()
  );

-- Public figures policies
DROP POLICY IF EXISTS "Authenticated users can insert public figures" ON public.public_figures;
DROP POLICY IF EXISTS "Users can update their own public figures" ON public.public_figures;

CREATE POLICY "Authenticated users can insert public figures" ON public.public_figures
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND NOT public.is_user_banned()
  );

CREATE POLICY "Users can update their own public figures" ON public.public_figures
  FOR UPDATE USING (
    auth.uid() = created_by
    AND NOT public.is_user_banned()
  );

-- Add voting policies with ban checks
DROP POLICY IF EXISTS "Users can manage own votes" ON public.pronunciation_example_votes;

CREATE POLICY "Users can manage own votes" ON public.pronunciation_example_votes
  FOR ALL USING (
    auth.uid() = user_id
    AND NOT public.is_user_banned()
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_ban_status() TO authenticated;

-- Fix user unbanning by adding automatic sync trigger on auth.users.banned_until changes
-- This ensures that when banned_until is updated in Supabase dashboard, profiles.banned is immediately synced

-- Create a trigger function to sync profiles.banned when auth.users.banned_until changes
-- Note: Function must be in public schema due to permission restrictions
CREATE OR REPLACE FUNCTION public.sync_ban_status_on_auth_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if banned_until actually changed
  IF OLD.banned_until IS DISTINCT FROM NEW.banned_until THEN
    -- Update the corresponding profile
    UPDATE public.profiles 
    SET banned = CASE 
      WHEN NEW.banned_until IS NOT NULL AND NEW.banned_until > NOW() THEN true
      ELSE false
    END,
    updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Log the sync operation
    RAISE NOTICE 'Auto-synced ban status for user % from auth.users to profiles (banned_until: % -> %)', 
      NEW.id, OLD.banned_until, NEW.banned_until;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS sync_ban_status_trigger ON auth.users;
CREATE TRIGGER sync_ban_status_trigger
  AFTER UPDATE OF banned_until ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ban_status_on_auth_change();

-- Also create a function to manually force sync all users (for maintenance)
CREATE OR REPLACE FUNCTION public.force_sync_all_ban_status()
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  sync_count INTEGER := 0;
BEGIN
  -- Sync all profiles.banned based on current auth.users.banned_until values
  UPDATE public.profiles 
  SET banned = CASE 
    WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN true
    ELSE false
  END,
  updated_at = NOW()
  FROM auth.users au
  WHERE profiles.id = au.id
  AND profiles.banned != CASE 
    WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN true
    ELSE false
  END;
  
  GET DIAGNOSTICS sync_count = ROW_COUNT;
  
  -- Log the sync operation
  RAISE NOTICE 'Force synced % user ban statuses from auth.users to profiles', sync_count;
  
  RETURN sync_count;
END;
$$;

-- Grant permission to call the force sync function
GRANT EXECUTE ON FUNCTION public.force_sync_all_ban_status() TO authenticated;

-- Run a one-time sync to fix any currently out-of-sync profiles
SELECT public.force_sync_all_ban_status();
