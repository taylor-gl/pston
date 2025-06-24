import { redirect } from '@sveltejs/kit'
import { createSupabaseServerClient } from '$lib/supabase/server'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event)
  const code = event.url.searchParams.get('code')

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  throw redirect(303, '/')
} 