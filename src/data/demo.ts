// Built-in demo experience. Original song, original lyrics, hand-authored scene
// metadata — nothing here is copyrighted third-party material.

import type { AccentPalette, DemoSongConfig, LyricPresetName, SongSection } from "@/types";

export const DEMO_SONG_ID = "afterlight";

const palette: AccentPalette = {
  accent: "#E8B98F",
  secondary: "#B9663F",
  deep: "#2A1C2E",
  light: "#F3E6D6",
};

const sections: SongSection[] = [
  { type: "intro", start: 0, end: 28, scene: "stars", intensity: 0.18, label: "INTRO" },
  { type: "verse", start: 28, end: 52, scene: "room", intensity: 0.4, label: "VERSE" },
  { type: "pre_chorus", start: 52, end: 64, scene: "hallway", intensity: 0.58, label: "PRE" },
  { type: "chorus", start: 64, end: 100, scene: "ocean", intensity: 0.86, label: "CHORUS" },
  { type: "bridge", start: 100, end: 128, scene: "smoke", intensity: 0.3, label: "BRIDGE" },
  { type: "chorus", start: 128, end: 156, scene: "void", intensity: 0.94, label: "CHORUS" },
  { type: "outro", start: 156, end: 168, scene: "stars", intensity: 0.14, label: "OUTRO" },
];

/** Per-line annotations, index-aligned with the parsed .lrc lines. */
export const DEMO_LINE_ANNOTATIONS: Array<
  { emphasis?: number; preset?: LyricPresetName } | undefined
> = [
  undefined, // ♪
  { preset: "cinematic" },
  { preset: "slide" },
  { preset: "fade" },
  { preset: "blur" },
  { preset: "float" },
  { preset: "whisper" },
  { preset: "slide", emphasis: 0.4 },
  { preset: "echo", emphasis: 0.5 },
  { preset: "scale", emphasis: 0.7 },
  { preset: "scream", emphasis: 1 },
  { preset: "explode", emphasis: 0.9 },
  { preset: "fade", emphasis: 0.5 },
  { preset: "scale", emphasis: 0.8 },
  { preset: "float", emphasis: 0.6 },
  { preset: "explode", emphasis: 0.9 },
  { preset: "cinematic", emphasis: 0.7 },
  undefined, // ♪
  { preset: "whisper" },
  { preset: "whisper" },
  { preset: "float", emphasis: 0.4 },
  { preset: "blur" },
  { preset: "scale", emphasis: 0.8 },
  { preset: "scream", emphasis: 1 },
  { preset: "explode", emphasis: 0.9 },
  { preset: "fade", emphasis: 0.5 },
  { preset: "scale", emphasis: 0.9 },
  { preset: "float", emphasis: 0.7 },
  { preset: "explode", emphasis: 1 },
  { preset: "echo", emphasis: 0.8 },
  { preset: "whisper", emphasis: 0.5 },
  undefined, // ♪
];

export const DEMO_CONFIG: DemoSongConfig = {
  song: {
    id: DEMO_SONG_ID,
    title: "Afterlight",
    artistName: "LYRICSCAPE",
    albumName: "Signals in the Dark",
    durationMs: 168_000,
    artworkUrl: "/demo/afterlight.svg",
    provider: "synthetic",
    demoId: "afterlight",
  },
  sceneMeta: {
    sections,
    palette,
    defaultScene: "stars",
  },
  lrc: "/demo/afterlight.lrc",
  audioRecipe: "afterlight",
};

export function sectionAtTime(t: number): SongSection {
  return (
    DEMO_CONFIG.sceneMeta.sections.find((s) => t >= s.start && t < s.end) ??
    DEMO_CONFIG.sceneMeta.sections[DEMO_CONFIG.sceneMeta.sections.length - 1]
  );
}
