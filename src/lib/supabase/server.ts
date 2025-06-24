import { createServerClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { RequestEvent } from '@sveltejs/kit'

export function createSupabaseServerClient(event: RequestEvent) {
  return createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return event.cookies.get(name)
        },
        set(name, value, options) {
          event.cookies.set(name, value, { ...options, path: '/' })
        },
        remove(name, options) {
          event.cookies.delete(name, { ...options, path: '/' })
        }
      }
    }
  )
} 