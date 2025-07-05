<script lang="ts">
  import type { PronunciationExample } from '$lib/types';
  import {
    votePronunciationExample,
    removePronunciationExampleVote,
    deletePronunciationExample,
  } from '$lib/services/pronunciation-examples';
  import { getCurrentUser, hasPermission } from '$lib/services/auth';
  import YouTubePlayer from './YouTubePlayer.svelte';
  import Icon from '@iconify/svelte';
  import { onMount } from 'svelte';
  import type { User } from '@supabase/supabase-js';

  let { example }: { example: PronunciationExample } = $props();

  let user: User | null = $state(null);
  let votingInProgress = $state(false);
  let voteError: string | null = $state(null);
  let canDelete = $state(false);
  let deleteInProgress = $state(false);
  let deleteError: string | null = $state(null);
  let upvotes = $derived(example.upvotes);
  let downvotes = $derived(example.downvotes);
  let userVote = $derived(example.user_vote);
  let netScore = $derived(upvotes - downvotes);

  let submissionDate = $derived(
    new Date(example.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  onMount(async () => {
    user = await getCurrentUser();
    if (user) {
      canDelete = await hasPermission('can_delete_pronunciation_examples');
    }
  });

  async function handleUpvote() {
    if (!user || votingInProgress) return;

    try {
      votingInProgress = true;
      voteError = null;

      if (userVote?.vote_type === 'upvote') {
        await removePronunciationExampleVote(example.id);
        example.upvotes--;
        example.user_vote = null;
      } else {
        if (userVote?.vote_type === 'downvote') {
          example.downvotes--;
        }

        const vote = await votePronunciationExample({
          pronunciation_example_id: example.id,
          vote_type: 'upvote',
        });

        example.upvotes++;
        example.user_vote = vote;
      }
    } catch (err) {
      voteError = err instanceof Error ? err.message : 'Failed to vote';
      console.error('Voting error:', err);
    } finally {
      votingInProgress = false;
    }
  }

  async function handleDownvote() {
    if (!user || votingInProgress) return;

    try {
      votingInProgress = true;
      voteError = null;

      if (userVote?.vote_type === 'downvote') {
        await removePronunciationExampleVote(example.id);
        example.downvotes--;
        example.user_vote = null;
      } else {
        if (userVote?.vote_type === 'upvote') {
          example.upvotes--;
        }

        const vote = await votePronunciationExample({
          pronunciation_example_id: example.id,
          vote_type: 'downvote',
        });

        example.downvotes++;
        example.user_vote = vote;
      }
    } catch (err) {
      voteError = err instanceof Error ? err.message : 'Failed to vote';
      console.error('Voting error:', err);
    } finally {
      votingInProgress = false;
    }
  }

  async function handleDelete() {
    if (!user || !canDelete || deleteInProgress) return;

    try {
      deleteInProgress = true;
      deleteError = null;

      await deletePronunciationExample(example.id);

      const event = new CustomEvent('example-deleted', {
        detail: { exampleId: example.id },
        bubbles: true
      });

      if (typeof document !== 'undefined') {
        document.dispatchEvent(event);
      }
    } catch (err) {
      deleteError = err instanceof Error ? err.message : 'Failed to delete pronunciation example';
      console.error('Delete error:', err);
    } finally {
      deleteInProgress = false;
    }
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
    <button
      class="vote-btn upvote"
      class:active={userVote?.vote_type === 'upvote'}
      onclick={handleUpvote}
      disabled={!user || votingInProgress}
      title={user ? 'Upvote this pronunciation' : 'Sign in to vote'}
    >
      <Icon icon="material-symbols:keyboard-arrow-up" width="20" height="20" />
    </button>
    <span class="vote-count" class:positive={netScore > 0} class:negative={netScore < 0}>
      {netScore}
    </span>
    <button
      class="vote-btn downvote"
      class:active={userVote?.vote_type === 'downvote'}
      onclick={handleDownvote}
      disabled={!user || votingInProgress}
      title={user ? 'Downvote this pronunciation' : 'Sign in to vote'}
    >
      <Icon icon="material-symbols:keyboard-arrow-down" width="20" height="20" />
    </button>
    
    {#if canDelete}
      <button
        class="delete-btn"
        onclick={handleDelete}
        disabled={deleteInProgress}
        title="Delete this pronunciation example"
      >
        <Icon icon="material-symbols:delete" width="20" height="20" />
      </button>
    {/if}
  </div>

  <div class="example-meta">
    {#if example.description}
      <p class="description">{example.description}</p>
    {/if}

    <p class="submission-info">
      Submitted on {submissionDate}
    </p>

    {#if voteError}
      <p class="vote-error">{voteError}</p>
    {/if}

    {#if deleteError}
      <p class="delete-error">{deleteError}</p>
    {/if}
  </div>
</article>

<style>
  .pronunciation-example {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0;
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
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    transition: all 0.2s ease;
  }

  .vote-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .vote-btn:hover:not(:disabled) {
    background: var(--color-bg-light);
  }

  .vote-btn.upvote:hover:not(:disabled),
  .vote-btn.upvote.active {
    border-color: var(--color-success);
    color: var(--color-success);
    background: var(--color-success-light, rgba(34, 197, 94, 0.1));
  }

  .vote-btn.downvote:hover:not(:disabled),
  .vote-btn.downvote.active {
    border-color: var(--color-warning);
    color: var(--color-warning);
    background: var(--color-warning-light, rgba(251, 146, 60, 0.1));
  }

  .vote-count {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.75rem;
    min-height: 0.9rem;
    display: flex;
    align-items: center;
    transition: color 0.2s ease;
  }

  .vote-count.positive {
    color: var(--color-success);
  }

  .vote-count.negative {
    color: var(--color-warning);
  }

  .delete-btn {
    background: none;
    border: none;
    border-radius: 2px;
    padding: 0.125rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    transition: all 0.2s ease;
    color: var(--color-error, #dc2626);
    margin-top: 0.5rem;
  }

  .delete-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .delete-btn:hover:not(:disabled) {
    background: var(--color-error-light, rgba(220, 38, 38, 0.1));
    color: var(--color-error-dark, #b91c1c);
  }

  .example-meta {
    flex: 1;
    margin-top: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .description {
    font-style: italic;
    color: var(--color-text-light);
    margin: 0;
    font-size: 0.9rem;
  }

  .submission-info {
    color: var(--color-text-light);
    font-size: 0.75rem;
    margin: 0;
  }

  .vote-error {
    color: var(--color-error);
    font-size: 0.75rem;
    margin: 0;
  }

  .delete-error {
    color: var(--color-error);
    font-size: 0.75rem;
    margin: 0;
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

    .delete-btn {
      margin-top: 0;
      margin-left: 0.5rem;
    }

    .example-meta {
      margin-top: 0;
    }
  }
</style>
