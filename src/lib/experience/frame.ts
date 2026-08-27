// Per-frame derivation shared by the DOM lyric view and the WebGL scene.
// Reads the live provider clock, never React state, so it is render-free.

import type { TimelineState } from "@/types";
import type { LyricFrame, LyricsEngine } from "@/lib/lyrics/engine";
import type { Timeline } from "@/lib/visuals/timeline";

export interface ExperienceFrame {
  time: number;
  timeline: TimelineState;
  lyric: LyricFrame;
}

interface FrameDeps {
  engine: LyricsEngine | null;
  timeline: Timeline | null;
  getTime: () => number;
  isPlaying: () => boolean;
}

export function createFrameSampler(deps: FrameDeps) {
  let lastLyricIndex = -1;
  let pulse = 0;
  let lastT = performance.now();

  return function sample(): ExperienceFrame {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    const time = deps.getTime();
    const playing = deps.isPlaying();

    const lyric: LyricFrame =
      deps.engine?.update(time) ??
      ({
        index: -1,
        current: null,
        previous: null,
        next: null,
        progress: 0,
        timeToNext: Infinity,
        justChanged: false,
      } as LyricFrame);

    if (lyric.index !== lastLyricIndex) {
      if (lastLyricIndex !== -1) pulse = 1;
      lastLyricIndex = lyric.index;
    }
    pulse = Math.max(0, pulse - dt * 2.2);

    const timeline: TimelineState = deps.timeline
      ? deps.timeline.build(time, lyric.index, lyric.progress, pulse, playing)
      : {
          progress: 0,
          currentTime: time,
          duration: 0,
          lyricIndex: lyric.index,
          lyricProgress: lyric.progress,
          section: "unknown",
          scene: "void",
          intensity: 0.4,
          transitionPulse: pulse,
          isPlaying: playing,
        };

    return { time, timeline, lyric };
  };
}
