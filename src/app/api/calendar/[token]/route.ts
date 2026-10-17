import { NextResponse, type NextRequest } from "next/server";
import type { Household } from "@/lib/auth/session";
import { feedEvents } from "@/lib/calendar/feed";
import { addDays } from "@/lib/engine";
import { currentCareDate, loadDays } from "@/lib/data/day";
import { publicEnv } from "@/lib/env";
import { buildCalendar } from "@/lib/reminders/ics";
import { cronSecret } from "@/lib/reminders/runtime";
import { verifyFeed } from "@/lib/reminders/token";
import { createAdminClient } from "@/lib/supabase/admin";

// The private "Bloom" calendar her phone subscribes to (webcal://…/api/calendar/<token>.ics): native alarms
// for today's and tomorrow's timed doses. The signed token is the only credential.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claims = verifyFeed(token.replace(/\.ics$/, ""), cronSecret());
  if (!claims) return NextResponse.json({ error: "This calendar link is no longer valid." }, { status: 404 });

  const admin = createAdminClient();
  const [{ data: household }, { data: profile }] = await Promise.all([
    admin.from("households").select("*").eq("id", claims.h).single(),
    admin.from("profiles").select("household_id").eq("id", claims.p).single(),
  ]);
  if (!household || profile?.household_id !== household.id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const now = new Date();
  const today = currentCareDate(household as Household, now);
  const days = await loadDays(admin, household as Household, null, now, today, addDays(today, 1));
  const ics = buildCalendar(
    "Bloom",
    feedEvents(
      days.map((d) => d.schedule),
      now,
      publicEnv.appUrl(),
    ),
  );
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
