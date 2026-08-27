// LRCLIB client — a legally usable source of community-contributed synced lyrics.
// https://lrclib.net/docs — no auth, permissive usage.

import type { Lyrics } from "@/types";
import { buildLyrics, parseLrc, plainTextLyrics } from "./lrc";

const BASE = "https://lrclib.net/api";
const UA = "LYRICSCAPE (https://github.com/lyricscape/lyricscape)";

export interface LrcLibQuery {
  trackName: string;
  artistName: string;
  albumName?: string;
  durationSec?: number;
}

interface LrcLibRecord {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

async function req(path: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal,
    // Cache metadata responses; respect the source by not persisting elsewhere.
    next: { revalidate: 60 * 60 * 24 },
  });
}

function toLyrics(rec: LrcLibRecord, durationSec: number): Lyrics {
  if (rec.instrumental) {
    return { lines: [], synced: false, wordLevel: false, source: "lrclib" };
  }
  if (rec.syncedLyrics) {
    const parsed = parseLrc(rec.syncedLyrics);
    const built = buildLyrics(parsed, { source: "lrclib", songDuration: durationSec });
    if (built.lines.length > 0) return built;
  }
  if (rec.plainLyrics) return plainTextLyrics(rec.plainLyrics);
  return { lines: [], synced: false, wordLevel: false, source: "none" };
}

export async function fetchLyrics(q: LrcLibQuery, signal?: AbortSignal): Promise<Lyrics> {
  // 1. Exact signature match.
  if (q.durationSec) {
    const params = new URLSearchParams({
      track_name: q.trackName,
      artist_name: q.artistName,
      duration: String(Math.round(q.durationSec)),
    });
    if (q.albumName) params.set("album_name", q.albumName);
    try {
      const res = await req(`/get?${params.toString()}`, signal);
      if (res.ok) {
        const rec = (await res.json()) as LrcLibRecord;
        return toLyrics(rec, q.durationSec);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
    }
  }

  // 2. Fuzzy search, pick the closest by duration.
  const search = new URLSearchParams({ track_name: q.trackName, artist_name: q.artistName });
  const res = await req(`/search?${search.toString()}`, signal);
  if (!res.ok) return { lines: [], synced: false, wordLevel: false, source: "none" };
  const records = (await res.json()) as LrcLibRecord[];
  if (!Array.isArray(records) || records.length === 0) {
    return { lines: [], synced: false, wordLevel: false, source: "none" };
  }
  const target = q.durationSec ?? records[0].duration;
  const best = records
    .filter((r) => r.syncedLyrics || r.plainLyrics)
    .sort((a, b) => Math.abs(a.duration - target) - Math.abs(b.duration - target))[0];
  if (!best) return { lines: [], synced: false, wordLevel: false, source: "none" };
  return toLyrics(best, target);
}
