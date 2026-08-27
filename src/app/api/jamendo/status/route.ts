import { NextResponse } from "next/server";
import { jamendoConfigured } from "@/lib/jamendo/service";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: jamendoConfigured() });
}
