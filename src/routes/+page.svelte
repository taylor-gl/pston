<script lang="ts">
  import { onMount } from 'svelte';
  import type { PublicFigure } from '$lib/types';
  import type { User } from '@supabase/supabase-js';
  import { getAllPublicFigures, getImageUrl } from '$lib/services/public-figures';
  import { getCurrentUser } from '$lib/services/auth';

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

<div>
  <div class="header">
    <h2>It's embarrassing to say someone's name wrong.</h2>
    <p>We collect real clips of people saying their own names—so you can get it right.</p>
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
          <li class="figure-item">
            {#if figure.image_filename}
              <div class="figure-thumbnail">
                <img src={getImageUrl(figure.image_filename)} alt={figure.name} loading="lazy" />
              </div>
            {/if}
            <div class="figure-text">
              <a href="/person/{figure.slug}" class="figure-link">
                {figure.name}
              </a>
              <span class="description">— {figure.description}</span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
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
    line-height: 1.6;
  }

  .figure-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .figure-thumbnail {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
  }

  .figure-thumbnail img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .figure-text {
    flex: 1;
  }

  .figure-link {
    font-weight: 500;
  }

  .description {
    color: var(--color-text);
    opacity: 0.7;
    font-size: 0.9rem;
  }

  .error {
    color: var(--color-error);
    background-color: var(--color-error-bg);
    padding: 0.5rem;
  }
</style>
