-- Make profiles publicly viewable for user attribution
-- Remove email field for privacy but keep full_name for display

-- Drop email column for privacy (users can't see each other's emails)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update the handle_new_user function to not use email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policies for public viewing (with some restrictions)
CREATE POLICY "Anyone can view public profile info" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add index for performance when joining with full_name
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Add created_by_profile_id fields to public_figures and pronunciation_examples tables
-- These will directly reference the public profiles table for attribution

-- Add created_by_profile_id to public_figures
ALTER TABLE public.public_figures ADD COLUMN IF NOT EXISTS created_by_profile_id UUID REFERENCES public.profiles(id);

-- Add created_by_profile_id to pronunciation_examples
ALTER TABLE public.pronunciation_examples ADD COLUMN IF NOT EXISTS created_by_profile_id UUID REFERENCES public.profiles(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_figures_created_by_profile_id ON public.public_figures(created_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_examples_created_by_profile_id ON public.pronunciation_examples(created_by_profile_id);

-- Create triggers to automatically set created_by_profile_id when inserting new records
CREATE OR REPLACE FUNCTION public.set_created_by_profile_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by_profile_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to public_figures
CREATE TRIGGER set_created_by_profile_id_public_figures
  BEFORE INSERT ON public.public_figures
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_profile_id_on_insert();

-- Apply trigger to pronunciation_examples
CREATE TRIGGER set_created_by_profile_id_pronunciation_examples
  BEFORE INSERT ON public.pronunciation_examples
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_profile_id_on_insert();
