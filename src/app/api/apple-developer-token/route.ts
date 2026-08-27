// Signs a short-lived Apple Music developer token (ES256 JWT) on the server.
// The private key never reaches the client. Returns 501 in demo mode so the UI
// can fall back gracefully.

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEN_HOURS = 60 * 60 * 10;

function normalizeKey(raw: string): string {
  // Support single-line env vars with literal "\n".
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    return NextResponse.json(
      {
        error:
          "Apple Music is not configured. Set APPLE_TEAM_ID, APPLE_MUSIC_KEY_ID and APPLE_MUSIC_PRIVATE_KEY to enable it. LYRICSCAPE runs in demo mode without them.",
        demoMode: true,
      },
      { status: 501 },
    );
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({}, normalizeKey(privateKey), {
      algorithm: "ES256",
      expiresIn: TEN_HOURS,
      issuer: teamId,
      header: { alg: "ES256", kid: keyId },
      keyid: keyId,
    });
    return NextResponse.json(
      { token, expiresAt: (now + TEN_HOURS) * 1000 },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to sign developer token: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
