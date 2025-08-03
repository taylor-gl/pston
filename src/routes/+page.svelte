<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import type { PublicFigure } from '$lib/types';
  import type { ServerUserContext } from '$lib/services/server-auth';
  import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
  import PublicFigureListItem from '$lib/components/PublicFigureListItem.svelte';
  import YouTubePlayer from '$lib/components/YouTubePlayer.svelte';

  interface PageData {
    userContext: ServerUserContext | null;
    publicFigures: PublicFigure[];
  }

  let { data }: { data: PageData } = $props();

  // Computed value that needs $derived
  const isBannedUser = $derived(browser && $page.url.searchParams.has('banned'));
</script>

<svelte:head>
  <title>People Saying Their Own Names</title>
  <meta
    name="description"
    content="Learn to pronounce names correctly. We collect real clips of public figures saying their own names."
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
      <h2>Learn to pronounce names correctly.</h2>
      <p>We collect real clips of public figures saying their own&nbsp;names.</p>
    </div>
  </div>

  {#if isBannedUser}
    <div class="error-message">Your account has been banned. You have been signed out.</div>
  {/if}

  <div class="figures-section">
    <h2 class="section-header">Popular Public Figures</h2>

    {#if data.publicFigures.length === 0}
      <p class="add-figure-container">
        No public figures yet.
        {#if data.userContext?.profile}
          <a href="/person/new">Add the first one!</a>
        {:else}
          <a href="/auth">Sign in to add the first one!</a>
        {/if}
      </p>
    {:else}
      <p class="add-figure-container">
        {#if data.userContext?.profile}
          <a href="/pronunciation/new" class="create-link">Add a new pronunciation example</a>
        {:else}
          <a href="/auth" class="create-link">Sign in to add a new pronunciation example</a>
        {/if}
      </p>
      <ul class="figures-list">
        {#each data.publicFigures as figure (figure.id)}
          <PublicFigureListItem {figure} />
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .add-figure-container {
    padding: 1rem 0;
    margin: 0;
  }

  .section-header {
    margin-bottom: 0;
  }

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

  .figures-section {
    margin: 1rem 0;
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
</style>
