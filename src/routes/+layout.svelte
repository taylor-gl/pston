<script lang="ts">
  import '../app.css';

  import type { LayoutData } from './$types';

  import Navigation from '$lib/components/Navigation.svelte';

  let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<Navigation />

<main>
  {@render children()}
</main>

<style>
  main {
    max-width: 72rem;
    margin: 0 auto;
  }
</style>
