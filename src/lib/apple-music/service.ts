// AppleMusicService — the single place MusicKit is loaded, configured and driven.
// The rest of the app never touches `window.MusicKit` directly.

import type { PlaybackSnapshot, Song } from "@/types";
import { idleSnapshot, type AudioProvider, type PlaybackListener } from "@/lib/audio/types";

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

export interface AppleMusicStatus {
  configured: boolean;
  authorized: boolean;
  storefront: string;
  error?: string;
}

let scriptPromise: Promise<MusicKitStatic> | null = null;

function loadScript(): Promise<MusicKitStatic> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<MusicKitStatic>((resolve, reject) => {
    const done = () => {
      if (window.MusicKit) resolve(window.MusicKit);
      else reject(new Error("MusicKit script loaded but global missing"));
    };
    document.addEventListener("musickitloaded", done, { once: true });
    const el = document.createElement("script");
    el.src = MUSICKIT_SRC;
    el.async = true;
    el.crossOrigin = "anonymous";
    el.onerror = () => reject(new Error("Failed to load MusicKit script"));
    document.head.appendChild(el);
    // Fallback: some builds resolve the global before the event.
    setTimeout(() => {
      if (window.MusicKit) resolve(window.MusicKit);
    }, 4000);
  });
  return scriptPromise;
}

function mapSong(r: MusicKitResource): Song {
  const a = r.attributes ?? {};
  const art = a.artwork?.url
    ? a.artwork.url.replace("{w}", "600").replace("{h}", "600")
    : undefined;
  return {
    id: r.id,
    title: a.name ?? "Unknown",
    artistName: a.artistName ?? "Unknown artist",
    albumName: a.albumName ?? "",
    durationMs: a.durationInMillis ?? 0,
    artworkUrl: art,
    provider: "apple-music",
    isrc: a.isrc,
    previewUrl: a.previews?.[0]?.url,
  };
}

export class AppleMusicService {
  private mk: MusicKitStatic | null = null;
  private instance: MusicKitInstance | null = null;
  private status: AppleMusicStatus = {
    configured: false,
    authorized: false,
    storefront: "us",
  };
  private statusListeners = new Set<(s: AppleMusicStatus) => void>();

  getStatus(): AppleMusicStatus {
    return { ...this.status };
  }

