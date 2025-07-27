declare global {
  interface Window {
    YT: {
      Player: new (element: string | HTMLElement, config: any) => any;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
    youTubeAPILoading?: boolean;
    youTubeAPILoaded?: boolean;
    youTubeAPICallbacks?: (() => void)[];
  }
}

export interface PlayerConfig {
  height: string;
  width: string;
  videoId: string;
  playerVars: {
    controls: number;
    disablekb: number;
    fs: number;
    iv_load_policy: number;
    playsinline: number;
    rel: number;
    color: string;
    modestbranding: number;
    autohide: number;
    autoplay: number;
    origin?: string;
  };
  events: {
    onReady: () => void;
    onStateChange: (event: any) => void;
    onPlaybackQualityChange: () => void;
  };
}

export function isYouTubeAPIReady(): boolean {
  return typeof window !== 'undefined' && !!window.YT && !!window.YT.Player;
}

export function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    if (isYouTubeAPIReady()) {
      resolve();
      return;
    }

    if (!window.youTubeAPILoading) {
      window.youTubeAPILoading = true;
      window.youTubeAPICallbacks = window.youTubeAPICallbacks || [];

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = function () {
        window.youTubeAPILoaded = true;
        window.youTubeAPICallbacks?.forEach((callback) => callback());
        window.youTubeAPICallbacks = [];
      };
    }

    if (window.youTubeAPILoaded) {
      resolve();
    } else {
      window.youTubeAPICallbacks = window.youTubeAPICallbacks || [];
      window.youTubeAPICallbacks.push(() => resolve());
    }
  });
}

export function createPlayerConfig(
  videoId: string,
  width: number,
  height: number,
  onReady: () => void,
  onStateChange: (event: any) => void,
  onPlaybackQualityChange: () => void
): PlayerConfig {
  return {
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
      origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    },
    events: {
      onReady,
      onStateChange,
      onPlaybackQualityChange,
    },
  };
}

export function createYouTubePlayer(container: HTMLElement, config: PlayerConfig): any {
  if (!isYouTubeAPIReady()) {
    throw new Error('YouTube API is not ready');
  }
  return new window.YT.Player(container, config);
}

export function isPlaying(playerState: number): boolean {
  return typeof window !== 'undefined' && playerState === window.YT.PlayerState.PLAYING;
}
