"use client";

import { create } from "zustand";
import type {
  AccentPalette,
  Lyrics,
  PlaybackSnapshot,
  SceneMeta,
  Song,
} from "@/types";
import type { AudioProvider } from "@/lib/audio/types";
import { idleSnapshot } from "@/lib/audio/types";
import { useSettings } from "@/stores/settings";
import { LocalAudioProvider } from "@/lib/audio/local";
import { takeLocalFile } from "@/lib/audio/local-file";
import { jamendoId, isJamendoId } from "@/lib/jamendo/id";
import { localTrack, localTrackExtras } from "@/data/tracks";
import { appleMusic } from "@/lib/apple-music/service";
import { parseLrc, buildLyrics } from "@/lib/lyrics/lrc";
import { LyricsEngine } from "@/lib/lyrics/engine";
import { Timeline } from "@/lib/visuals/timeline";
import { autoSceneMeta } from "@/lib/visuals/auto-sections";
import { extractPalette, FALLBACK_PALETTE } from "@/lib/visuals/color";
import { DEMO_CONFIG, DEMO_LINE_ANNOTATIONS, DEMO_SONG_ID } from "@/data/demo";

export type ExperienceStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error";

/** Mutable, ref-style clock read every frame without triggering React renders. */
export interface PlaybackClock {
  time: number;
  duration: number;
  playing: boolean;
}

interface ExperienceState {
  status: ExperienceStatus;
  error: string | null;
  loadingLabel: string;

  song: Song | null;
  lyrics: Lyrics | null;
  lyricsUnavailable: boolean;
  continueWithoutLyrics: boolean;

  sceneMeta: SceneMeta | null;
  palette: AccentPalette;

  engine: LyricsEngine | null;
  timeline: Timeline | null;
  provider: AudioProvider | null;
  clock: PlaybackClock;

  snapshot: PlaybackSnapshot;
  controlsVisible: boolean;

