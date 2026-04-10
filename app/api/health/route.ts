import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness check for uptime monitors (no auth, no DB ping).
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
  });
}
