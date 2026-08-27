// Server proxy for LRCLIB lookups. Keeps the User-Agent header clean and lets us
// cache metadata responses without exposing the client to CORS.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchLyrics } from "@/lib/lyrics/lrclib";

export const runtime = "nodejs";

const Query = z.object({
  track: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  album: z.string().max(200).optional(),
  duration: z.coerce.number().positive().max(3600).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { track, artist, album, duration } = parsed.data;
  try {
    const lyrics = await fetchLyrics({
      trackName: track,
      artistName: artist,
      albumName: album,
      durationSec: duration,
    });
    return NextResponse.json(
      { lyrics },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Lyric lookup failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
