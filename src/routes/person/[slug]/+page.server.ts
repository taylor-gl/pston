import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublicFigureBySlug } from '$lib/services/public-figures';
import { getPronunciationExamplesServerSide } from '$lib/services/server-pronunciation-examples';
import { getUserLinkInfoServerSide } from '$lib/services/server-profile';

export const load: PageServerLoad = async (event) => {
  const { params, parent } = event;

  const publicFigure = await getPublicFigureBySlug(params.slug!);

  if (!publicFigure) {
    throw error(404, 'Public figure not found');
  }

  const { userContext } = await parent();

  const exampleData = await getPronunciationExamplesServerSide(
    event,
    publicFigure.id,
    userContext?.id || null
  );

  // Get user link info for the figure creator
  const creatorLinkInfo = getUserLinkInfoServerSide(
    publicFigure.creator_profile || null,
    userContext
  );

  return {
    publicFigure,
    userContext,
    examples: exampleData.examples,
    hiddenExamples: exampleData.hiddenExamples,
    totalExamples: exampleData.total,
    hiddenCount: exampleData.hiddenCount,
    hasMoreExamples: exampleData.hasMore,
    creatorLinkInfo,
  };
};