  onStatus(cb: (s: AppleMusicStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(patch: Partial<AppleMusicStatus>) {
    this.status = { ...this.status, ...patch };
    for (const l of this.statusListeners) l(this.getStatus());
  }

  /** Fetch a short-lived developer token from our server route. */
  private async fetchDeveloperToken(): Promise<string> {
    const res = await fetch("/api/apple-developer-token", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Developer token unavailable");
    }
    const body = (await res.json()) as { token: string };
    return body.token;
  }

  async initialize(): Promise<MusicKitInstance> {
    if (this.instance) return this.instance;
    const mk = await loadScript();
    this.mk = mk;
    const developerToken = await this.fetchDeveloperToken();
    const instance = await mk.configure({
      developerToken,
      app: { name: "LYRICSCAPE", build: "1.0.0" },
    });
    this.instance = instance;
    this.setStatus({
      configured: true,
      authorized: instance.isAuthorized,
      storefront: instance.storefrontId ?? "us",
    });
    return instance;
  }

  async authorize(): Promise<boolean> {
    const instance = await this.initialize();
    try {
      await instance.authorize();
      this.setStatus({
        authorized: instance.isAuthorized,
        storefront: instance.storefrontId ?? this.status.storefront,
      });
      return instance.isAuthorized;
    } catch (err) {
      this.setStatus({ error: (err as Error).message });
      return false;
    }
  }

  async unauthorize(): Promise<void> {
    if (!this.instance) return;
    await this.instance.unauthorize();
    this.setStatus({ authorized: false });
  }

  async search(term: string, limit = 18): Promise<Song[]> {
    const instance = await this.initialize();
    const storefront = this.status.storefront || "us";
    const res = await instance.api.music(`/v1/catalog/${storefront}/search`, {
      term,
      types: "songs",
      limit,
    });
    const songs = res.data.results?.songs?.data ?? res.data.data ?? [];
    return songs.map(mapSong);
  }

  async getSong(id: string): Promise<Song | null> {
    const instance = await this.initialize();
    const storefront = this.status.storefront || "us";
    const res = await instance.api.music(`/v1/catalog/${storefront}/songs/${id}`);
    const first = res.data.data?.[0];
    return first ? mapSong(first) : null;
  }

  createAudioProvider(): AppleMusicAudioProvider {
    return new AppleMusicAudioProvider(() => this.initialize());
  }
}

// ---------------------------------------------------------------------------
// Playback provider backed by the MusicKit instance.
// ---------------------------------------------------------------------------

export class AppleMusicAudioProvider implements AudioProvider {
  readonly kind = "apple-music" as const;
  private instance: MusicKitInstance | null = null;
  private listeners = new Set<PlaybackListener>();
  private snap: PlaybackSnapshot = { ...idleSnapshot };
  private raf: number | null = null;

  constructor(private getInstance: () => Promise<MusicKitInstance>) {}

  private handlers: Record<string, (e: unknown) => void> = {};

  private bind(instance: MusicKitInstance) {
    const stateName = (n: number): PlaybackSnapshot["status"] => {
      const label = window.MusicKit?.PlaybackStates?.[n];
      switch (label) {
        case "playing":
          return "playing";
        case "paused":
        case "stopped":
          return "paused";
        case "ended":
        case "completed":
          return "ended";
        case "seeking":
          return "seeking";
        case "loading":
        case "waiting":
        case "stalled":
          return "loading";
        default:
          return this.snap.status;
      }
    };
    this.handlers.playbackStateDidChange = (e) => {
      const state = (e as { state?: number }).state ?? instance.playbackState;
      this.update(stateName(state));
    };
    this.handlers.playbackTimeDidChange = () => this.update();
    this.handlers.nowPlayingItemDidChange = () => this.update("ready");
    this.handlers.mediaPlaybackError = () => {
      this.snap = { ...this.snap, status: "error", error: "Apple Music playback error." };
      this.emit();
    };
    for (const [name, cb] of Object.entries(this.handlers)) {
      instance.addEventListener(name, cb);
    }
  }

  async load(song: Song): Promise<void> {
    this.snap = { ...this.snap, status: "loading", currentTime: 0 };
    this.emit();
    const instance = await this.getInstance();
    this.instance = instance;
    if (!Object.keys(this.handlers).length) this.bind(instance);
    if (!instance.isAuthorized) {
      // Preview-only playback is still possible; surface it but continue.
      this.snap = { ...this.snap, error: "Not signed in — preview playback only." };
    }
    await instance.setQueue({ song: song.id, startPlaying: false });
    this.snap = {
      ...this.snap,
      status: "ready",
      duration: instance.currentPlaybackDuration || song.durationMs / 1000,
    };
    this.emit();
    this.pump();
  }

  private pump = () => {
    this.update();
    this.raf = requestAnimationFrame(this.pump);
  };

  async play(): Promise<void> {
    const instance = this.instance ?? (await this.getInstance());
    await instance.play();
    this.update("playing");
  }

  pause(): void {
    this.instance?.pause();
    this.update("paused");
  }

  seek(seconds: number): void {
    void this.instance?.seekToTime(Math.max(0, seconds));
  }

  setVolume(v: number): void {
    if (this.instance) this.instance.volume = Math.max(0, Math.min(1, v));
    this.snap = { ...this.snap, volume: v };
    this.emit();
  }

  setMuted(muted: boolean): void {
    if (muted) this.instance?.mute();
    else this.instance?.unmute();
    this.snap = { ...this.snap, muted };
    this.emit();
  }

  getTime(): number {
    return this.instance?.currentPlaybackTime ?? 0;
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
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.instance) {
      for (const [name, cb] of Object.entries(this.handlers)) {
        this.instance.removeEventListener(name, cb);
      }
      try {
        this.instance.stop();
      } catch {
        /* noop */
      }
    }
    this.handlers = {};
    this.listeners.clear();
  }

  private update(status?: PlaybackSnapshot["status"]) {
    const instance = this.instance;
    if (!instance) return;
    this.snap = {
      ...this.snap,
      status: status ?? this.snap.status,
      currentTime: instance.currentPlaybackTime,
      duration: instance.currentPlaybackDuration || this.snap.duration,
      volume: instance.volume ?? this.snap.volume,
    };
    this.emit();
  }

  private emit() {
    const s = this.getSnapshot();
    for (const l of this.listeners) l(s);
  }
}

export const appleMusic = new AppleMusicService();
