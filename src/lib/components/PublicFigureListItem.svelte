<script lang="ts">
  import type { PublicFigure } from '$lib/types';
  import { getImageUrl } from '$lib/services/public-figures';

  let {
    figure,
    variant = 'default',
    showLink = true,
  }: {
    figure: PublicFigure;
    variant?: 'default' | 'small';
    showLink?: boolean;
  } = $props();

  let imageSize = $derived(variant === 'small' ? 32 : 48);
</script>

<li class="figure-item" class:small={variant === 'small'}>
  {#if figure.image_filename}
    <div class="figure-thumbnail" style="width: {imageSize}px; height: {imageSize}px;">
      <img src={getImageUrl(figure.image_filename)} alt={figure.name} loading="lazy" />
    </div>
  {/if}
  <div class="figure-text">
    <div class="figure-name">
      {#if showLink}
        <a href="/person/{figure.slug}" class="figure-link">
          {figure.name}
        </a>
      {:else}
        <span class="figure-link">
          {figure.name}
        </span>
      {/if}
    </div>
    <div class="figure-description">{figure.description}</div>
  </div>
</li>

<style>
  .figure-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .figure-item.small {
    gap: 0.75rem;
    padding: 0.4rem 0;
  }

  .figure-thumbnail {
    flex-shrink: 0;
  }

  .figure-thumbnail img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .figure-text {
    flex: 1;
    min-width: 0;
  }

  .figure-name {
    line-height: 1.4;
  }

  .figure-link {
    font-weight: 500;
  }

  a.figure-link {
    color: var(--color-link);
    text-decoration: none;
  }

  a.figure-link:hover {
    color: var(--color-link);
    text-decoration: underline;
  }

  .figure-description {
    color: var(--color-text);
    opacity: 0.7;
    font-size: 0.9rem;
    line-height: 1.4;
    margin-top: 0.1rem;
  }

  .figure-item.small .figure-description {
    font-size: 0.8rem;
  }
</style>
