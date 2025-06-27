import { supabase } from '$lib/supabase/client';
import type { PublicFigure, NewPublicFigure } from '$lib/types';
import { createSlug } from '$lib/types';

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

  // Get public URL for the uploaded image
  const { data: urlData } = supabase.storage
    .from('public-figure-images')
    .getPublicUrl(uploadData.path);

  const image_url = urlData.publicUrl;

  // Insert the public figure record
  const { data, error } = await supabase
    .from('public_figures')
    .insert([
      {
        name: figure.name,
        slug,
        description: figure.description,
        image_url,
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

export function getImageUrl(path: string): string {
  const { data } = supabase.storage.from('public-figure-images').getPublicUrl(path);
  return data.publicUrl;
}
