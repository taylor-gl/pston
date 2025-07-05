import { supabase } from '$lib/supabase/client';
import type { PublicFigure, NewPublicFigure } from '$lib/types';
import { dev } from '$app/environment';

export async function getAllPublicFigures(): Promise<PublicFigure[]> {
  const { data, error } = await supabase
    .from('public_figures')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error(`Unable to load public figures. Please refresh the page and try again.`);
    }
    throw new Error(`Failed to fetch public figures: ${error.message}`);
  }

  return data || [];
}

export async function getPublicFigureBySlug(slug: string): Promise<PublicFigure | null> {
  const { data, error } = await supabase
    .from('public_figures')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error(`Unable to load this public figure. Please refresh the page and try again.`);
    }
    throw new Error(`Failed to fetch public figure: ${error.message}`);
  }

  return data;
}

export async function createPublicFigure(figure: NewPublicFigure): Promise<PublicFigure> {
  const { data: slug, error: slugError } = await supabase.rpc('generate_unique_slug', {
    p_name: figure.name,
    p_description: figure.description,
  });

  if (slugError) {
    throw new Error(`Failed to generate slug: ${slugError.message}`);
  }

  const fileExt = figure.image.name.split('.').pop();
  const fileName = `${slug}-${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('public-figure-images')
    .upload(fileName, figure.image);

  if (uploadError) {
    if (uploadError.message?.includes('file size')) {
      throw new Error(`Image file is too large. Please choose a smaller image (under 10MB).`);
    }
    if (
      uploadError.message?.includes('not allowed') ||
      uploadError.message?.includes('file type')
    ) {
      throw new Error(`Invalid image format. Please choose a JPEG, PNG, or WebP image.`);
    }
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const image_filename = uploadData.path;

  const { data, error } = await supabase
    .from('public_figures')
    .insert([
      {
        name: figure.name,
        slug,
        description: figure.description,
        image_filename,
      },
    ])
    .select()
    .single();

  if (error) {
    await supabase.storage.from('public-figure-images').remove([fileName]);

    if (error.code === '23505') {
      throw new Error(
        `A public figure with a similar name already exists. Please choose a different name.`
      );
    }

    if (error.code === '42501') {
      throw new Error(
        `You don't have permission to create public figures. Please sign in and try again.`
      );
    }

    if (error.code === 'PGRST301') {
      throw new Error(
        `You don't have permission to create public figures. Please sign in and try again.`
      );
    }

    throw new Error(`Failed to create public figure: ${error.message}`);
  }

  return data;
}

export function getImageUrl(filename: string | null): string | null {
  if (
    !filename ||
    filename.includes('..') ||
    filename.includes('javascript:') ||
    filename.includes('\\')
  ) {
    return null;
  }

  if (dev) {
    return `/storage/v1/object/public/public-figure-images/${filename}`;
  } else {
    const { data } = supabase.storage.from('public-figure-images').getPublicUrl(filename);
    return data.publicUrl;
  }
}

export async function searchPublicFigures(
  query: string,
  limit: number = 10
): Promise<PublicFigure[]> {
  if (!query.trim()) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_public_figures_fuzzy', {
    search_query: query.trim(),
    result_limit: limit,
  });

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      throw new Error(`Unable to search public figures. Please refresh the page and try again.`);
    }
    throw new Error(`Failed to search public figures: ${error.message}`);
  }

  return data || [];
}

export async function getSearchSuggestions(query: string): Promise<PublicFigure[]> {
  return searchPublicFigures(query, 5);
}
