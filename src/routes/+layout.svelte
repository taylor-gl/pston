<script lang="ts">
  import '../app.css';

  import type { LayoutData } from './$types';

  import Navigation from '$lib/components/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<Navigation userContext={data.userContext} />

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
