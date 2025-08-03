import type { LayoutServerLoad } from './$types';
import { getServerUserContext } from '$lib/services/server-auth';

export const load: LayoutServerLoad = async (event) => {
  const userContext = await getServerUserContext(event);

  return {
    userContext,
  };
};
