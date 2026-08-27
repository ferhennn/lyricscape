// Local track catalogue — generated from public/tracks/manifest.json by
// `npm run tracks` (also runs on predev / prebuild). Users drop audio files in
// public/tracks/ and they show up here.

import manifest from "../../public/tracks/manifest.json";
import type { Song, VisualSceneType } from "@/types";

export interface TrackEntry {
  id: string;
  file: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  cover?: string;
  /** Sidecar .lrc filename in public/tracks/, overrides LRCLIB. */
  lrc?: string;
  /** Force a visual scene for this track. */
  scene?: VisualSceneType;
}

const entries = (manifest as TrackEntry[]).filter((e) => e && e.id && e.file);

function encodePath(file: string): string {
  return `/tracks/${file.split("/").map(encodeURIComponent).join("/")}`;
}

export const LOCAL_TRACKS: Song[] = entries.map((e) => ({
  id: e.id,
  title: e.title || e.file,
  artistName: e.artist || "Unknown artist",
  albumName: e.album || "",
  durationMs: e.durationMs || 0,
  artworkUrl: e.cover ? encodePath(e.cover) : undefined,
  provider: "local",
  previewUrl: encodePath(e.file),
}));

const extrasById = new Map(entries.map((e) => [e.id, e]));

export function localTrack(id: string): Song | undefined {
  return LOCAL_TRACKS.find((t) => t.id === id);
}

export function localTrackExtras(id: string): { lrcUrl?: string; scene?: VisualSceneType } {
  const e = extrasById.get(id);
  return {
    lrcUrl: e?.lrc ? encodePath(e.lrc) : undefined,
    scene: e?.scene,
  };
}

export function searchLocalTracks(term: string, limit = 12): Song[] {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  return LOCAL_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artistName.toLowerCase().includes(q) ||
      t.albumName.toLowerCase().includes(q),
  ).slice(0, limit);
}

export const HAS_LOCAL_TRACKS = LOCAL_TRACKS.length > 0;
