import { NextResponse, type NextRequest } from "next/server";
import { dispatch } from "@/lib/reminders/dispatch";
import { cronSecret, planAll, realDispatchDeps } from "@/lib/reminders/runtime";
import { bearerMatches } from "@/lib/reminders/token";
import { createAdminClient } from "@/lib/supabase/admin";

// Called every minute by pg_cron → pg_net (Authorization: Bearer CRON_SECRET).
// 1) re-plans today's reminders from the engine, 2) sends whatever is due.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  let secret: string;
  try {
    secret = cronSecret();
  } catch {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  try {
    const admin = createAdminClient();
    const planned = await planAll(admin, now);
    const report = await dispatch(realDispatchDeps(admin));
    return NextResponse.json({ ok: true, planned, ...report });
  } catch (e) {
    console.error("dispatch failed", e);
    return NextResponse.json({ ok: false, error: "dispatch failed" }, { status: 500 });
  }
}