  // actions
  prepare(songId: string, opts?: { localFile?: File }): Promise<void>;
  play(): void;
  pause(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  seekBy(delta: number): void;
  setVolume(v: number): void;
  toggleMute(): void;
  setControlsVisible(v: boolean): void;
  acceptNoLyrics(): void;
  restart(): void;
  teardown(): void;
}

let unsub: (() => void) | null = null;
let snapshotThrottle = 0;

export const useExperience = create<ExperienceState>((set, get) => ({
  status: "idle",
  error: null,
  loadingLabel: "PREPARING EXPERIENCE",
  song: null,
  lyrics: null,
  lyricsUnavailable: false,
  continueWithoutLyrics: false,
  sceneMeta: null,
  palette: FALLBACK_PALETTE,
  engine: null,
  timeline: null,
  provider: null,
  clock: { time: 0, duration: 0, playing: false },
  snapshot: { ...idleSnapshot },
  controlsVisible: true,

  async prepare(songId, opts) {
    get().teardown();
    set({
      status: "preparing",
      error: null,
      lyricsUnavailable: false,
      continueWithoutLyrics: false,
      loadingLabel: "PREPARING EXPERIENCE",
    });

    try {
      const staged = takeLocalFile(songId);
      const localFile = opts?.localFile ?? staged?.file;
      const isDemo = songId === DEMO_SONG_ID || songId === "demo";
      const isJamendo = isJamendoId(songId);
      const appleConfigured = appleMusic.getStatus().configured || appleMusic.getStatus().authorized;

      let song: Song;
      let sceneMeta: SceneMeta;
      let lyrics: Lyrics;
      let provider: AudioProvider;
      let palette: AccentPalette;

      if (localFile) {
        song = staged?.song ?? {
          id: songId,
          title: localFile.name.replace(/\.[^.]+$/, ""),
          artistName: "Local file",
          albumName: "",
          durationMs: 0,
          provider: "local",
        };
        provider = new LocalAudioProvider(() => localFile);
        await provider.load(song);
        const dur = provider.getSnapshot().duration || 210;
        sceneMeta = autoSceneMeta(dur);
        lyrics = { lines: [], synced: false, wordLevel: false, source: "none" };
        palette = FALLBACK_PALETTE;
      } else if (localTrack(songId)) {
        set({ loadingLabel: "LOADING TRACK" });
        song = localTrack(songId)!;
        const extras = localTrackExtras(songId);
        provider = new LocalAudioProvider(() => song.previewUrl);
        await provider.load(song);

        set({ loadingLabel: "RETRIEVING LYRICS" });
        lyrics = extras.lrcUrl
          ? await fetchLocalLrc(extras.lrcUrl, song)
          : await fetchRemoteLyrics(song);
        const dur = provider.getSnapshot().duration || song.durationMs / 1000 || 210;
        sceneMeta = autoSceneMeta(dur, lyrics.lines, extras.scene);
        palette = song.artworkUrl
          ? await extractPalette(song.artworkUrl).catch(() => FALLBACK_PALETTE)
          : FALLBACK_PALETTE;
      } else if (isJamendo) {
        set({ loadingLabel: "LOADING TRACK" });
        const res = await fetch(`/api/jamendo/track/${jamendoId(songId)}`);
        if (!res.ok) throw new Error("SONG_UNAVAILABLE");
        song = ((await res.json()) as { song: Song }).song;
        provider = new LocalAudioProvider(() => song.previewUrl, "jamendo");
        await provider.load(song);

        set({ loadingLabel: "RETRIEVING LYRICS" });
        lyrics = await fetchRemoteLyrics(song);
        const dur = provider.getSnapshot().duration || song.durationMs / 1000 || 210;
        sceneMeta = autoSceneMeta(dur, lyrics.lines);
        palette = song.artworkUrl
          ? await extractPalette(song.artworkUrl).catch(() => FALLBACK_PALETTE)
          : FALLBACK_PALETTE;
      } else if (isDemo || !appleConfigured) {
        set({ loadingLabel: "LOADING WORLD" });
        song = DEMO_CONFIG.song;
        sceneMeta = DEMO_CONFIG.sceneMeta;
        palette = DEMO_CONFIG.sceneMeta.palette ?? FALLBACK_PALETTE;
        provider = new LocalAudioProvider(() => DEMO_CONFIG.song.previewUrl);
        await provider.load(song);
        const lrcText = await fetch(DEMO_CONFIG.lrc).then((r) => r.text());
        const parsed = parseLrc(lrcText);
        lyrics = buildLyrics(parsed, {
          source: "demo",
          songDuration: song.durationMs / 1000,
          annotations: DEMO_LINE_ANNOTATIONS,
        });
      } else {
        set({ loadingLabel: "CONNECTING TO APPLE MUSIC" });
        const fetched = await appleMusic.getSong(songId);
        if (!fetched) throw new Error("SONG_UNAVAILABLE");
        song = fetched;
        provider = appleMusic.createAudioProvider();
        await provider.load(song);

        set({ loadingLabel: "RETRIEVING LYRICS" });
        lyrics = await fetchRemoteLyrics(song);
        sceneMeta = autoSceneMeta(song.durationMs / 1000, lyrics.lines);
        palette = song.artworkUrl
          ? await extractPalette(song.artworkUrl).catch(() => FALLBACK_PALETTE)
          : FALLBACK_PALETTE;
      }

      // Apply the persisted volume / mute preference to the fresh provider.
      const prefs = useSettings.getState();
      provider.setVolume(prefs.volume);

      const duration = provider.getSnapshot().duration || song.durationMs / 1000 || 180;
      const engine = new LyricsEngine(lyrics);
      const timeline = new Timeline(sceneMeta, lyrics.lines, duration);
      const lyricsUnavailable = !lyrics.synced && lyrics.lines.length === 0;

      // Stable clock object — mutated in place each frame, never replaced.
      const clock: PlaybackClock = { time: 0, duration, playing: false };
      set({ clock });

      // Subscribe to playback snapshots (throttled for UI) + keep the clock fresh.
      unsub = provider.subscribe((snap) => {
        clock.time = snap.currentTime;
        clock.duration = snap.duration || duration;
        clock.playing = snap.status === "playing";

        const now = performance.now();
        const important =
          snap.status !== get().snapshot.status || snap.status === "ended" || snap.status === "error";
        if (!important && now - snapshotThrottle < 220) return;
        snapshotThrottle = now;

        const patch: Partial<ExperienceState> = { snapshot: snap };
        if (snap.status === "ended") patch.status = "ended";
        else if (snap.status === "playing") patch.status = "playing";
        else if (snap.status === "paused" && get().status === "playing") patch.status = "paused";
        else if (snap.status === "error") {
          patch.status = "error";
          patch.error = snap.error ?? "Playback error";
        }
        set(patch);
      });

      set({
        song,
        sceneMeta,
        palette,
        lyrics,
        lyricsUnavailable,
        engine,
        timeline,
        provider,
        status: "ready",
      });
    } catch (err) {
      const code = (err as Error).message;
      set({
        status: "error",
        error:
          code === "SONG_UNAVAILABLE"
            ? "This song can't be loaded right now."
            : code === "PREVIEW_ONLY"
              ? "An Apple Music subscription is required for full playback."
              : "Something interrupted the experience.",
      });
    }
  },

  play() {
    const { provider, status } = get();
    if (!provider) return;
    if (status === "ended") get().restart();
    void provider.play();
    set({ status: "playing" });
  },

  pause() {
    get().provider?.pause();
    set({ status: "paused" });
  },

  togglePlay() {
    const s = get().status;
    if (s === "playing") get().pause();
    else get().play();
  },

  seek(seconds) {
    const { provider, clock } = get();
    if (!provider) return;
    const clamped = Math.max(0, Math.min(seconds, clock.duration || seconds));
    provider.seek(clamped);
    clock.time = clamped;
  },

  seekBy(delta) {
    get().seek(get().clock.time + delta);
  },

  setVolume(v) {
    get().provider?.setVolume(v);
    set({ snapshot: { ...get().snapshot, volume: v } });
  },

  toggleMute() {
    const muted = !get().snapshot.muted;
    get().provider?.setMuted(muted);
    set({ snapshot: { ...get().snapshot, muted } });
  },

  setControlsVisible(v) {
    if (get().controlsVisible !== v) set({ controlsVisible: v });
  },

  acceptNoLyrics() {
    set({ continueWithoutLyrics: true });
  },

  restart() {
    get().seek(0);
    get().provider?.play();
    set({ status: "playing" });
  },

  teardown() {
    unsub?.();
    unsub = null;
    get().provider?.destroy();
    set({
      status: "idle",
      error: null,
      song: null,
      lyrics: null,
      engine: null,
      timeline: null,
      provider: null,
      sceneMeta: null,
      lyricsUnavailable: false,
      continueWithoutLyrics: false,
      snapshot: { ...idleSnapshot },
      clock: { time: 0, duration: 0, playing: false },
      controlsVisible: true,
    });
  },
}));

async function fetchLocalLrc(url: string, song: Song): Promise<Lyrics> {
  try {
    const text = await fetch(url).then((r) => (r.ok ? r.text() : ""));
    if (!text.trim()) return fetchRemoteLyrics(song);
    const parsed = parseLrc(text);
    const built = buildLyrics(parsed, {
      source: "local",
      songDuration: song.durationMs / 1000,
    });
    return built.lines.length ? built : fetchRemoteLyrics(song);
  } catch {
    return fetchRemoteLyrics(song);
  }
}

async function fetchRemoteLyrics(song: Song): Promise<Lyrics> {
  try {
    const params = new URLSearchParams({
      track: song.title,
      artist: song.artistName,
    });
    if (song.albumName) params.set("album", song.albumName);
    if (song.durationMs) params.set("duration", String(Math.round(song.durationMs / 1000)));
    const res = await fetch(`/api/lyrics?${params.toString()}`);
    if (!res.ok) return { lines: [], synced: false, wordLevel: false, source: "none" };
    const body = (await res.json()) as { lyrics: Lyrics };
    return body.lyrics;
  } catch {
    return { lines: [], synced: false, wordLevel: false, source: "none" };
  }
}
