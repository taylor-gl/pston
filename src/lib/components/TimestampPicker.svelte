<script lang="ts">
  import Icon from '@iconify/svelte';
  import YoutubePlayerEmbed from './YoutubePlayerEmbed.svelte';
  import {
    getTimelinePosition,
    formatTime,
    calculateTimeFromPosition,
    adjustTimestamps,
    nudgeTimestamp,
    shouldStopPlayback,
  } from '$lib/utils/timestamp-utils';

  let {
    videoId,
    startTimestamp = $bindable(0),
    endTimestamp = $bindable(5),
    width = 640,
    height = 360,
  }: {
    videoId: string;
    startTimestamp: number;
    endTimestamp: number;
    width?: number;
    height?: number;
  } = $props();

  let embedRef: YoutubePlayerEmbed;
  let timelineRef = $state<HTMLDivElement>();
  let isPlaying = $state(false);
  let playerReady = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let activeTimestamp: 'start' | 'end' = $state('start');
  let isDragging = $state(false);

  function handlePlayerReady() {
    playerReady = true;
    duration = embedRef.getDuration();
  }

  function handlePlayStateChange(playing: boolean) {
    isPlaying = playing;
  }

  function handleTimeUpdate(time: number) {
    currentTime = time;

    if (shouldStopPlayback(time, endTimestamp, isPlaying)) {
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

  function nudgeActiveTimestamp(amount: number) {
    const result = nudgeTimestamp(startTimestamp, endTimestamp, amount, activeTimestamp, duration);
    startTimestamp = result.startTimestamp;
    endTimestamp = result.endTimestamp;
    seekToActiveTimestamp();
  }

  function seekToActiveTimestamp() {
    if (!embedRef) return;
    const targetTime = activeTimestamp === 'start' ? startTimestamp : endTimestamp;
    embedRef.seekTo(targetTime, true);
  }

  function handleTimelineClick(event: MouseEvent) {
    if (!timelineRef || !duration || !embedRef) return;

    const rect = timelineRef.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = calculateTimeFromPosition(clickX, duration, rect);

    embedRef.seekTo(newTime, true);
  }

  function handleMarkerMouseDown(event: MouseEvent, type: 'start' | 'end') {
    event.preventDefault();
    event.stopPropagation();
    activeTimestamp = type;
    isDragging = true;

    function handleMouseMove(e: MouseEvent) {
      if (!timelineRef || !duration || !isDragging) return;

      const rect = timelineRef.getBoundingClientRect();
      const dragX = e.clientX - rect.left;
      const newTime = calculateTimeFromPosition(dragX, duration, rect);

      const result = adjustTimestamps(
        startTimestamp,
        endTimestamp,
        newTime,
        activeTimestamp,
        duration
      );
      startTimestamp = result.startTimestamp;
      endTimestamp = result.endTimestamp;
    }

    function handleMouseUp() {
      isDragging = false;
      seekToActiveTimestamp();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function setToCurrentTime(type: 'start' | 'end') {
    const result = adjustTimestamps(startTimestamp, endTimestamp, currentTime, type, duration);
    startTimestamp = result.startTimestamp;
    endTimestamp = result.endTimestamp;
    activeTimestamp = type;
  }
</script>

<div class="timestamp-picker">
  <div class="guidelines">
    <p>
      <Icon icon="material-symbols:info-outline-rounded" width="40" height="40" />
      Rather than just clipping the name itself, break at natural sentence or clause boundaries. This
      helps listeners understand the pronunciation in context.
    </p>
  </div>

  <YoutubePlayerEmbed
    bind:this={embedRef}
    {videoId}
    {width}
    {height}
    onPlayerReady={handlePlayerReady}
    onPlayStateChange={handlePlayStateChange}
    onTimeUpdate={handleTimeUpdate}
  />

  {#if playerReady}
    <div class="timestamp-controls">
      <!-- Radio buttons for selecting active timestamp -->
      <div class="timestamp-selector">
        <label class="radio-option">
          <input
            type="radio"
            bind:group={activeTimestamp}
            value="start"
            onchange={seekToActiveTimestamp}
          />
          <span>Start Time</span>
          <span class="timestamp-value">{formatTime(startTimestamp)}</span>
          <button
            type="button"
            class="link-button set-current"
            onclick={() => setToCurrentTime('start')}
          >
            set to current
          </button>
        </label>
        <label class="radio-option">
          <input
            type="radio"
            bind:group={activeTimestamp}
            value="end"
            onchange={seekToActiveTimestamp}
          />
          <span>End Time</span>
          <span class="timestamp-value">{formatTime(endTimestamp)}</span>
          <button
            type="button"
            class="link-button set-current"
            onclick={() => setToCurrentTime('end')}
          >
            set to current
          </button>
        </label>
      </div>

      <!-- Timeline -->
      <div class="timeline-container">
        <div
          bind:this={timelineRef}
          class="timeline"
          role="slider"
          tabindex="0"
          aria-label="Video timeline"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          onclick={handleTimelineClick}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTimelineClick(e as any);
            }
          }}
        >
          <div
            class="timeline-progress"
            style="width: {getTimelinePosition(currentTime, duration)}%"
          ></div>
          <div
            class="current-time-indicator"
            style="left: {getTimelinePosition(currentTime, duration)}%"
          ></div>
          <div
            class="timestamp-marker start {activeTimestamp === 'start' ? 'active' : ''}"
            style="left: {getTimelinePosition(startTimestamp, duration)}%"
            role="button"
            tabindex="0"
            aria-label="Start timestamp marker"
            onmousedown={(e) => handleMarkerMouseDown(e, 'start')}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activeTimestamp = 'start';
                seekToActiveTimestamp();
              }
            }}
          >
            <Icon icon="streamline-ultimate:arrow-down-2-bold" width="12" height="12" />
          </div>
          <div
            class="timestamp-marker end {activeTimestamp === 'end' ? 'active' : ''}"
            style="left: {getTimelinePosition(endTimestamp, duration)}%"
            role="button"
            tabindex="0"
            aria-label="End timestamp marker"
            onmousedown={(e) => handleMarkerMouseDown(e, 'end')}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activeTimestamp = 'end';
                seekToActiveTimestamp();
              }
            }}
          >
            <Icon icon="streamline-ultimate:arrow-down-2-bold" width="12" height="12" />
          </div>
        </div>
      </div>
      <div class="playback-controls">
        <div class="nudge-controls">
          <button
            type="button"
            class="btn-secondary btn-sm btn-icon"
            onclick={() => nudgeActiveTimestamp(-0.1)}
            aria-label="Go back 0.1 seconds"
          >
            <Icon icon="line-md:chevron-left" width="16" height="16" />
          </button>
          <button
            type="button"
            class="btn-secondary btn-sm btn-icon"
            onclick={() => nudgeActiveTimestamp(-1)}
            aria-label="Go back 1 second"
          >
            <Icon icon="line-md:chevron-double-left" width="16" height="16" />
          </button>
        </div>
        <button
          type="button"
          onclick={togglePlayback}
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
        <div class="nudge-controls">
          <button
            type="button"
            class="btn-secondary btn-sm btn-icon"
            onclick={() => nudgeActiveTimestamp(1)}
            aria-label="Go forward 1 second"
          >
            <Icon icon="line-md:chevron-double-right" width="16" height="16" />
          </button>
          <button
            type="button"
            class="btn-secondary btn-sm btn-icon"
            onclick={() => nudgeActiveTimestamp(0.1)}
            aria-label="Go forward 0.1 seconds"
          >
            <Icon icon="line-md:chevron-right" width="16" height="16" />
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .timestamp-picker {
    background: var(--color-bg-light, #f8f9fa);
    padding: 0.75rem;
    border-radius: 8px;
  }

  .guidelines {
    margin-bottom: 0.75rem;
  }

  .guidelines p {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-light);
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .timestamp-controls {
    margin-top: 0.75rem;
  }

  .timestamp-selector {
    display: flex;
    gap: 2rem;
    margin-bottom: 0.75rem;
    justify-content: center;
  }

  .radio-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
  }

  .radio-option input {
    margin: 0;
  }

  .timestamp-value {
    font-size: 0.8rem;
    color: var(--color-text-light);
    font-weight: 500;
  }

  .set-current {
    font-size: 0.8rem;
    margin-top: 0.25rem;
    color: var(--color-primary);
  }

  .timeline-container {
    margin: 0.75rem 0;
  }

  .timeline {
    position: relative;
    height: 6px;
    background: var(--color-borders);
    border-radius: 3px;
    cursor: pointer;
    margin: 1.5rem 0;
  }

  .timeline-progress {
    height: 100%;
    background: var(--color-primary);
    border-radius: 3px;
    transition: width 0.1s ease;
  }

  .current-time-indicator {
    position: absolute;
    top: -3px;
    width: 2px;
    height: 12px;
    background: var(--color-primary);
    transform: translateX(-50%);
    border-radius: 1px;
  }

  .timestamp-marker {
    position: absolute;
    top: -20px;
    transform: translateX(-50%);
    cursor: grab;
    transition: all 0.2s ease;
  }

  .timestamp-marker.active {
    color: #3b82f6;
    z-index: 2;
    transform: translateX(-50%) scale(1.5);
  }

  .timestamp-marker:not(.active) {
    color: var(--color-text-light);
    z-index: 1;
  }

  .timestamp-marker:hover {
    transform: translateX(-50%) scale(1.1);
  }

  .timestamp-marker.active:hover {
    transform: translateX(-50%) scale(1.6);
  }

  .timestamp-marker:active {
    cursor: grabbing;
  }

  .playback-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
  }

  .nudge-controls {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .nudge-controls button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem;
  }

  @media (max-width: 768px) {
    .timestamp-selector {
      gap: 1rem;
    }

    .playback-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
