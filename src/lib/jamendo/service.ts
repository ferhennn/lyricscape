// Jamendo — ~600k Creative Commons tracks, full-length legal streaming, free key.
// A no-paid-account alternative to Apple Music. All requests go through our API
// routes so JAMENDO_CLIENT_ID stays server-side.

import type { Song } from "@/types";
import { JAMENDO_PREFIX } from "./id";

export interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  album_name: string;
  album_image?: string;
  image?: string;
  audio: string;
  shareurl?: string;
}

const BASE = "https://api.jamendo.com/v3.0";

export function jamendoConfigured(): boolean {
  return !!process.env.JAMENDO_CLIENT_ID;
}

async function jamendo(path: string, params: Record<string, string>): Promise<JamendoTrack[]> {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) throw new Error("JAMENDO_NOT_CONFIGURED");
  const qs = new URLSearchParams({
    client_id: clientId,
    format: "json",
    audioformat: "mp32",
    imagesize: "300",
    ...params,
  });
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Jamendo request failed (${res.status})`);
  const body = (await res.json()) as { results?: JamendoTrack[] };
  return body.results ?? [];
}

export function trackToSong(t: JamendoTrack): Song {
  return {
    id: `${JAMENDO_PREFIX}${t.id}`,
    title: t.name,
    artistName: t.artist_name,
    albumName: t.album_name ?? "",
    durationMs: Math.round((t.duration || 0) * 1000),
    artworkUrl: t.image || t.album_image,
    provider: "jamendo",
    previewUrl: t.audio,
  };
}

export async function searchTracks(term: string, limit = 18): Promise<Song[]> {
  const rows = await jamendo("/tracks/", {
    search: term,
    limit: String(limit),
    include: "musicinfo",
    groupby: "artist_id",
  });
  return rows.filter((t) => t.audio).map(trackToSong);
}

export async function trendingTracks(limit = 12): Promise<Song[]> {
  const rows = await jamendo("/tracks/", {
    order: "popularity_month",
    limit: String(limit),
  });
  return rows.filter((t) => t.audio).map(trackToSong);
}

export async function getTrack(id: string): Promise<Song | null> {
  const rows = await jamendo("/tracks/", { id, include: "musicinfo" });
  const first = rows[0];
  return first ? trackToSong(first) : null;
}
