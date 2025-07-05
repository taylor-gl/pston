-- Create roles table
CREATE TABLE public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combinations
  UNIQUE(role_id, permission_id)
);

-- Create user_roles junction table
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combinations
  UNIQUE(user_id, role_id)
);

-- Create indexes for performance
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);

-- Add updated_at triggers
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view roles and permissions (they're needed for UI)
CREATE POLICY "Anyone can view roles" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view permissions" ON public.permissions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view role_permissions" ON public.role_permissions
  FOR SELECT USING (true);

-- Users can view their own role assignments
CREATE POLICY "Users can view their own role assignments" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can manage roles, permissions, and assignments (will be implemented later)
-- For now, no one can modify these tables directly

-- Insert default roles
INSERT INTO public.roles (name) VALUES
  ('admin'),
  ('user');

-- Insert default permissions
INSERT INTO public.permissions (name) VALUES
  ('can_delete_pronunciation_examples'),
  ('can_edit_public_figures'),
  ('can_ban_users'),
  ('can_manage_roles');

-- Assign permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin';

-- Create stable function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE (
  role_name TEXT,
  permission_name TEXT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    r.name as role_name,
    p.name as permission_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  JOIN public.role_permissions rp ON r.id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = get_user_permissions.user_id;
$$;

-- Create stable function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.get_user_permissions(has_permission.user_id) 
    WHERE permission_name = has_permission.permission_name
  );
$$;

-- Create function to get user's complete permission profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    JSON_BUILD_OBJECT(
      'roles', JSON_AGG(DISTINCT role_name),
      'permissions', JSON_AGG(DISTINCT permission_name)
    ),
    JSON_BUILD_OBJECT('roles', '[]'::json, 'permissions', '[]'::json)
  )
  FROM public.get_user_permissions(get_user_profile.user_id);
$$;

-- Create function to invalidate user sessions (to be called by triggers)
CREATE OR REPLACE FUNCTION public.invalidate_user_sessions()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  affected_user_id UUID;
BEGIN
  -- For user_roles table changes
  IF TG_TABLE_NAME = 'user_roles' THEN
    -- We'll log the user ID that needs session invalidation
    -- In a real implementation, this would integrate with your session management
    RAISE NOTICE 'Session invalidation needed for user: %', COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  
  -- For role_permissions table changes
  IF TG_TABLE_NAME = 'role_permissions' THEN
    -- Find all users with this role and invalidate their sessions
    FOR affected_user_id IN 
      SELECT ur.user_id 
      FROM public.user_roles ur 
      WHERE ur.role_id = COALESCE(NEW.role_id, OLD.role_id)
    LOOP
      RAISE NOTICE 'Session invalidation needed for user: %', affected_user_id;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for session invalidation
CREATE TRIGGER invalidate_sessions_on_user_roles_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_user_sessions();

CREATE TRIGGER invalidate_sessions_on_role_permissions_change
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_user_sessions();

-- Update pronunciation_examples table to allow deletion by users with permission
DROP POLICY IF EXISTS "No one can delete pronunciation examples" ON public.pronunciation_examples;

-- Policy: Allow users with can_delete_pronunciation_examples permission to delete
CREATE POLICY "delete_with_permission" ON public.pronunciation_examples
  FOR DELETE USING (public.has_permission(auth.uid(), 'can_delete_pronunciation_examples'));

-- Policy: Allow users with can_delete_pronunciation_examples permission to update
CREATE POLICY "update_with_permission" ON public.pronunciation_examples
  FOR UPDATE USING (public.has_permission(auth.uid(), 'can_delete_pronunciation_examples'));

-- Grant necessary permissions to authenticated users to use the functions
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
