// LyricsEngine — resolves the active lyric line for a given playback time.
// Threshold- and interpolation-based rather than exact timestamp matching, so it
// survives seeking, pausing, buffering and skipped sections.

import type { LyricLine, Lyrics } from "@/types";

export interface LyricFrame {
  index: number;
  current: LyricLine | null;
  previous: LyricLine | null;
  next: LyricLine | null;
  /** 0..1 progress within the current line. */
  progress: number;
  /** Seconds until the next line starts (Infinity if none). */
  timeToNext: number;
  /** True in the brief window right after a line change. */
  justChanged: boolean;
}

const EMPTY: LyricFrame = {
  index: -1,
  current: null,
  previous: null,
  next: null,
  progress: 0,
  timeToNext: Infinity,
  justChanged: false,
};

export class LyricsEngine {
  private lines: LyricLine[];
  private lastIndex = -1;
  private lastChangeAt = -Infinity;

  constructor(lyrics: Lyrics | null) {
    this.lines = lyrics?.synced ? lyrics.lines : [];
  }

  get hasSyncedLyrics(): boolean {
    return this.lines.length > 0;
  }

  /** Binary search for the last line whose timestamp <= time. */
  private indexAt(time: number): number {
    const lines = this.lines;
    if (lines.length === 0) return -1;
    if (time < lines[0].timestamp - 0.15) return -1;
    let lo = 0;
    let hi = lines.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].timestamp - 0.12 <= time) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  update(time: number): LyricFrame {
    if (this.lines.length === 0) return EMPTY;

    const index = this.indexAt(time);
    if (index !== this.lastIndex) {
      this.lastChangeAt = time;
      this.lastIndex = index;
    }

    const current = index >= 0 ? this.lines[index] : null;
    const previous = index > 0 ? this.lines[index - 1] : null;
    const next = index + 1 < this.lines.length ? this.lines[index + 1] : null;

    let progress = 0;
    let timeToNext = Infinity;
    if (current) {
      const end = next ? next.timestamp : current.endTimestamp;
      const span = Math.max(0.001, end - current.timestamp);
      progress = clamp01((time - current.timestamp) / span);
      timeToNext = next ? next.timestamp - time : Infinity;
    } else if (next) {
      timeToNext = next.timestamp - time;
    }

    return {
      index,
      current,
      previous,
      next,
      progress,
      timeToNext,
      justChanged: time - this.lastChangeAt < 0.45 && Math.abs(time - this.lastChangeAt) < 5,
    };
  }

  /** Active word index within a line for the given time. -1 before the first word. */
  static activeWordIndex(line: LyricLine, time: number): number {
    const words = line.words;
    if (words.length === 0) return -1;
    let ans = -1;
    for (let i = 0; i < words.length; i++) {
      if (time >= words[i].start - 0.05) ans = i;
      else break;
    }
    return ans;
  }
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
