-- Add new permission for deleting public figures
INSERT INTO public.permissions (name) VALUES ('can_delete_public_figures');

-- Grant the new permission to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name = 'can_delete_public_figures';

-- Policy: Allow users with can_delete_public_figures permission to delete public figures
CREATE POLICY "delete_public_figures_with_permission" ON public.public_figures
  FOR DELETE USING (public.has_permission(auth.uid(), 'can_delete_public_figures'));
