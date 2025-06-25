import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

export function createSupabaseServerClient(event: RequestEvent) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return event.cookies.get(name);
      },
      set(name, value, options) {
        event.cookies.set(name, value, { ...options, path: '/' });
      },
      remove(name, options) {
        event.cookies.delete(name, { ...options, path: '/' });
      },
    },
  });
}
