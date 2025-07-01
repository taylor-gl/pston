-- Fix Function Search Path Mutable issues by making search_path immutable
CREATE OR REPLACE FUNCTION public.search_public_figures_fuzzy(
    search_query TEXT,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    image_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_results AS (
        SELECT 
            pf.*,
            CASE 
                WHEN LOWER(pf.name) = LOWER(search_query) THEN 1000
                WHEN LOWER(pf.name) LIKE LOWER(search_query) || '%' THEN 900
                WHEN LOWER(pf.name) LIKE '%' || LOWER(search_query) || '%' THEN 800
                WHEN similarity(pf.name, search_query) >= 0.15 THEN 
                    (similarity(pf.name, search_query) * 700)::INTEGER
                ELSE 0
            END as match_score,
            similarity(pf.name, search_query) as similarity_score
        FROM public.public_figures pf
        WHERE 
            LOWER(pf.name) LIKE '%' || LOWER(search_query) || '%'
            OR similarity(pf.name, search_query) >= 0.15
    )
    SELECT 
        r.id,
        r.name,
        r.slug,
        r.description,
        r.image_filename,
        r.created_at,
        r.updated_at,
        r.created_by
    FROM ranked_results r
    WHERE r.match_score > 0
    ORDER BY 
        r.match_score DESC,
        r.similarity_score DESC,
        r.name ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_slug TEXT)
RETURNS TEXT AS $$
DECLARE
    counter INTEGER := 1;
    candidate_slug TEXT := base_slug;
    slug_exists BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.public_figures WHERE slug = candidate_slug
        ) INTO slug_exists;
        
        EXIT WHEN NOT slug_exists;
        
        candidate_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN candidate_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_wilson_score(upvotes INTEGER, downvotes INTEGER)
RETURNS DECIMAL(10,8) AS $$
DECLARE
    n INTEGER;
    z DECIMAL := 1.28155;
    p DECIMAL;
    left_side DECIMAL;
    right_side DECIMAL;
BEGIN
    n := upvotes + downvotes;
    
    IF n = 0 THEN
        RETURN 0;
    END IF;
    
    p := upvotes::DECIMAL / n;
    
    left_side := p + (z * z) / (2 * n) - z * SQRT((p * (1 - p) + (z * z) / (4 * n)) / n);
    right_side := 1 + (z * z) / n;
    
    RETURN left_side / right_side;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_pronunciation_example_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    example_id UUID;
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_wilson_score DECIMAL(10,8);
BEGIN
    IF TG_OP = 'DELETE' THEN
        example_id := OLD.pronunciation_example_id;
    ELSE
        example_id := NEW.pronunciation_example_id;
    END IF;
    
    SELECT 
        COALESCE(SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END), 0)
    INTO upvote_count, downvote_count
    FROM public.pronunciation_example_votes
    WHERE pronunciation_example_id = example_id;
    
    new_wilson_score := public.calculate_wilson_score(upvote_count, downvote_count);
    
    UPDATE public.pronunciation_examples
    SET 
        upvotes = upvote_count,
        downvotes = downvote_count,
        wilson_score = new_wilson_score,
        updated_at = NOW()
    WHERE id = example_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Move pg_trgm extension to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop dependent objects first
DROP INDEX IF EXISTS idx_public_figures_name_trgm;

-- Now we can safely drop and recreate the extension
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION pg_trgm SCHEMA extensions;

-- Recreate the index using the extension in the new schema
CREATE INDEX idx_public_figures_name_trgm ON public.public_figures USING gin (name extensions.gin_trgm_ops);
COMMENT ON INDEX idx_public_figures_name_trgm IS 'Trigram index for fuzzy search on public figure names. Enables typo-tolerant search using PostgreSQL pg_trgm extension.';

-- Fix duplicate RLS policies on pronunciation_example_votes
DROP POLICY IF EXISTS "Anyone can view votes" ON public.pronunciation_example_votes;
DROP POLICY IF EXISTS "Authenticated users can manage their votes" ON public.pronunciation_example_votes;

-- Create single, clear policies
CREATE POLICY "Public read access to votes" ON public.pronunciation_example_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own votes" ON public.pronunciation_example_votes
  FOR ALL USING (auth.uid() = user_id);

-- Update the search function to use the new extension schema
CREATE OR REPLACE FUNCTION public.search_public_figures_fuzzy(
    search_query TEXT,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    image_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_results AS (
        SELECT 
            pf.*,
            CASE 
                WHEN LOWER(pf.name) = LOWER(search_query) THEN 1000
                WHEN LOWER(pf.name) LIKE LOWER(search_query) || '%' THEN 900
                WHEN LOWER(pf.name) LIKE '%' || LOWER(search_query) || '%' THEN 800
                WHEN extensions.similarity(pf.name, search_query) >= 0.15 THEN 
                    (extensions.similarity(pf.name, search_query) * 700)::INTEGER
                ELSE 0
            END as match_score,
            extensions.similarity(pf.name, search_query) as similarity_score
        FROM public.public_figures pf
        WHERE 
            LOWER(pf.name) LIKE '%' || LOWER(search_query) || '%'
            OR extensions.similarity(pf.name, search_query) >= 0.15
    )
    SELECT 
        r.id,
        r.name,
        r.slug,
        r.description,
        r.image_filename,
        r.created_at,
        r.updated_at,
        r.created_by
    FROM ranked_results r
    WHERE r.match_score > 0
    ORDER BY 
        r.match_score DESC,
        r.similarity_score DESC,
        r.name ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, extensions; 