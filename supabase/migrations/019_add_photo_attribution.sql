-- Add photo_attribution field to public_figures table
ALTER TABLE public.public_figures 
ADD COLUMN photo_attribution TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.public_figures.photo_attribution IS 'Attribution text for the photo, required for CC-licensed images from sources like Wikipedia';
