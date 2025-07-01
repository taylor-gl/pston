-- Create pronunciation_examples table
CREATE TABLE public.pronunciation_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  public_figure_id UUID NOT NULL REFERENCES public.public_figures(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  start_timestamp DECIMAL(10,3) NOT NULL DEFAULT 0.0,
  end_timestamp DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT valid_timestamps CHECK (end_timestamp > start_timestamp),
  CONSTRAINT valid_start_timestamp CHECK (start_timestamp >= 0),
  CONSTRAINT valid_youtube_id CHECK (youtube_video_id ~ '^[a-zA-Z0-9_-]{11}$')
);

-- Create indexes for performance
CREATE INDEX idx_pronunciation_examples_public_figure_id ON public.pronunciation_examples(public_figure_id);
CREATE INDEX idx_pronunciation_examples_created_at ON public.pronunciation_examples(created_at DESC);
CREATE INDEX idx_pronunciation_examples_created_by ON public.pronunciation_examples(created_by);

-- Set up Row Level Security (RLS)
ALTER TABLE public.pronunciation_examples ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read pronunciation examples (they're public!)
CREATE POLICY "Anyone can view pronunciation examples" ON public.pronunciation_examples
  FOR SELECT USING (true);

-- Only authenticated users can insert new pronunciation examples
CREATE POLICY "Authenticated users can insert pronunciation examples" ON public.pronunciation_examples
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Pronunciation examples are immutable - no updates or deletes allowed
-- Users can only create new examples

-- Add updated_at trigger to pronunciation_examples
CREATE TRIGGER update_pronunciation_examples_updated_at
  BEFORE UPDATE ON public.pronunciation_examples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.pronunciation_examples IS 'Table storing YouTube video examples of public figures pronouncing their own names, with start and end timestamps.';
COMMENT ON COLUMN public.pronunciation_examples.youtube_video_id IS 'YouTube video ID (11 character alphanumeric string)';
COMMENT ON COLUMN public.pronunciation_examples.start_timestamp IS 'Start time in seconds (decimal) for the pronunciation clip';
COMMENT ON COLUMN public.pronunciation_examples.end_timestamp IS 'End time in seconds (decimal) for the pronunciation clip'; 