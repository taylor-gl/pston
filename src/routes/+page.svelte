<script lang="ts">
  import { onMount } from 'svelte';
  import type { PublicFigure } from '$lib/types';
  import type { User } from '@supabase/supabase-js';
  import { getAllPublicFigures } from '$lib/services/public-figures';
  import { getCurrentUser } from '$lib/services/auth';
  import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
  import PublicFigureListItem from '$lib/components/PublicFigureListItem.svelte';

  let publicFigures: PublicFigure[] = [];
  let loading = true;
  let error: string | null = null;
  let user: User | null = null;

  onMount(() => {
    getCurrentUser().then((currentUser) => {
      user = currentUser;
    });

    getAllPublicFigures()
      .then((figures) => {
        publicFigures = figures;
      })
      .catch((err) => {
        error = err instanceof Error ? err.message : 'Failed to load public figures';
      })
      .finally(() => {
        loading = false;
      });
  });
</script>

<svelte:head>
  <title>People Saying Their Own Names</title>
  <meta
    name="description"
    content="Videos of people saying their own names. We collect real clips of public figures saying their own names—so you don't have to guess."
  />
</svelte:head>

<div>
  <div class="header">
    <div class="giraffe-container">
      <ResponsiveImage
        name="giraffe"
        alt="Giraffe saying 'Giraffe!'"
        sizes="(max-width: 768px) 80vw, 300px"
        class="giraffe-image"
      />
    </div>
    <div class="header-text">
      <h2>Videos of people saying their own&nbsp;names.</h2>
      <p>We collect real clips of people saying their own names—so you don't have to&nbsp;guess.</p>
    </div>
  </div>

  <div class="figures-section">
    <h2>Popular Public Figures</h2>

    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p class="error">Error: {error}</p>
    {:else if publicFigures.length === 0}
      <p>
        No public figures yet.
        {#if user}
          <a href="/person/new">Add the first one!</a>
        {:else}
          <a href="/auth">Sign in to add the first one!</a>
        {/if}
      </p>
    {:else}
      <div class="add-figure-container">
        {#if user}
          <a href="/person/new" class="create-link">Add a new public figure</a>
        {:else}
          <a href="/auth" class="create-link">Sign in to add a new public figure</a>
        {/if}
      </div>
      <ul class="figures-list">
        {#each publicFigures as figure (figure.id)}
          <PublicFigureListItem {figure} />
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 4rem;
    margin: 2rem;
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      gap: 1.5rem;
      text-align: center;
    }
  }

  .giraffe-container {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    :global(.giraffe-image) {
      width: 80vw;
      max-width: 300px;
    }
  }

  .header-text {
    flex: 1;
    text-align: center;
  }

  .header-text h2 {
    margin-top: 0;
  }

  .create-link {
    font-weight: 500;
  }

  .figures-section h2 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
  }

  .figures-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .error {
    color: var(--color-error);
    background-color: var(--color-error-bg);
    padding: 0.5rem;
  }
</style>
