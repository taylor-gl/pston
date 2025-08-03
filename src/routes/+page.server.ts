import type { PageServerLoad } from './$types';
import { getAllPublicFigures } from '$lib/services/public-figures';

export const load: PageServerLoad = async (event) => {
  const { parent } = event;

  const { userContext } = await parent();
  const publicFigures = await getAllPublicFigures();

  return {
    userContext,
    publicFigures,
  };
};
