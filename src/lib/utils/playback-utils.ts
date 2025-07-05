export interface TimeMonitor {
  start: (callback: () => void, intervalMs?: number) => void;
  stop: () => void;
}

export function createTimeMonitor(): TimeMonitor {
  let interval: ReturnType<typeof setInterval> | null = null;

  return {
    start(callback: () => void, intervalMs = 50) {
      if (interval) {
        clearInterval(interval);
      }
      interval = setInterval(callback, intervalMs);
    },
    stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  };
}
