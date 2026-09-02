// Core domain models for LYRICSCAPE.
// Strict types shared across the music, lyrics, and visual layers.

export interface Artist {
  id: string;
  name: string;
  url?: string;
}

export interface Album {
  id: string;
  name: string;
  artistName: string;
  artworkUrl?: string;
  releaseDate?: string;
}

export interface Song {
  id: string;
  title: string;
  artistName: string;
  albumName: string;
  durationMs: number;
  artworkUrl?: string;
  /** Where playback/audio comes from. */
  provider: AudioProviderKind;
  /** ISRC when known — used to look lyrics up. */
  isrc?: string;
  previewUrl?: string;
  /** Present only for bundled demo content. */
  demoId?: string;
}

export type AudioProviderKind = "apple-music" | "jamendo" | "local";

export interface SearchResult {
  songs: Song[];
  query: string;
  source: "apple-music" | "demo";
}

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

export interface LyricWord {
  text: string;
  /** Seconds from song start. */
  start: number;
  /** Seconds from song start. Estimated when the source is line-level only. */
  end: number;
  /** True when timing was interpolated rather than provided by the source. */
  estimated: boolean;
}

export interface LyricLine {
  id: string;
  /** Seconds from song start. */
  timestamp: number;
  /** Seconds from song start — start of the following line or song end. */
  endTimestamp: number;
  text: string;
  words: LyricWord[];
  /** Section this line belongs to, if annotated. */
  section?: SongSectionType;
  /** 0..1 — visual weight hint for demo-authored lyrics. */
  emphasis?: number;
  /** Optional per-line animation preset override. */
  preset?: LyricPresetName;
  /** True for instrumental / spacer lines with no words. */
  instrumental?: boolean;
}

export interface Lyrics {
  lines: LyricLine[];
  synced: boolean;
  wordLevel: boolean;
  source: "lrclib" | "demo" | "local" | "none";
  language?: string;
  /** Plain, unsynced text fallback. */
  plainText?: string;
}

export type LyricPresetName =
  | "fade"
  | "slide"
  | "scale"
  | "blur"
  | "whisper"
  | "scream"
  | "echo"
  | "explode"
  | "float"
  | "typewriter"
  | "glitch"
  | "cinematic";

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "seeking"
  | "ended"
  | "error";

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  /** Seconds. */
  currentTime: number;
  /** Seconds. */
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Visual / timeline
// ---------------------------------------------------------------------------

export type SongSectionType =
  | "intro"
  | "verse"
  | "pre_chorus"
  | "chorus"
  | "bridge"
  | "outro"
  | "unknown";

export type VisualSceneType =
  | "room"
  | "hallway"
  | "void"
  | "ocean"
  | "stars"
  | "smoke";

export type VisualMode = "cinematic" | "minimal" | "3d" | "lyric-only" | "kinetic";

export interface SongSection {
  type: SongSectionType;
  /** Seconds. */
  start: number;
  /** Seconds. */
  end: number;
  scene: VisualSceneType;
  /** 0..1 emotional / sonic intensity for this section. */
  intensity: number;
  label?: string;
}

export interface AccentPalette {
  /** Primary accent, hex. */
  accent: string;
  /** Secondary accent, hex. */
  secondary: string;
  /** Deep tone for glows / fog, hex. */
  deep: string;
  /** Light tone for highlights, hex. */
  light: string;
}

export interface SceneMeta {
  sections: SongSection[];
  palette?: AccentPalette;
  defaultScene: VisualSceneType;
}

/** Normalized state every visual subsystem consumes each frame. */
export interface TimelineState {
  /** 0..1 across the whole song. */
  progress: number;
  currentTime: number;
  duration: number;
  lyricIndex: number;
  /** 0..1 within the active lyric line. */
  lyricProgress: number;
  section: SongSectionType;
  scene: VisualSceneType;
  /** 0..1 — drives particles, camera, light, type scale. */
  intensity: number;
  /** 0..1 — spikes briefly on each lyric change. */
  transitionPulse: number;
  isPlaying: boolean;
}

export interface DemoSongConfig {
  song: Song;
  sceneMeta: SceneMeta;
  /** Path to an .lrc file in /public, or inline lyrics. */
  lrc: string;
  /** Synthetic audio recipe id. */
  audioRecipe: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type QualityLevel = "auto" | "high" | "medium" | "low";
export type MotionLevel = "full" | "reduced";
export type ThemeMode = "dynamic" | "monochrome";
export type AccentMode = "auto" | "custom";

export interface Settings {
  quality: QualityLevel;
  motion: MotionLevel;
  volume: number;
  autoplay: boolean;
  showControls: boolean;
  showLyrics: boolean;
  theme: ThemeMode;
  accentMode: AccentMode;
  customAccent: string;
  visualMode: VisualMode;
  /** Sync scenes: how hard the visuals react to audio. 0.5–2, default 1. */
  syncSensitivity: number;
}
