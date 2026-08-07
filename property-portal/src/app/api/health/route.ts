import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Liveness probe for the host's health checks. Reveals no private data. */
export async function GET() {
  try {
    db.prepare("SELECT 1").get();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "database unavailable" }, { status: 503 });
  }
}
