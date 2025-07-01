import { supabase } from '$lib/supabase/client';
import type { PronunciationExample, NewPronunciationExample } from '$lib/types';

const EXAMPLES_PER_PAGE = 10;

export async function getPronunciationExamplesByFigureId(
  figureId: string,
  page: number = 1
): Promise<{ examples: PronunciationExample[]; hasMore: boolean; total: number }> {
  const offset = (page - 1) * EXAMPLES_PER_PAGE;

  // Get total count
  const { count, error: countError } = await supabase
    .from('pronunciation_examples')
    .select('*', { count: 'exact', head: true })
    .eq('public_figure_id', figureId);

  if (countError) {
    throw new Error(`Failed to count pronunciation examples: ${countError.message}`);
  }

  // Get examples with pagination
  const { data, error } = await supabase
    .from('pronunciation_examples')
    .select('*, public_figure:public_figures(*)')
    .eq('public_figure_id', figureId)
    .order('created_at', { ascending: false })
    .range(offset, offset + EXAMPLES_PER_PAGE - 1);

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error(
        `Unable to load pronunciation examples. Please refresh the page and try again.`
      );
    }
    throw new Error(`Failed to fetch pronunciation examples: ${error.message}`);
  }

  const total = count || 0;
  const hasMore = offset + EXAMPLES_PER_PAGE < total;

  return {
    examples: data || [],
    hasMore,
    total,
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

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
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
