-- Add username system for user attribution
-- Replace full_name with username for public display

-- Add username field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Add unique constraint for usernames (case-insensitive)
ALTER TABLE public.profiles ADD CONSTRAINT unique_username_case_insensitive 
  EXCLUDE (LOWER(username) WITH =) WHERE (username IS NOT NULL);

-- Add fields for tracking setup completion and terms acceptance
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add index for performance when searching usernames
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(LOWER(username));

-- Update the handle_new_user function to not set setup_completed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, setup_completed)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    FALSE  -- New users need to complete setup
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(requested_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if username is null or empty
  IF requested_username IS NULL OR TRIM(requested_username) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if username already exists (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(TRIM(requested_username))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to complete user setup
CREATE OR REPLACE FUNCTION public.complete_user_setup(
  p_username TEXT,
  p_terms_accepted BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  username_trimmed TEXT;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Trim username
  username_trimmed := TRIM(p_username);
  
  -- Validate inputs
  IF username_trimmed IS NULL OR username_trimmed = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is required');
  END IF;
  
  IF NOT p_terms_accepted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Terms acceptance is required');
  END IF;
  
  -- Check username length (3-20 characters)
  IF LENGTH(username_trimmed) < 3 OR LENGTH(username_trimmed) > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username must be between 3 and 20 characters');
  END IF;
  
  -- Check username format (alphanumeric and underscores only)
  IF username_trimmed !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username can only contain letters, numbers, and underscores');
  END IF;
  
  -- Check if username is available
  IF NOT public.is_username_available(username_trimmed) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is already taken');
  END IF;
  
  -- Update user profile
  UPDATE public.profiles 
  SET 
    username = username_trimmed,
    setup_completed = TRUE,
    terms_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = current_user_id;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is already taken');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'An error occurred while setting up your account');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_setup(TEXT, BOOLEAN) TO authenticated;

-- Update existing users who don't have usernames (set from full_name, fallback to 'user_' + id)
UPDATE public.profiles 
SET username = CASE 
  WHEN full_name IS NOT NULL AND full_name != 'Anonymous User' THEN
    -- Create username from full_name: lowercase, replace spaces with underscores, keep only alphanumeric and underscores
    REGEXP_REPLACE(LOWER(REPLACE(full_name, ' ', '_')), '[^a-z0-9_]', '', 'g')
  ELSE
    'user_' || SUBSTRING(id::TEXT, 1, 8)
  END,
  setup_completed = TRUE  -- Existing users are considered set up
WHERE username IS NULL;

-- Handle potential duplicates by appending numbers
DO $$
DECLARE
  duplicate_record RECORD;
  new_username TEXT;
  counter INT;
BEGIN
  -- Find duplicates and resolve them
  FOR duplicate_record IN 
    SELECT LOWER(username) AS lower_username, array_agg(id) as user_ids, MIN(username) AS username
    FROM public.profiles 
    WHERE username IS NOT NULL
    GROUP BY LOWER(username)
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    -- Keep the first user's username as-is, modify others
    FOR i IN 2..array_length(duplicate_record.user_ids, 1) LOOP
      LOOP
        new_username := duplicate_record.username || '_' || counter;
        -- Check if this new username is available
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(new_username)) THEN
          UPDATE public.profiles 
          SET username = new_username 
          WHERE id = duplicate_record.user_ids[i];
          EXIT;
        END IF;
        counter := counter + 1;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
