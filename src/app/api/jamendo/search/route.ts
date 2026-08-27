import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jamendoConfigured, searchTracks, trendingTracks } from "@/lib/jamendo/service";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().positive().max(40).optional(),
});

export async function GET(req: NextRequest) {
  if (!jamendoConfigured()) {
    return NextResponse.json(
      { error: "Jamendo is not configured. Set JAMENDO_CLIENT_ID to enable it.", demoMode: true },
      { status: 501 },
    );
  }
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { q, limit } = parsed.data;
  try {
    const songs = q?.trim() ? await searchTracks(q.trim(), limit) : await trendingTracks(limit);
    return NextResponse.json(
      { songs, source: "jamendo" },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
