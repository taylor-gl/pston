export function getTimelinePosition(time: number, duration: number): number {
  if (!duration) return 0;
  return Math.max(0, Math.min((time / duration) * 100, 100));
}

export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const milliseconds = Math.floor((seconds - totalSeconds) * 10);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds}`;
  }
}

export function calculateTimeFromPosition(
  position: number,
  duration: number,
  rect: DOMRect
): number {
  const percentage = Math.max(0, Math.min(position / rect.width, 1));
  return percentage * duration;
}

export interface TimestampAdjustment {
  startTimestamp: number;
  endTimestamp: number;
}

export function adjustTimestamps(
  currentStart: number,
  currentEnd: number,
  newTime: number,
  type: 'start' | 'end',
  duration: number
): TimestampAdjustment {
  if (type === 'start') {
    const newStart = Math.max(0, newTime);
    let newEnd = currentEnd;

    if (newStart >= currentEnd) {
      newEnd = Math.min(newStart + 0.1, duration);
    }

    return { startTimestamp: newStart, endTimestamp: newEnd };
  } else {
    const newEnd = Math.min(newTime, duration);
    let newStart = currentStart;

    if (newEnd <= currentStart) {
      newStart = Math.max(0, newEnd - 0.1);
    }

    return { startTimestamp: newStart, endTimestamp: newEnd };
  }
}

export function nudgeTimestamp(
  currentStart: number,
  currentEnd: number,
  amount: number,
  type: 'start' | 'end',
  duration: number
): TimestampAdjustment {
  if (type === 'start') {
    const newStart = Math.max(0, currentStart + amount);
    return adjustTimestamps(currentStart, currentEnd, newStart, 'start', duration);
  } else {
    const newEnd = Math.min(currentEnd + amount, duration);
    return adjustTimestamps(currentStart, currentEnd, newEnd, 'end', duration);
  }
}

export function shouldStopPlayback(
  currentTime: number,
  endTimestamp: number,
  isPlaying: boolean
): boolean {
  return isPlaying && currentTime >= endTimestamp;
}
