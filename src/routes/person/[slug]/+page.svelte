<script lang="ts">
  import type { PublicFigure } from '$lib/types';

  export let data: { publicFigure: PublicFigure };
  $: ({ publicFigure } = data);
</script>

<svelte:head>
  <title>{publicFigure.name} - People Saying Their Own Names</title>
  <meta name="description" content={publicFigure.description} />
</svelte:head>

<div class="page-content">
  <article class="figure-article">
    <h1>{publicFigure.name}</h1>

    <div class="figure-info">
      {#if publicFigure.image_url}
        <div class="figure-image">
          <img src={publicFigure.image_url} alt={publicFigure.name} loading="lazy" />
        </div>
      {/if}

      <div class="figure-description">
        <p><strong>{publicFigure.name}</strong> is a {publicFigure.description}.</p>
      </div>
    </div>

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
    max-width: 300px;
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
  }

  .navigation {
    padding-top: 1rem;
    border-top: 1px solid var(--color-borders);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .figure-info {
      flex-direction: column;
      gap: 1rem;
    }

    .figure-image {
      max-width: 100%;
    }
  }
</style>
