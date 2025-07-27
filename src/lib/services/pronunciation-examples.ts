import { supabase } from '$lib/supabase/client';
import type {
  PronunciationExample,
  NewPronunciationExample,
  PronunciationExampleVote,
  NewPronunciationExampleVote,
} from '$lib/types';

const EXAMPLES_PER_PAGE = 10;
const MIN_WILSON_SCORE_THRESHOLD = -0.2;

export async function getPronunciationExamplesByFigureId(
  figureId: string,
  page: number = 1
): Promise<{
  examples: PronunciationExample[];
  hiddenExamples: PronunciationExample[];
  hasMore: boolean;
  total: number;
  hiddenCount: number;
}> {
  const offset = (page - 1) * EXAMPLES_PER_PAGE;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: totalCount, error: countError } = await supabase
    .from('pronunciation_examples')
    .select('*', { count: 'exact', head: true })
    .eq('public_figure_id', figureId)
    .gte('wilson_score', MIN_WILSON_SCORE_THRESHOLD);

  if (countError) {
    throw new Error(`Failed to fetch pronunciation examples count: ${countError.message}`);
  }

  const { data: visibleData, error: visibleError } = await supabase
    .from('pronunciation_examples')
    .select(
      `
      *, 
      public_figure:public_figures(*),
      creator_profile:profiles!created_by_profile_id (
        id,
        full_name,
        avatar_url,
        created_at,
        updated_at
      )
    `
    )
    .eq('public_figure_id', figureId)
    .gte('wilson_score', MIN_WILSON_SCORE_THRESHOLD)
    .order('wilson_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + EXAMPLES_PER_PAGE - 1);

  if (visibleError) {
    if (visibleError.code === '42501' || visibleError.code === 'PGRST301') {
      throw new Error(
        `Unable to load pronunciation examples. Please refresh the page and try again.`
      );
    }
    throw new Error(`Failed to fetch pronunciation examples: ${visibleError.message}`);
  }

  let visibleExamples = visibleData || [];

  let hiddenExamples: PronunciationExample[] = [];
  let hiddenCount = 0;

  if (page === 1) {
    const { data: hiddenData, error: hiddenError } = await supabase
      .from('pronunciation_examples')
      .select(
        `
        *, 
        public_figure:public_figures(*),
        creator_profile:profiles!created_by_profile_id (
          id,
          full_name,
          avatar_url,
          created_at,
          updated_at
        )
      `
      )
      .eq('public_figure_id', figureId)
      .lt('wilson_score', MIN_WILSON_SCORE_THRESHOLD)
      .order('wilson_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (!hiddenError) {
      hiddenExamples = hiddenData || [];
      hiddenCount = hiddenExamples.length;
    }
  }

  if (user && visibleExamples.length > 0) {
    const exampleIds = visibleExamples.map((ex) => ex.id);
    const { data: userVotes, error: votesError } = await supabase
      .from('pronunciation_example_votes')
      .select('*')
      .in('pronunciation_example_id', exampleIds)
      .eq('user_id', user.id);

    if (!votesError && userVotes) {
      const votesByExampleId = userVotes.reduce(
        (acc, vote) => {
          acc[vote.pronunciation_example_id] = vote;
          return acc;
        },
        {} as Record<string, PronunciationExampleVote>
      );

      visibleExamples = visibleExamples.map((example) => ({
        ...example,
        user_vote: votesByExampleId[example.id] || null,
      }));
    }
  }

  if (user && hiddenExamples.length > 0) {
    const hiddenExampleIds = hiddenExamples.map((ex) => ex.id);
    const { data: hiddenUserVotes, error: hiddenVotesError } = await supabase
      .from('pronunciation_example_votes')
      .select('*')
      .in('pronunciation_example_id', hiddenExampleIds)
      .eq('user_id', user.id);

    if (!hiddenVotesError && hiddenUserVotes) {
      const hiddenVotesByExampleId = hiddenUserVotes.reduce(
        (acc, vote) => {
          acc[vote.pronunciation_example_id] = vote;
          return acc;
        },
        {} as Record<string, PronunciationExampleVote>
      );

      hiddenExamples = hiddenExamples.map((example) => ({
        ...example,
        user_vote: hiddenVotesByExampleId[example.id] || null,
      }));
    }
  }

  const hasMore = offset + EXAMPLES_PER_PAGE < (totalCount || 0);

  return {
    examples: visibleExamples,
    hiddenExamples,
    hasMore,
    total: totalCount || 0,
    hiddenCount,
  };
}

