<script lang="ts">
  import Icon from '@iconify/svelte';
  import YoutubePlayerEmbed from './YoutubePlayerEmbed.svelte';
  import { shouldStopPlayback, formatTime } from '$lib/utils/timestamp-utils';

  let {
    videoId,
    width = 360,
    height = 200,
    startTimestamp = 0.5,
    stopTimestamp = null,
  }: {
    videoId: string;
    width?: number;
    height?: number;
    startTimestamp?: number;
    stopTimestamp?: number | null;
  } = $props();

  let embedRef: YoutubePlayerEmbed;
  let isPlaying = $state(false);
  let playerReady = $state(false);

  function handlePlayerReady() {
    playerReady = true;
  }

  function handlePlayStateChange(playing: boolean) {
    isPlaying = playing;
  }

  function handleTimeUpdate(currentTime: number) {
    if (stopTimestamp !== null && shouldStopPlayback(currentTime, stopTimestamp, isPlaying)) {
      embedRef.pause();
    }
  }

  function togglePlayback() {
    if (!playerReady || !embedRef) return;

    if (isPlaying) {
      embedRef.pause();
    } else {
      embedRef.seekTo(startTimestamp, true);
      embedRef.play();
    }
  }
</script>

<div class="youtube-player">
  <YoutubePlayerEmbed
    bind:this={embedRef}
    {videoId}
    {width}
    {height}
    onPlayerReady={handlePlayerReady}
    onPlayStateChange={handlePlayStateChange}
    onTimeUpdate={handleTimeUpdate}
  />

  <div class="controls">
    <button
      onclick={togglePlayback}
      disabled={!playerReady}
      class="btn-secondary btn-sm btn-icon"
      aria-label={isPlaying ? 'Stop video' : 'Play video'}
    >
      {#if isPlaying}
        <Icon icon="material-symbols:stop" width="20" height="20" />
        Stop
      {:else}
        <Icon icon="material-symbols:play-arrow" width="20" height="20" />
        Play
      {/if}
    </button>

    <div class="timestamp-info">
      <span>Start: {formatTime(startTimestamp)}</span>
      {#if stopTimestamp !== null}
        <span>Stop: {formatTime(stopTimestamp)}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .youtube-player {
    background: var(--color-bg-light, #f8f9fa);
    padding: 0.75rem;
  }

  .controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 0.75rem;
    padding: 0;
  }

  .timestamp-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--color-text-light);
  }

  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      gap: 0.5rem;
    }

    .timestamp-info {
      flex-direction: row;
      gap: 1rem;
    }
  }
</style>
