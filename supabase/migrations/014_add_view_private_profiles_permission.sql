-- Add permission for viewing private profiles (admin accounts)
INSERT INTO public.permissions (name) VALUES ('can_view_private_profiles');

-- Assign the permission to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name = 'can_view_private_profiles';
