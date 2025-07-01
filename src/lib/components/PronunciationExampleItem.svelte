<script lang="ts">
  import type { PronunciationExample } from '$lib/types';
  import YouTubePlayer from './YouTubePlayer.svelte';
  import Icon from '@iconify/svelte';

  let { example }: { example: PronunciationExample } = $props();

  let submissionDate = $derived(
    new Date(example.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  function handleUpvote() {
    // Placeholder for future upvote functionality
  }

  function handleDownvote() {
    // Placeholder for future downvote functionality
  }
</script>

<article class="pronunciation-example">
  <div class="video-section">
    <YouTubePlayer
      videoId={example.youtube_video_id}
      startTimestamp={example.start_timestamp}
      stopTimestamp={example.end_timestamp}
      width={480}
      height={270}
    />
  </div>

  <div class="vote-controls">
    <button class="vote-btn upvote" onclick={handleUpvote} disabled>
      <Icon icon="material-symbols:keyboard-arrow-up" width="20" height="20" />
    </button>
    <span class="vote-count">0</span>
    <button class="vote-btn downvote" onclick={handleDownvote} disabled>
      <Icon icon="material-symbols:keyboard-arrow-down" width="20" height="20" />
    </button>
  </div>

  <div class="example-meta">
    <p class="help-text">
      Submitted on {submissionDate}
    </p>
  </div>
</article>

<style>
  .pronunciation-example {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-borders);
  }

  .pronunciation-example:last-child {
    border-bottom: none;
  }

  .video-section {
    flex-shrink: 0;
  }

  .vote-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    flex-shrink: 0;
    width: 32px;
    margin-top: 0.5rem;
  }

  .vote-btn {
    background: none;
    border: 1px solid var(--color-borders);
    border-radius: 2px;
    padding: 0.125rem;
    cursor: not-allowed;
    opacity: 0.5;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  .vote-btn:hover:not(:disabled) {
    background: var(--color-bg-light);
  }

  .upvote:hover:not(:disabled) {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .downvote:hover:not(:disabled) {
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .vote-count {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.75rem;
    min-height: 0.9rem;
    display: flex;
    align-items: center;
  }

  .example-meta {
    flex: 1;
    margin-top: 0;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .pronunciation-example {
      flex-direction: column;
      gap: 0.5rem;
    }

    .vote-controls {
      flex-direction: row;
      justify-content: center;
      width: auto;
      margin-top: 0;
    }

    .example-meta {
      margin-top: 0;
    }
  }
</style>
