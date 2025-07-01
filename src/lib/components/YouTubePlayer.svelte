<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';

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

  let player: any;
  let playerContainer = $state<HTMLDivElement>();
  let playerReady = $state(false);
  let isPlaying = $state(false);
  let videoLoaded = $state(false);
  let timeMonitorInterval: ReturnType<typeof setInterval> | null = null;
  let playerId: string;

  onMount(() => {
    playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;

    if (typeof window !== 'undefined') {
      loadYouTubeAPI();
    }

    return () => {
      if (timeMonitorInterval) {
        clearInterval(timeMonitorInterval);
      }
      if (player && player.destroy) {
        player.destroy();
      }
    };
  });

  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }

    if (!(window as any).youTubeAPILoading) {
      (window as any).youTubeAPILoading = true;
      (window as any).youTubeAPICallbacks = (window as any).youTubeAPICallbacks || [];

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = function () {
        (window as any).youTubeAPILoaded = true;
        (window as any).youTubeAPICallbacks.forEach((callback: () => void) => callback());
        (window as any).youTubeAPICallbacks = [];
      };
    }

    if ((window as any).youTubeAPILoaded) {
      initializePlayer();
    } else {
      (window as any).youTubeAPICallbacks = (window as any).youTubeAPICallbacks || [];
      (window as any).youTubeAPICallbacks.push(initializePlayer);
    }
  }

  function initializePlayer() {
    if (!playerContainer) return;

    player = new window.YT.Player(playerContainer, {
      height: height.toString(),
      width: width.toString(),
      videoId: videoId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        playsinline: 1,
        rel: 0,
        color: 'white',
        modestbranding: 1,
        autohide: 1,
        autoplay: 0,
        start: Math.floor(startTimestamp),
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onPlaybackQualityChange: onPlaybackQualityChange,
      },
    });
  }

  function onPlayerReady() {
    playerReady = true;
    videoLoaded = true;
  }

  function onPlayerStateChange(event: any) {
    if (!videoLoaded) return;

    const newIsPlaying = event.data === window.YT.PlayerState.PLAYING;

    if (newIsPlaying !== isPlaying) {
      isPlaying = newIsPlaying;

      if (isPlaying) {
        startTimeMonitoring();
      } else {
        stopTimeMonitoring();
      }
    }
  }

  function onPlaybackQualityChange() {
    player.pauseVideo();
  }

  function startTimeMonitoring() {
    if (timeMonitorInterval) {
      clearInterval(timeMonitorInterval);
    }

    if (stopTimestamp !== null) {
      timeMonitorInterval = setInterval(() => {
        if (player && playerReady) {
          const currentTime = player.getCurrentTime();
          if (currentTime >= stopTimestamp) {
            player.pauseVideo();
            stopTimeMonitoring();
          }
        }
      }, 50);
    }
  }

  function stopTimeMonitoring() {
    if (timeMonitorInterval) {
      clearInterval(timeMonitorInterval);
      timeMonitorInterval = null;
    }
  }

  function togglePlayback() {
    if (!playerReady || !player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      // Seek to start position first
      player.seekTo(startTimestamp, true);
      // Then explicitly start playing since seekTo doesn't unpause from PAUSED state
      player.playVideo();
    }
  }
</script>

<svelte:head>
  <script>
    window.onYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady || function () {};
  </script>
</svelte:head>

<div class="youtube-player">
  <div bind:this={playerContainer} class="player-container"></div>

  <div class="controls">
    <button
      onclick={togglePlayback}
      disabled={!playerReady || !videoLoaded}
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
      <span>Start: {startTimestamp}s</span>
      {#if stopTimestamp !== null}
        <span>Stop: {stopTimestamp}s</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .youtube-player {
    margin: 0.5rem 0;
    background: var(--color-bg-light);
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    padding: 1rem;
  }

  .player-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }

  .timestamp-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--color-borders);
  }

  @media (max-width: 768px) {
    .youtube-player {
      margin: 1rem 0;
    }

    .player-container :global(iframe) {
      width: 100% !important;
      max-width: 360px;
      height: auto !important;
      aspect-ratio: 16/9;
    }

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
