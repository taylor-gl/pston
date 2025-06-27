import { error } from '@sveltejs/kit';
import { getPublicFigureBySlug } from '$lib/services/public-figures';

export const load = async ({ params }: { params: { slug: string } }) => {
  const publicFigure = await getPublicFigureBySlug(params.slug);

  if (!publicFigure) {
    throw error(404, 'Public figure not found');
  }

  return {
    publicFigure,
  };
};
