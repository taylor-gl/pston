import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublicFigureBySlug, getAllPublicFigures } from '$lib/services/public-figures';

export const load: PageServerLoad = async (event) => {
  const { parent, url } = event;

  const { userContext } = await parent();

  if (!userContext) {
    throw redirect(302, '/auth');
  }

  const figureSlug = url.searchParams.get('figure');
  let selectedFigure = null;

  if (figureSlug) {
    selectedFigure = await getPublicFigureBySlug(figureSlug);
  }

  const allFigures = await getAllPublicFigures();

  return {
    userContext,
    selectedFigure,
    allFigures,
  };
};
