-- Migration to add database function for slug generation with disambiguation support
-- This function runs with elevated permissions to update existing records when duplicates are found

CREATE OR REPLACE FUNCTION generate_unique_slug(p_name text, p_description text)
RETURNS text
SECURITY DEFINER  -- Run with elevated permissions to bypass RLS
LANGUAGE plpgsql AS $$
DECLARE
  existing_record RECORD;
  new_slug text;
  base_slug text;
BEGIN
  -- Generate base slug from name (preserving case, using underscores)
  base_slug := regexp_replace(
    regexp_replace(
      regexp_replace(p_name, '[^a-zA-Z0-9]', '_', 'g'),
      '_+', '_', 'g'
    ),
    '^_|_$', '', 'g'
  );
  
  -- Check if there are any existing figures with the same name
  IF NOT EXISTS (SELECT 1 FROM public.public_figures WHERE name = p_name) THEN
    -- No duplicates, return simple slug
    RETURN base_slug;
  END IF;
  
  -- We have duplicates! Update all existing records to include disambiguation
  FOR existing_record IN 
    SELECT id, name, description, slug 
    FROM public.public_figures 
    WHERE name = p_name
  LOOP
    -- Generate disambiguated slug for existing record
    new_slug := regexp_replace(
      regexp_replace(
        regexp_replace(existing_record.name || '_(' || existing_record.description || ')', '[^a-zA-Z0-9()]', '_', 'g'),
        '_+', '_', 'g'
      ),
      '^_|_$', '', 'g'
    );
    
    -- Update existing record only if slug actually changed
    IF existing_record.slug != new_slug THEN
      UPDATE public.public_figures 
      SET slug = new_slug 
      WHERE id = existing_record.id;
    END IF;
  END LOOP;
  
  -- Return disambiguated slug for the new record
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(p_name || '_(' || p_description || ')', '[^a-zA-Z0-9()]', '_', 'g'),
      '_+', '_', 'g'
    ),
    '^_|_$', '', 'g'
  );
END;
$$; 