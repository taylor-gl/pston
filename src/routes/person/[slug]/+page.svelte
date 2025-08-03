<script lang="ts">
  import type { PublicFigure, PronunciationExample } from '$lib/types';
  import type { ServerUserContext } from '$lib/services/server-auth';
  import type { ServerUserLinkInfo } from '$lib/services/server-profile';
  import { getImageUrl, deletePublicFigure } from '$lib/services/public-figures';
  import { getNextPageServerSide } from '$lib/services/server-pronunciation-examples';
  import { getUserLinkInfoServerSide } from '$lib/services/server-profile';
  import DeleteButton from '$lib/components/DeleteButton.svelte';
  import { goto } from '$app/navigation';
  import PronunciationExampleItem from '$lib/components/PronunciationExampleItem.svelte';

  interface PageData {
    publicFigure: PublicFigure;
    userContext: ServerUserContext | null;
    examples: PronunciationExample[];
    hiddenExamples: PronunciationExample[];
    totalExamples: number;
    hiddenCount: number;
    hasMoreExamples: boolean;
    creatorLinkInfo: ServerUserLinkInfo;
  }

  let { data }: { data: PageData } = $props();

  let examples: PronunciationExample[] = $state([...data.examples]);
  let hiddenExamples: PronunciationExample[] = $state([...data.hiddenExamples]);
  let hasMoreExamples = $state(data.hasMoreExamples);
  let totalExamples = $state(data.totalExamples);
  let hiddenCount = $state(data.hiddenCount);

  // UI state
  let currentPage = $state(1);
  let loadingExamples = $state(false);
  let examplesError: string | null = $state(null);
  let showHidden = $state(false);
  let deleteInProgress = $state(false);
  let deleteError: string | null = $state(null);

  // Computed values that need $derived
  let user = $derived(data.userContext?.profile || null);
  let canDeleteFigure = $derived(data.userContext?.canDeleteFigure || false);
  let canDeleteExamples = $derived(data.userContext?.canDeleteExamples || false);

  // Handle example deletion events
  const handleExampleDeleted = (event: Event) => {
    const customEvent = event as CustomEvent;
    const deletedId = customEvent.detail.exampleId;
    examples = examples.filter((ex) => ex.id !== deletedId);
    hiddenExamples = hiddenExamples.filter((ex) => ex.id !== deletedId);
    totalExamples = totalExamples - 1;
    if (hiddenExamples.length === 0) {
      showHidden = false;
    }
  };

  // Set up event listener on component mount
  if (typeof document !== 'undefined') {
    document.addEventListener('example-deleted', handleExampleDeleted);
  }

  async function loadNextPage() {
    try {
      loadingExamples = true;
      examplesError = null;
      currentPage += 1;
      // This would need to be implemented with a server action or API route
      // For now, we'll show all examples at once
      // Load next page functionality needs server action implementation
    } catch (err) {
      examplesError = err instanceof Error ? err.message : 'Failed to load more examples';
    } finally {
      loadingExamples = false;
    }
  }

  function toggleHidden() {
    showHidden = !showHidden;
  }

  async function handleDeleteFigure() {
    try {
      deleteInProgress = true;
      deleteError = null;
      await deletePublicFigure(data.publicFigure.id);

      // Navigate back to the home page or figures list
      goto('/');
    } catch (err) {
      deleteError = err instanceof Error ? err.message : 'Failed to delete public figure';
    } finally {
      deleteInProgress = false;
    }
  }
</script>

<svelte:head>
  <title>How to pronounce {data.publicFigure.name} - People Saying Their Own Names</title>
  <meta name="description" content={data.publicFigure.description} />
</svelte:head>

<div class="page-content">
  <div class="figure-header">
    <h1>How to pronounce {data.publicFigure.name}'s name?</h1>

    {#if canDeleteFigure}
      <div class="admin-controls">
        <DeleteButton
          onclick={handleDeleteFigure}
          disabled={deleteInProgress}
          title="Delete this public figure"
        />
      </div>
    {/if}
  </div>

  {#if deleteError}
    <div class="error-message">{deleteError}</div>
  {/if}

  <article class="figure-article">
    <div class="figure-info">
      {#if data.publicFigure.image_filename}
        <div class="figure-image">
          <img
            src={getImageUrl(data.publicFigure.image_filename)}
            alt={data.publicFigure.name}
            loading="lazy"
          />
        </div>
      {/if}

      <div class="figure-description">
        <p class="submission-info">
          Submitted by
          {#if data.creatorLinkInfo.isClickable}
            <a href={data.creatorLinkInfo.href} class="username-link"
              >{data.creatorLinkInfo.displayName}</a
            >
          {:else}
            {data.creatorLinkInfo.displayName}
          {/if}
          on {new Date(data.publicFigure.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <p><strong>{data.publicFigure.name}</strong> is a {data.publicFigure.description}.</p>
      </div>
    </div>
  </article>

  <section class="pronunciation-section">
    {#if loadingExamples}
      <p>Loading pronunciation examples...</p>
    {:else if examplesError}
      <p class="error-message">Error: {examplesError}</p>
    {:else if examples.length === 0 && hiddenCount === 0}
      <div class="no-examples">
        <p>No pronunciation examples yet for {data.publicFigure.name}.</p>
        {#if user}
          <p>
            <a href="/pronunciation/new?figure={data.publicFigure.slug}"
              >Be the first to submit one!</a
            >
          </p>
        {:else}
          <p>
            <a href="/auth?redirect=/pronunciation/new?figure={data.publicFigure.slug}"
              >Sign in to submit the first one!</a
            >
          </p>
        {/if}
      </div>
    {:else}
      <div class="section-header">
        {#if user}
          <a href="/pronunciation/new?figure={data.publicFigure.slug}">
            Submit a new pronunciation
          </a>
        {:else}
          <a href="/auth?redirect=/pronunciation/new?figure={data.publicFigure.slug}">
            Sign in to submit a pronunciation
          </a>
        {/if}
      </div>
      <div class="examples-list">
        {#each examples as example (example.id)}
          <PronunciationExampleItem
            {example}
            userContext={data.userContext}
            creatorLinkInfo={getUserLinkInfoServerSide(
              example.creator_profile || null,
              data.userContext
            )}
          />
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
            <div class="examples-list">
              {#each hiddenExamples as example (example.id)}
                <PronunciationExampleItem
                  {example}
                  userContext={data.userContext}
                  creatorLinkInfo={getUserLinkInfoServerSide(
                    example.creator_profile || null,
                    data.userContext
                  )}
                />
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
</div>

<style>
  .page-content {
    max-width: 72rem;
    margin: 0 auto;
    padding-top: 2rem;
  }

  .figure-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
    margin-bottom: 1rem;
  }

  .figure-article {
    max-width: 50rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
  }

  .figure-header h1 {
    margin: 0;
  }

  .admin-controls {
    display: flex;
    gap: 0.5rem;
  }

  .error-message {
    color: var(--color-error);
    background-color: var(--color-error-light, rgba(220, 38, 38, 0.1));
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
    max-width: 50rem;
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
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pronunciation-section {
    border-top: 1px solid var(--color-borders);
  }

  .submission-info {
    color: var(--color-text-light);
    font-size: 0.75rem;
    margin: 0;
  }

  .username-link {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
  }

  .username-link:hover {
    text-decoration: underline;
    color: var(--color-primary-dark);
  }

  .section-header {
    padding: 1rem 0;
  }

  .no-examples {
    text-align: center;
    padding: 2rem;
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

  .navigation {
    padding: 1rem 0;
  }
</style>
