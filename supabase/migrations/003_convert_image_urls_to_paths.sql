-- Migration to convert full image URLs to filenames and rename column
-- This converts URLs like 'http://127.0.0.1:54321/storage/v1/object/public/public-figure-images/filename.jpg'
-- to just 'filename.jpg' and renames the column to image_filename

-- First, convert full URLs to just filenames
UPDATE public.public_figures 
SET image_url = REGEXP_REPLACE(
  image_url, 
  '.*\/public-figure-images\/', 
  '', 
  'g'
)
WHERE image_url IS NOT NULL 
  AND image_url LIKE '%/storage/v1/object/public/public-figure-images/%';

-- Then rename the column to accurately reflect what it stores
ALTER TABLE public.public_figures 
RENAME COLUMN image_url TO image_filename;

-- Update column comment to be accurate
COMMENT ON COLUMN public.public_figures.image_filename IS 'Filename of the image in the public-figure-images storage bucket. Full URLs are constructed by getImageUrl() function.'; 