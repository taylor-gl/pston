
-- Add description column to pronunciation_examples table
ALTER TABLE public.pronunciation_examples 
ADD COLUMN description TEXT;

-- Add cached vote count columns to pronunciation_examples table
ALTER TABLE public.pronunciation_examples 
ADD COLUMN upvotes INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN downvotes INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN wilson_score DECIMAL(10,8) DEFAULT 0 NOT NULL;

-- Create pronunciation_example_votes table
CREATE TABLE public.pronunciation_example_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pronunciation_example_id UUID NOT NULL REFERENCES public.pronunciation_examples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per user per example
  UNIQUE(pronunciation_example_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_pronunciation_example_votes_example_id ON public.pronunciation_example_votes(pronunciation_example_id);
CREATE INDEX idx_pronunciation_example_votes_user_id ON public.pronunciation_example_votes(user_id);
CREATE INDEX idx_pronunciation_examples_wilson_score ON public.pronunciation_examples(wilson_score DESC);

-- Set up Row Level Security (RLS) for votes table
ALTER TABLE public.pronunciation_example_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view votes (they're public)
CREATE POLICY "Anyone can view votes" ON public.pronunciation_example_votes
  FOR SELECT USING (true);

-- Authenticated users can insert/update their own votes
CREATE POLICY "Authenticated users can manage their votes" ON public.pronunciation_example_votes
  FOR ALL USING ((select auth.uid()) = user_id);

-- Add updated_at trigger to votes
CREATE TRIGGER update_pronunciation_example_votes_updated_at
  BEFORE UPDATE ON public.pronunciation_example_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create Wilson score calculation function
CREATE OR REPLACE FUNCTION public.calculate_wilson_score(upvotes INTEGER, downvotes INTEGER)
RETURNS DECIMAL(10,8) AS $$
DECLARE
    n INTEGER;
    z DECIMAL := 1.28155; -- 80% confidence
    p DECIMAL;
    left_side DECIMAL;
    right_side DECIMAL;
BEGIN
    n := upvotes + downvotes;
    
    -- If no votes, return 0
    IF n = 0 THEN
        RETURN 0;
    END IF;
    
    p := upvotes::DECIMAL / n;
    
    left_side := p + (z * z) / (2 * n) - z * SQRT((p * (1 - p) + (z * z) / (4 * n)) / n);
    right_side := 1 + (z * z) / n;
    
    RETURN left_side / right_side;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update vote counts and Wilson score
CREATE OR REPLACE FUNCTION public.update_pronunciation_example_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    example_id UUID;
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_wilson_score DECIMAL(10,8);
BEGIN
    -- Determine which example was affected
    IF TG_OP = 'DELETE' THEN
        example_id := OLD.pronunciation_example_id;
    ELSE
        example_id := NEW.pronunciation_example_id;
    END IF;
    
    -- Count current votes
    SELECT 
        COALESCE(SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END), 0)
    INTO upvote_count, downvote_count
    FROM public.pronunciation_example_votes
    WHERE pronunciation_example_id = example_id;
    
    -- Calculate Wilson score
    new_wilson_score := public.calculate_wilson_score(upvote_count, downvote_count);
    
    -- Update the pronunciation example
    UPDATE public.pronunciation_examples
    SET 
        upvotes = upvote_count,
        downvotes = downvote_count,
        wilson_score = new_wilson_score,
        updated_at = NOW()
    WHERE id = example_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update vote counts
CREATE TRIGGER update_vote_counts_on_insert
    AFTER INSERT ON public.pronunciation_example_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_pronunciation_example_vote_counts();

CREATE TRIGGER update_vote_counts_on_update
    AFTER UPDATE ON public.pronunciation_example_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_pronunciation_example_vote_counts();

CREATE TRIGGER update_vote_counts_on_delete
    AFTER DELETE ON public.pronunciation_example_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_pronunciation_example_vote_counts();

-- Add comments for documentation
COMMENT ON TABLE public.pronunciation_example_votes IS 'Table storing user votes (upvotes/downvotes) for pronunciation examples';
COMMENT ON COLUMN public.pronunciation_examples.description IS 'Optional description/context for the pronunciation example';
COMMENT ON COLUMN public.pronunciation_examples.upvotes IS 'Cached count of upvotes for this example';
COMMENT ON COLUMN public.pronunciation_examples.downvotes IS 'Cached count of downvotes for this example';
COMMENT ON COLUMN public.pronunciation_examples.wilson_score IS 'Wilson score lower bound for sorting (80% confidence)';
COMMENT ON FUNCTION public.calculate_wilson_score IS 'Calculate Wilson score lower bound for given upvotes and downvotes'; 