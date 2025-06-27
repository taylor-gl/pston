-- Create public_figures table
CREATE TABLE public.public_figures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index on slug for fast lookups
CREATE INDEX idx_public_figures_slug ON public.public_figures(slug);

-- Create index on name for alphabetical sorting
CREATE INDEX idx_public_figures_name ON public.public_figures(name);

-- Set up Row Level Security (RLS)
ALTER TABLE public.public_figures ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read public figures (they're public!)
CREATE POLICY "Anyone can view public figures" ON public.public_figures
  FOR SELECT USING (true);

-- Only authenticated users can insert new public figures
CREATE POLICY "Authenticated users can insert public figures" ON public.public_figures
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only the creator can update their public figures
CREATE POLICY "Users can update their own public figures" ON public.public_figures
  FOR UPDATE USING (auth.uid() = created_by);

-- Add updated_at trigger to public_figures
CREATE TRIGGER update_public_figures_updated_at
  BEFORE UPDATE ON public.public_figures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for public figure images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-figure-images', 'public-figure-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow everyone to view images in the bucket
CREATE POLICY "Anyone can view public figure images" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-figure-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload public figure images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'public-figure-images' AND auth.role() = 'authenticated'); 