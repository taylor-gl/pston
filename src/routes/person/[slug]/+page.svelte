<script lang="ts">
  import { onMount } from 'svelte';
  import type { PublicFigure, PronunciationExample } from '$lib/types';
  import type { User } from '@supabase/supabase-js';
  import { getImageUrl } from '$lib/services/public-figures';
  import { getPronunciationExamplesByFigureId } from '$lib/services/pronunciation-examples';
  import { getCurrentUser } from '$lib/services/auth';
  import PronunciationExampleItem from '$lib/components/PronunciationExampleItem.svelte';

  let { data }: { data: { publicFigure: PublicFigure } } = $props();
  let publicFigure = $derived(data.publicFigure);

  let examples: PronunciationExample[] = $state([]);
  let hiddenExamples: PronunciationExample[] = $state([]);
  let hasMoreExamples = $state(false);
  let totalExamples = $state(0);
  let hiddenCount = $state(0);
  let currentPage = $state(1);
  let loadingExamples = $state(true);
  let examplesError: string | null = $state(null);
  let user: User | null = $state(null);
  let showHidden = $state(false);

  onMount(() => {
    getCurrentUser().then((currentUser) => {
      user = currentUser;
    });

    loadExamples();
  });

  async function loadExamples() {
    try {
      loadingExamples = true;
      examplesError = null;
      const result = await getPronunciationExamplesByFigureId(publicFigure.id, currentPage);
      examples = result.examples;
      hiddenExamples = result.hiddenExamples;
      hasMoreExamples = result.hasMore;
      totalExamples = result.total;
      hiddenCount = result.hiddenCount;
    } catch (err) {
      examplesError = err instanceof Error ? err.message : 'Failed to load pronunciation examples';
    } finally {
      loadingExamples = false;
    }
  }

  async function loadNextPage() {
    currentPage += 1;
    await loadExamples();
  }

  function toggleHidden() {
    showHidden = !showHidden;
  }
</script>

<svelte:head>
  <title>{publicFigure.name} - People Saying Their Own Names</title>
  <meta name="description" content={publicFigure.description} />
</svelte:head>

<div class="page-content">
  <article class="figure-article">
    <h1>{publicFigure.name}</h1>

    <div class="figure-info">
      {#if publicFigure.image_filename}
        <div class="figure-image">
          <img
            src={getImageUrl(publicFigure.image_filename)}
            alt={publicFigure.name}
            loading="lazy"
          />
        </div>
      {/if}

      <div class="figure-description">
        <p><strong>{publicFigure.name}</strong> is a {publicFigure.description}.</p>
      </div>
    </div>

    <section class="pronunciation-section">
      {#if loadingExamples}
        <p>Loading pronunciation examples...</p>
      {:else if examplesError}
        <p class="error-message">Error: {examplesError}</p>
      {:else if examples.length === 0 && hiddenCount === 0}
        <div class="no-examples">
          <p>No pronunciation examples yet for {publicFigure.name}.</p>
          {#if user}
            <p>
              <a href="/pronunciation/new?figure={publicFigure.slug}">Be the first to submit one!</a
              >
            </p>
          {:else}
            <p>
              <a href="/auth?redirect=/pronunciation/new?figure={publicFigure.slug}"
                >Sign in to submit the first one!</a
              >
            </p>
          {/if}
        </div>
      {:else}
        <div class="section-header">
          {#if user}
            <a href="/pronunciation/new?figure={publicFigure.slug}"> Submit a new pronunciation </a>
          {:else}
            <a href="/auth?redirect=/pronunciation/new?figure={publicFigure.slug}">
              Sign in to submit a pronunciation
            </a>
          {/if}
        </div>
        <div class="examples-list">
          {#each examples as example (example.id)}
            <PronunciationExampleItem {example} />
          {/each}
        </div>

        {#if hasMoreExamples}
          <div class="pagination">
            <button onclick={loadNextPage} class="btn-secondary"> Load more examples </button>
          </div>
        {/if}

        {#if hiddenCount > 0}
          <div class="hidden-section">
            <button onclick={toggleHidden} class="hidden-toggle">
              {#if showHidden}
                Hide {hiddenCount} downvoted example{hiddenCount === 1 ? '' : 's'}
              {:else}
                Show {hiddenCount} downvoted example{hiddenCount === 1 ? '' : 's'} (click to expand)
              {/if}
            </button>

            {#if showHidden}
              <div class="hidden-examples">
                {#each hiddenExamples as example (example.id)}
                  <PronunciationExampleItem {example} />
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </section>

    <div class="navigation">
      <a href="/" class="back-link">← Back to all public figures</a>
    </div>
  </article>
</div>

<style>
  .page-content {
    max-width: 72rem;
    margin: 0 auto;
  }

  .figure-article {
    max-width: 50rem;
  }

  .figure-article h1 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
  }

  .figure-info {
    display: flex;
    gap: 2rem;
  }

  .figure-image {
    padding: 0.5rem;
    flex-shrink: 0;
    max-width: 150px;
  }

  .figure-image img {
    width: 100%;
    height: auto;
    border-radius: 50%;
    object-fit: cover;
    aspect-ratio: 1;
  }

  .figure-description {
    flex: 1;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .pronunciation-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-borders);
  }

  .section-header {
    padding: 0.5rem 0;
  }

  .submit-link:hover {
    text-decoration: underline;
  }

  .no-examples {
    text-align: center;
    padding: 2rem;
    color: var(--color-borders);
    background: var(--color-bg-light);
    border-radius: 4px;
    border: 1px solid var(--color-borders);
  }

  .no-examples p {
    margin: 0.5rem 0;
  }

  .pagination {
    margin-top: 1rem;
    text-align: center;
  }

  .hidden-section {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-borders);
  }

  .hidden-toggle {
    background: none;
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-text-light);
    width: 100%;
    text-align: center;
    transition: all 0.2s ease;
  }

  .hidden-toggle:hover {
    background: var(--color-bg-light);
    border-color: var(--color-text-light);
  }

  .hidden-examples {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-borders);
    opacity: 0.7;
  }

  .navigation {
    padding: 0.5rem 0;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .figure-info {
      flex-direction: column;
      gap: 1rem;
    }

    .figure-image {
      max-width: 120px;
      align-self: center;
    }
  }
</style>