export async function createPronunciationExample(
  example: NewPronunciationExample
): Promise<PronunciationExample> {
  const { data, error } = await supabase
    .from('pronunciation_examples')
    .insert([example])
    .select('*, public_figure:public_figures(*)')
    .single();

  if (error) {
    if (error.code === '23503' && error.message.includes('public_figure_id')) {
      throw new Error('The selected public figure does not exist.');
    }

    if (error.code === '42501') {
      throw new Error(
        "You don't have permission to create pronunciation examples. Please sign in and try again."
      );
    }

    if (error.code === 'PGRST301') {
      throw new Error(
        "You don't have permission to create pronunciation examples. Please sign in and try again."
      );
    }

    if (error.code === '23514') {
      if (error.message.includes('valid_timestamps')) {
        throw new Error('End timestamp must be greater than start timestamp.');
      }
      if (error.message.includes('valid_start_timestamp')) {
        throw new Error('Start timestamp must be a positive number.');
      }
      if (error.message.includes('valid_youtube_id')) {
        throw new Error('Invalid YouTube video ID format.');
      }
    }

    throw new Error(`Failed to create pronunciation example: ${error.message}`);
  }

  return data;
}

export async function getAllPronunciationExamples(): Promise<PronunciationExample[]> {
  const { data, error } = await supabase
    .from('pronunciation_examples')
    .select('*, public_figure:public_figures(*)')
    .gte('wilson_score', MIN_WILSON_SCORE_THRESHOLD)
    .order('wilson_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error(
        `Unable to load pronunciation examples. Please refresh the page and try again.`
      );
    }
    throw new Error(`Failed to fetch pronunciation examples: ${error.message}`);
  }

  return data || [];
}

export async function votePronunciationExample(
  vote: NewPronunciationExampleVote
): Promise<PronunciationExampleVote> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to vote.');
  }

  const voteWithUserId = {
    ...vote,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('pronunciation_example_votes')
    .upsert([voteWithUserId], {
      onConflict: 'pronunciation_example_id,user_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error('You must be signed in to vote.');
    }
    throw new Error(`Failed to submit vote: ${error.message}`);
  }

  return data;
}

export async function removePronunciationExampleVote(
  pronunciationExampleId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to remove votes.');
  }

  const { error } = await supabase.from('pronunciation_example_votes').delete().match({
    pronunciation_example_id: pronunciationExampleId,
    user_id: user.id,
  });

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error('You must be signed in to remove votes.');
    }
    throw new Error(`Failed to remove vote: ${error.message}`);
  }
}

export async function getUserVoteForExample(
  pronunciationExampleId: string
): Promise<PronunciationExampleVote | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('pronunciation_example_votes')
    .select('*')
    .match({
      pronunciation_example_id: pronunciationExampleId,
      user_id: user.id,
    })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user vote: ${error.message}`);
  }

  return data;
}

export async function deletePronunciationExample(exampleId: string): Promise<void> {
  const { error } = await supabase.from('pronunciation_examples').delete().eq('id', exampleId);

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error('You do not have permission to delete pronunciation examples.');
    }
    throw new Error(`Failed to delete pronunciation example: ${error.message}`);
  }
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
}

export function calculateWilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes;
  if (n === 0) return 0;

  const z = 1.28155;
  const p = upvotes / n;
  const left = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const right = 1 + (z * z) / n;

  return left / right;
}
