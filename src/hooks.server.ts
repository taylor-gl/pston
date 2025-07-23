import type { Handle } from '@sveltejs/kit';

import { createSupabaseServerClient } from '$lib/supabase/server';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createSupabaseServerClient(event);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  event.locals.user = user;

  // Check if user is banned on every page load
  if (user) {
    try {
      const { data: isBanned, error } = await supabase.rpc('is_user_banned');

      if (!error && isBanned) {
        // User is banned - sign them out and redirect
        await supabase.auth.signOut();
        event.locals.user = null;

        // Redirect to home with banned parameter
        if (event.url.pathname !== '/' || !event.url.searchParams.has('banned')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: '/?banned=true',
            },
          });
        }
      }
    } catch (err) {
      console.error('Error checking ban status in server hook:', err);
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });
};
