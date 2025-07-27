-- Fix Function Search Path Mutable warnings for all database functions
-- Sets search_path to empty string for security best practices
-- This migration ONLY adds SET search_path = '' without changing function signatures

-- Fix functions from various migrations by adding SET search_path = ''

-- From 015_add_user_banning.sql
ALTER FUNCTION public.ban_user_admin(UUID, BOOLEAN) SET search_path = '';
ALTER FUNCTION public.sync_user_ban_status() SET search_path = '';
ALTER FUNCTION public.is_user_banned(UUID) SET search_path = '';
ALTER FUNCTION public.sync_ban_status_on_auth_change() SET search_path = '';
ALTER FUNCTION public.force_sync_all_ban_status() SET search_path = '';

-- From 013_public_profiles_for_attribution.sql
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.set_created_by_profile_id_on_insert() SET search_path = '';

-- From 011_role_based_permissions.sql
ALTER FUNCTION public.get_user_permissions(UUID) SET search_path = '';
ALTER FUNCTION public.has_permission(UUID, TEXT) SET search_path = '';
ALTER FUNCTION public.get_user_profile(UUID) SET search_path = '';
ALTER FUNCTION public.invalidate_user_sessions() SET search_path = '';

-- From 010_fix_security_issues.sql (and earlier)
ALTER FUNCTION public.search_public_figures_fuzzy(TEXT, INTEGER) SET search_path = '';
ALTER FUNCTION public.generate_unique_slug(TEXT) SET search_path = '';
-- Also handle the original signature from migration 006 if it still exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
               WHERE n.nspname = 'public' AND p.proname = 'generate_unique_slug' 
               AND pg_get_function_identity_arguments(p.oid) = 'p_name text, p_description text') THEN
        ALTER FUNCTION public.generate_unique_slug(text, text) SET search_path = '';
    END IF;
END $$;
ALTER FUNCTION public.calculate_wilson_score(INTEGER, INTEGER) SET search_path = '';
ALTER FUNCTION public.update_pronunciation_example_vote_counts() SET search_path = '';
