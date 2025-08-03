-- Fix get_user_profile function to return complete profile data
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT JSON_BUILD_OBJECT(
    'id', p.id,
    'full_name', p.full_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'setup_completed', p.setup_completed,
    'terms_accepted_at', p.terms_accepted_at,
    'roles', COALESCE(perms.roles, '[]'::json),
    'permissions', COALESCE(perms.permissions, '[]'::json)
  )
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT 
      JSON_AGG(DISTINCT role_name) as roles,
      JSON_AGG(DISTINCT permission_name) as permissions
    FROM public.get_user_permissions(user_id)
  ) perms ON true
  WHERE p.id = user_id;
$$;

-- Set search path
ALTER FUNCTION public.get_user_profile(UUID) SET search_path = '';
