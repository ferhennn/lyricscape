import { NextRequest, NextResponse } from "next/server";
import { getTrack, jamendoConfigured } from "@/lib/jamendo/service";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!jamendoConfigured()) {
    return NextResponse.json({ error: "Jamendo is not configured." }, { status: 501 });
  }
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const song = await getTrack(id);
    if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    return NextResponse.json(
      { song },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
