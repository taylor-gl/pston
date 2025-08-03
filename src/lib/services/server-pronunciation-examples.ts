import { createSupabaseServerClient } from '$lib/supabase/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { PronunciationExample } from '$lib/types';

export interface ServerPronunciationData {
  examples: PronunciationExample[];
  hiddenExamples: PronunciationExample[];
  total: number;
  hiddenCount: number;
  hasMore: boolean;
}

const EXAMPLES_PER_PAGE = 10;
const MIN_WILSON_SCORE_THRESHOLD = -0.2;

export async function getPronunciationExamplesServerSide(
  event: RequestEvent,
  figureId: string,
  userId: string | null,
  page: number = 1
): Promise<ServerPronunciationData> {
  const supabase = createSupabaseServerClient(event);
  const offset = (page - 1) * EXAMPLES_PER_PAGE;

  try {
    const examplesQuery = supabase
      .from('pronunciation_examples')
      .select(
        `
        *,
        public_figure:public_figures(*),
        creator_profile:profiles!created_by_profile_id (
          id,
          full_name,
          username,
          avatar_url,
          created_at,
          updated_at
        )
        ${userId ? `, user_vote:pronunciation_example_votes!left(vote_type)` : ''}
      `
      )
      .eq('public_figure_id', figureId);

    if (userId) {
      examplesQuery.eq('pronunciation_example_votes.user_id', userId);
    }

    const { data: allExamples, error: examplesError } = await examplesQuery
      .order('wilson_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (examplesError) {
      throw new Error(`Failed to fetch pronunciation examples: ${examplesError.message}`);
    }

    if (!allExamples) {
      return {
        examples: [],
        hiddenExamples: [],
        total: 0,
        hiddenCount: 0,
        hasMore: false,
      };
    }

    const processedExamples = allExamples.map((example: any) => ({
      ...example,
      user_vote: example.user_vote?.[0] ? { vote_type: example.user_vote[0].vote_type } : null,
    })) as PronunciationExample[];

    const visibleExamples = processedExamples.filter(
      (ex) => ex.wilson_score >= MIN_WILSON_SCORE_THRESHOLD
    );
    const hiddenExamples = processedExamples.filter(
      (ex) => ex.wilson_score < MIN_WILSON_SCORE_THRESHOLD
    );
    const paginatedExamples = visibleExamples.slice(offset, offset + EXAMPLES_PER_PAGE);
    const hasMore = visibleExamples.length > offset + EXAMPLES_PER_PAGE;

    return {
      examples: paginatedExamples,
      hiddenExamples,
      total: visibleExamples.length,
      hiddenCount: hiddenExamples.length,
      hasMore,
    };
  } catch (error) {
    console.error('Error in getPronunciationExamplesServerSide:', error);
    throw error;
  }
}

export async function getNextPageServerSide(
  event: RequestEvent,
  figureId: string,
  userId: string | null,
  page: number
): Promise<{ examples: PronunciationExample[]; hasMore: boolean }> {
  const result = await getPronunciationExamplesServerSide(event, figureId, userId, page);
  return {
    examples: result.examples,
    hasMore: result.hasMore,
  };
}
