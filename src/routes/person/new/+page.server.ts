import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { parent } = event;

  const { userContext } = await parent();

  if (!userContext) {
    throw redirect(302, '/auth');
  }

  return {
    userContext,
  };
};
