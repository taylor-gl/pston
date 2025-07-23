<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  import type { LayoutData } from './$types';

  import Navigation from '$lib/components/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { checkAndHandleBanStatus } from '$lib/services/auth';

  let { children, data }: { children: any; data: LayoutData } = $props();

  // Client-side ban check to immediately clear session cache on navigation
  $effect(() => {
    if (browser && $page.url) {
      // Check ban status client-side to clear any cached session
      checkAndHandleBanStatus().catch(() => {
        // Ignore errors, server-side will handle the redirect
      });
    }
  });
</script>

<Navigation />

<main>
  {@render children()}
</main>

<Footer />

<style>
  main {
    max-width: 72rem;
    margin: 0 auto;
  }
</style>
