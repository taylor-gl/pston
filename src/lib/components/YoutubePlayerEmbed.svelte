<script lang="ts">
  import { onMount } from 'svelte';
  import {
    loadYouTubeAPI,
    createPlayerConfig,
    createYouTubePlayer,
    isPlaying as isPlayerStatePlaying,
  } from '$lib/utils/youtube-api';
  import { createTimeMonitor } from '$lib/utils/playback-utils';

  let {
    videoId,
    width = 360,
    height = 200,
    onPlayerReady = () => {},
    onTimeUpdate = (time: number) => {},
    onPlayStateChange = (isPlaying: boolean) => {},
  }: {
    videoId: string;
    width?: number;
    height?: number;
    onPlayerReady?: () => void;
    onTimeUpdate?: (time: number) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
  } = $props();

  let player: any;
  let playerContainer = $state<HTMLDivElement>();
  let playerReady = $state(false);
  let isPlaying = $state(false);
  let videoLoaded = $state(false);
  let timeMonitor = createTimeMonitor();
  let playerId: string;
  let currentTime = $state(0);
  let duration = $state(0);

  onMount(() => {
    playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;

    if (typeof window !== 'undefined') {
      loadYouTubeAPI().then(() => {
        initializePlayer();
      });
    }

    return () => {
      timeMonitor.stop();
      if (player && player.destroy) {
        player.destroy();
      }
    };
  });

  function initializePlayer() {
    if (!playerContainer) return;

    const config = createPlayerConfig(
      videoId,
      width,
      height,
      handlePlayerReady,
      handlePlayerStateChange,
      handlePlaybackQualityChange
    );

    player = createYouTubePlayer(playerContainer, config);
  }

  function handlePlayerReady() {
    playerReady = true;
    videoLoaded = true;
    duration = player.getDuration();
    onPlayerReady();
  }

  function handlePlayerStateChange(event: any) {
    if (!videoLoaded) return;

    const newIsPlaying = isPlayerStatePlaying(event.data);

    if (newIsPlaying !== isPlaying) {
      isPlaying = newIsPlaying;
      onPlayStateChange(isPlaying);

      if (isPlaying) {
        startTimeMonitoring();
      } else {
        stopTimeMonitoring();
      }
    }
  }

  function handlePlaybackQualityChange() {
    player.pauseVideo();
  }

  function startTimeMonitoring() {
    timeMonitor.start(() => {
      if (player && playerReady) {
        const time = player.getCurrentTime();
        currentTime = time;
        onTimeUpdate(time);
      }
    }, 50);
  }

  function stopTimeMonitoring() {
    timeMonitor.stop();
  }

  export function play() {
    if (player && playerReady) {
      player.playVideo();
    }
  }

  export function pause() {
    if (player && playerReady) {
      player.pauseVideo();
    }
  }

  export function seekTo(seconds: number, allowSeekAhead = true) {
    if (player && playerReady) {
      player.seekTo(seconds, allowSeekAhead);
    }
  }

  export function getCurrentTime(): number {
    if (player && playerReady) {
      return player.getCurrentTime();
    }
    return 0;
  }

  export function getDuration(): number {
    return duration;
  }

  export function getPlayerReady(): boolean {
    return playerReady;
  }

  export function getIsPlaying(): boolean {
    return isPlaying;
  }
</script>

<svelte:head>
  <script>
    window.onYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady || function () {};
  </script>
</svelte:head>

<div class="youtube-embed">
  <div bind:this={playerContainer} class="player-container"></div>
</div>

<style>
  .youtube-embed {
    display: flex;
    justify-content: center;
  }

  .player-container {
    display: flex;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .player-container :global(iframe) {
      width: 100% !important;
      max-width: 360px;
      height: auto !important;
      aspect-ratio: 16/9;
    }
  }
</style>
