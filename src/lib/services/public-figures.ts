import { supabase } from '$lib/supabase/client';
import type { PublicFigure, NewPublicFigure } from '$lib/types';
import { createSlug } from '$lib/types';
import { dev } from '$app/environment';

export async function getAllPublicFigures(): Promise<PublicFigure[]> {
  const { data, error } = await supabase
    .from('public_figures')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
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
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch public figure: ${error.message}`);
  }

  return data;
}

export async function createPublicFigure(figure: NewPublicFigure): Promise<PublicFigure> {
  const slug = createSlug(figure.name);

  // Upload image (required)
  const fileExt = figure.image.name.split('.').pop();
  const fileName = `${slug}-${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('public-figure-images')
    .upload(fileName, figure.image);

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Store only the filename in the database
  const image_filename = uploadData.path;

  // Insert the public figure record
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
    // If we failed to create the database record, clean up the uploaded image
    await supabase.storage.from('public-figure-images').remove([fileName]);
    throw new Error(`Failed to create public figure: ${error.message}`);
  }

  return data;
}

/**
 * Constructs the proper image URL for a given filename.
 * In development, uses the Vite proxy. In production, uses the full Supabase URL.
 */
export function getImageUrl(filename: string | null): string | null {
  if (!filename) return null;

  if (dev) {
    // Use Vite proxy in development
    return `/storage/v1/object/public/public-figure-images/${filename}`;
  } else {
    // Use full Supabase URL in production
    const { data } = supabase.storage.from('public-figure-images').getPublicUrl(filename);
    return data.publicUrl;
  }
}
