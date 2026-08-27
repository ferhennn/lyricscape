// Unified timeline. Turns a raw playback time into the normalized TimelineState
// that every visual subsystem consumes. Pure — no React, no audio APIs.

import type { LyricLine, SceneMeta, SongSection, TimelineState } from "@/types";

const DEFAULT_SECTION: SongSection = {
  type: "unknown",
  start: 0,
  end: Infinity,
  scene: "void",
  intensity: 0.4,
};

export class Timeline {
  private sections: SongSection[];

  constructor(
    private sceneMeta: SceneMeta,
    private lyrics: LyricLine[],
    private duration: number,
  ) {
    this.sections = [...sceneMeta.sections].sort((a, b) => a.start - b.start);
  }

  sectionAt(t: number): SongSection {
    if (this.sections.length === 0) return DEFAULT_SECTION;
    for (let i = 0; i < this.sections.length; i++) {
      const s = this.sections[i];
      if (t >= s.start && t < s.end) return s;
    }
    return this.sections[this.sections.length - 1];
  }

  private sectionProgress(section: SongSection, t: number): number {
    const span = Math.max(0.001, section.end - section.start);
    return clamp01((t - section.start) / span);
  }

  /** Compute the full state. `lyricIndex` / `lyricProgress` come from LyricsEngine. */
  build(
    t: number,
    lyricIndex: number,
    lyricProgress: number,
    transitionPulse: number,
    isPlaying: boolean,
  ): TimelineState {
    const duration = this.duration || 1;
    const section = this.sectionAt(t);
    const sp = this.sectionProgress(section, t);

    // Intensity: section base, eased in/out at its edges, lifted by lyric activity.
    const edge = Math.sin(Math.PI * sp); // 0 at edges, 1 mid-section
    const next = this.sections[this.sections.indexOf(section) + 1];
    const blended =
      next && sp > 0.8
        ? lerp(section.intensity, next.intensity, (sp - 0.8) / 0.2)
        : section.intensity;
    const lyricLift =
      lyricIndex >= 0 && lyricIndex < this.lyrics.length && !this.lyrics[lyricIndex].instrumental
        ? 0.12 * Math.sin(Math.PI * lyricProgress)
        : 0;
    const intensity = clamp01(blended * (0.85 + 0.15 * edge) + lyricLift + transitionPulse * 0.15);

    return {
      progress: clamp01(t / duration),
      currentTime: t,
      duration,
      lyricIndex,
      lyricProgress,
      section: section.type,
      scene: section.scene,
      intensity,
      transitionPulse,
      isPlaying,
    };
  }

  get sectionList(): SongSection[] {
    return this.sections;
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Exponential smoothing helper for per-frame value tracking. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
