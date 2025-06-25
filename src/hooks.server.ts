import type { Handle } from '@sveltejs/kit';

import { createSupabaseServerClient } from '$lib/supabase/server';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createSupabaseServerClient(event);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  event.locals.session = session;

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });
};
