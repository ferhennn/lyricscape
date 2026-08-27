import type { PlaybackSnapshot, Song } from "@/types";

export type PlaybackListener = (snapshot: PlaybackSnapshot) => void;

/** Uniform playback surface used by the experience regardless of source. */
export interface AudioProvider {
  readonly kind: Song["provider"];
  load(song: Song): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setVolume(v: number): void;
  setMuted(muted: boolean): void;
  /** High-frequency position read for the render loop (seconds). */
  getTime(): number;
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: PlaybackListener): () => void;
  destroy(): void;
}

export const idleSnapshot: PlaybackSnapshot = {
  status: "idle",
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  playbackRate: 1,
};
