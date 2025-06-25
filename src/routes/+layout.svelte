<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  import type { LayoutData } from './$types';

  import Navigation from '$lib/components/Navigation.svelte';
  import { supabase } from '$lib/supabase/client';

  let { children, data }: { children: any; data: LayoutData } = $props();

  onMount(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.expires_at !== data.session?.expires_at) {
        location.reload();
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<Navigation />

<main>
  {@render children()}
</main>

<style>
  main {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0rem 1rem;
  }
</style>
