<script lang="ts">
  import type { PronunciationExample } from '$lib/types';
  import type { ServerUserContext } from '$lib/services/server-auth';
  import type { ServerUserLinkInfo } from '$lib/services/server-profile';
  import {
    votePronunciationExample,
    removePronunciationExampleVote,
    deletePronunciationExample,
  } from '$lib/services/pronunciation-examples';
  import YouTubePlayer from './YouTubePlayer.svelte';
  import DeleteButton from './DeleteButton.svelte';
  import Icon from '@iconify/svelte';

  interface Props {
    example: PronunciationExample;
    userContext: ServerUserContext | null;
    creatorLinkInfo: ServerUserLinkInfo;
  }

  let { example, userContext, creatorLinkInfo }: Props = $props();

  let user = $derived(userContext?.profile || null);
  let canDelete = $derived(userContext?.canDeleteExamples || false);
  let votingInProgress = $state(false);
  let voteError: string | null = $state(null);
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
        bubbles: true,
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

<article class="video-player-card">
  <div class="video-container">
    <YouTubePlayer
      videoId={example.youtube_video_id}
      startTimestamp={example.start_timestamp}
      stopTimestamp={example.end_timestamp}
      width={480}
      height={270}
    />
    {#if canDelete}
      <div class="video-overlay">
        <DeleteButton
          onclick={handleDelete}
          disabled={deleteInProgress}
          title="Delete this pronunciation example"
        />
      </div>
    {/if}
  </div>

  <div class="card-content">
    <div class="content-layout">
      <div class="vote-controls">
        <button
          class="vote-btn upvote"
          class:active={userVote?.vote_type === 'upvote'}
          onclick={handleUpvote}
          disabled={!user || votingInProgress}
          title={user ? 'Upvote this pronunciation' : 'Sign in to vote'}
        >
          <Icon icon="material-symbols:thumb-up" width="18" height="18" />
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
          <Icon icon="material-symbols:thumb-down" width="18" height="18" />
        </button>
      </div>

      <div class="main-content">
        <div class="card-body">
          {#if example.description}
            <p class="description">{example.description}</p>
          {/if}

          <p class="submission-info">
            Submitted by
            {#if creatorLinkInfo.isClickable}
              <a href={creatorLinkInfo.href} class="username-link">{creatorLinkInfo.displayName}</a>
            {:else}
              {creatorLinkInfo.displayName}
            {/if}
            on {submissionDate}
          </p>
        </div>

        {#if voteError || deleteError}
          <div class="card-errors">
            {#if voteError}
              <p class="error-message vote-error">{voteError}</p>
            {/if}
            {#if deleteError}
              <p class="error-message delete-error">{deleteError}</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</article>

<style>
  .video-player-card {
    background: var(--color-bg-card, #ffffff);
    border: 1px solid var(--color-borders);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 1.5rem;
    max-width: 600px;
  }

  .video-container {
    position: relative;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
  }

  .video-overlay {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 10;
  }

  .card-content {
    padding: 0.75rem;
  }

  .content-layout {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .vote-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    flex-shrink: 0;
  }

  .vote-btn {
    background: none;
    border: none;
    border-radius: 4px;
    padding: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    transition: all 0.15s ease;
    color: var(--color-text-light);
  }

  .vote-btn:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .vote-btn:hover:not(:disabled) {
    background: var(--color-bg-light, #f8f9fa);
    transform: scale(1.1);
  }

  .vote-btn.upvote:hover:not(:disabled) {
    color: var(--color-success);
    background: var(--color-success-light, rgba(34, 197, 94, 0.1));
  }

  .vote-btn.upvote.active {
    color: var(--color-success);
    background: var(--color-success-light, rgba(34, 197, 94, 0.15));
  }

  .vote-btn.downvote:hover:not(:disabled) {
    color: var(--color-warning);
    background: var(--color-warning-light, rgba(251, 146, 60, 0.1));
  }

  .vote-btn.downvote.active {
    color: var(--color-warning);
    background: var(--color-warning-light, rgba(251, 146, 60, 0.15));
  }

  .vote-count {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.8rem;
    min-width: 1.5rem;
    text-align: center;
    padding: 0.125rem 0;
    transition: all 0.15s ease;
  }

  .vote-count.positive {
    color: var(--color-success);
  }

  .vote-count.negative {
    color: var(--color-warning);
  }

  .main-content {
    flex: 1;
    min-width: 0;
  }


  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .description {
    color: var(--color-text);
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
    padding: 0.75rem;
    background: var(--color-bg-light, #f8f9fa);
    border-radius: 6px;
    border-left: 3px solid var(--color-primary);
  }

  .submission-info {
    color: var(--color-text-light);
    font-size: 0.8rem;
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

  .card-errors {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-borders);
  }

  .error-message {
    color: var(--color-error);
    font-size: 0.8rem;
    margin: 0;
    padding: 0.5rem;
    background: var(--color-error-light, rgba(220, 38, 38, 0.1));
    border-radius: 4px;
    border-left: 3px solid var(--color-error);
  }

  .error-message + .error-message {
    margin-top: 0.5rem;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .content-layout {
      flex-direction: column;
      gap: 0.75rem;
    }

    .vote-controls {
      flex-direction: row;
      justify-content: center;
      align-self: center;
      gap: 0.5rem;
    }

    .vote-controls .vote-btn {
      width: 36px;
      height: 36px;
    }

    .vote-count {
      font-size: 0.85rem;
      min-width: 2rem;
      padding: 0.25rem 0.5rem;
    }
  }
</style>
