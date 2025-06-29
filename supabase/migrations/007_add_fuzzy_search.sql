-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on public_figures.name for better fuzzy search performance
CREATE INDEX idx_public_figures_name_trgm ON public.public_figures USING gin (name gin_trgm_ops);

-- Add a comment explaining the index
COMMENT ON INDEX idx_public_figures_name_trgm IS 'Trigram index for fuzzy search on public figure names. Enables typo-tolerant search using PostgreSQL pg_trgm extension.';

-- Create function for fuzzy search with smart ranking
CREATE OR REPLACE FUNCTION public.search_public_figures_fuzzy(
    search_query TEXT,
    result_limit INTEGER DEFAULT 10
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
                -- Exact match (highest priority)
                WHEN LOWER(pf.name) = LOWER(search_query) THEN 1000
                -- Starts with query (very high priority)
                WHEN LOWER(pf.name) LIKE LOWER(search_query) || '%' THEN 900
                -- Contains query (high priority)
                WHEN LOWER(pf.name) LIKE '%' || LOWER(search_query) || '%' THEN 800
                -- Fuzzy match using trigrams (lower priority, but still good)
                WHEN similarity(pf.name, search_query) >= 0.15 THEN 
                    -- Scale similarity score from 0-1 to 0-700 range
                    (similarity(pf.name, search_query) * 700)::INTEGER
                ELSE 0
            END as match_score,
            similarity(pf.name, search_query) as similarity_score
        FROM public.public_figures pf
        WHERE 
            -- Include exact/substring matches OR fuzzy matches above lower threshold
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
$$ LANGUAGE plpgsql SECURITY DEFINER;