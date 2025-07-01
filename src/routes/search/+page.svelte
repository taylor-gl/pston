<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { PublicFigure } from '$lib/types';
  import { searchPublicFigures } from '$lib/services/public-figures';
  import PublicFigureListItem from '$lib/components/PublicFigureListItem.svelte';

  let searchQuery = $state('');
  let searchResults: PublicFigure[] = $state([]);
  let loading = $state(false);
  let error: string | null = $state(null);

  let pageTitle = $derived(
    searchQuery
      ? `Search results for "${searchQuery}" - People Saying Their Own Names`
      : 'Search - People Saying Their Own Names'
  );

  async function performSearch(query: string) {
    if (!query.trim()) {
      searchResults = [];
      return;
    }

    loading = true;
    error = null;

    try {
      searchResults = await searchPublicFigures(query, 10);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Search failed';
      searchResults = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const unsubscribe = page.subscribe(($page) => {
      const query = $page.url.searchParams.get('q') || '';
      if (query !== searchQuery) {
        searchQuery = query;
        performSearch(query);
      }
    });

    return unsubscribe;
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content="Search results for public figures" />
</svelte:head>

<div class="search-page">
  {#if searchQuery}
    <div class="search-info">
      <h2>Search results for "{searchQuery}"</h2>

      {#if loading}
        <p>Searching...</p>
      {:else if error}
        <p class="error-message">Error: {error}</p>
      {:else if searchResults.length === 0}
        <p>No public figures found matching "{searchQuery}".</p>
        <div class="no-results-help">
          <p>Try:</p>
          <ul>
            <li>Checking your spelling</li>
            <li>Using different keywords</li>
            <li>Searching for part of a name</li>
          </ul>
        </div>
      {:else}
        <p class="help-text">
          Found {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
        </p>

        <ul class="figures-list">
          {#each searchResults as figure (figure.id)}
            <PublicFigureListItem {figure} />
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <div class="empty-search">
      <p>Enter a search query to find public figures.</p>
    </div>
  {/if}
</div>

<style>
  .search-page {
    max-width: 72rem;
    margin: 0 auto;
  }

  .search-info h2 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
    margin-bottom: 1rem;
  }

  .figures-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .empty-search {
    text-align: center;
    color: var(--color-borders);
    padding: 2rem;
  }

  .no-results-help {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--color-bg-light);
    border-radius: 4px;
  }

  .no-results-help ul {
    margin: 0.5rem 0 0 1rem;
    padding: 0;
  }

  .no-results-help li {
    margin-bottom: 0.25rem;
  }
</style>
