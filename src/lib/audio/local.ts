// LocalAudioProvider — plays a user-supplied file, a bundled royalty-free track,
// or a remote stream URL (e.g. Jamendo) through an <audio> element. Used for
// development, offline use, low-power devices, and the Jamendo source.

import type { AudioProviderKind, PlaybackSnapshot, Song } from "@/types";
import { idleSnapshot, type AudioProvider, type PlaybackListener } from "./types";

export class LocalAudioProvider implements AudioProvider {
  readonly kind: AudioProviderKind;
  private el: HTMLAudioElement;
  private listeners = new Set<PlaybackListener>();
  private snap: PlaybackSnapshot = { ...idleSnapshot };
  private objectUrl: string | null = null;

  constructor(
    private srcResolver?: (song: Song) => string | File | undefined,
    kind: AudioProviderKind = "local",
  ) {
    this.kind = kind;
    this.el = typeof Audio !== "undefined" ? new Audio() : ({} as HTMLAudioElement);
    this.el.preload = "auto";
    // No crossOrigin: we never read the element into Web Audio, and setting it
    // breaks playback for hosts that don't send CORS headers.
    this.bind();
  }

  private bind() {
    if (!this.el.addEventListener) return;
    const sync = (status?: PlaybackSnapshot["status"]) => {
      this.snap = {
        ...this.snap,
        status: status ?? this.snap.status,
        currentTime: this.el.currentTime || 0,
        duration: Number.isFinite(this.el.duration) ? this.el.duration : this.snap.duration,
        volume: this.el.volume,
        muted: this.el.muted,
        playbackRate: this.el.playbackRate,
      };
      this.emit();
    };
    this.el.addEventListener("loadedmetadata", () => sync("ready"));
    this.el.addEventListener("canplay", () => sync());
    this.el.addEventListener("play", () => sync("playing"));
    this.el.addEventListener("playing", () => sync("playing"));
    this.el.addEventListener("pause", () => {
      if (!this.el.ended) sync("paused");
    });
    this.el.addEventListener("seeking", () => sync("seeking"));
    this.el.addEventListener("seeked", () => sync(this.el.paused ? "paused" : "playing"));
    this.el.addEventListener("timeupdate", () => sync());
    this.el.addEventListener("ended", () => sync("ended"));
    this.el.addEventListener("error", () => {
      this.snap = { ...this.snap, status: "error", error: "Audio failed to load." };
      this.emit();
    });
  }

  async load(song: Song): Promise<void> {
    const resolved = this.srcResolver?.(song) ?? song.previewUrl;
    if (!resolved) {
      this.snap = { ...this.snap, status: "error", error: "No local audio source." };
      this.emit();
      return;
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    if (resolved instanceof File) {
      this.objectUrl = URL.createObjectURL(resolved);
      this.el.src = this.objectUrl;
    } else {
      this.objectUrl = null;
      this.el.src = resolved;
    }
    this.snap = { ...this.snap, status: "loading", currentTime: 0 };
    this.emit();
    this.el.load();
  }

  async play(): Promise<void> {
    try {
      await this.el.play();
    } catch {
      this.snap = { ...this.snap, status: "paused" };
      this.emit();
    }
  }

  pause(): void {
    this.el.pause();
  }

  seek(seconds: number): void {
    this.el.currentTime = Math.max(0, Math.min(seconds, this.el.duration || seconds));
  }

  setVolume(v: number): void {
    this.el.volume = Math.max(0, Math.min(1, v));
  }

  setMuted(muted: boolean): void {
    this.el.muted = muted;
  }

  getTime(): number {
    return this.el.currentTime || 0;
  }

  getSnapshot(): PlaybackSnapshot {
    return { ...this.snap, currentTime: this.getTime() };
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.el.pause?.();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.el.src = "";
    this.listeners.clear();
  }

  private emit() {
    const s = this.getSnapshot();
    for (const l of this.listeners) l(s);
  }
}
