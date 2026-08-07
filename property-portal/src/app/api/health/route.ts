import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** Liveness probe. Reveals no private data. */
export async function GET() {
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "database unavailable" }, { status: 503 });
  }
}
