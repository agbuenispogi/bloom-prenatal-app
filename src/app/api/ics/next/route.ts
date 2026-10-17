import { NextResponse } from "next/server";
import { getAuthUser, getProfile } from "@/lib/auth/session";
import { loadDay } from "@/lib/data/day";
import { publicEnv } from "@/lib/env";
import { buildIcs } from "@/lib/reminders/ics";
import { createClient } from "@/lib/supabase/server";

// "Add an alarm to my calendar" for the current Next up dose (signed-in, from the app).
export async function GET() {
  if (!(await getAuthUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "No household." }, { status: 403 });
  const supabase = await createClient();
  const { data: household } = await supabase.from("households").select("*").eq("id", profile.household_id).single();
  if (!household) return NextResponse.json({ error: "No household." }, { status: 403 });
  const now = new Date();
  const day = await loadDay(supabase, household, profile, now);
  const next = day.schedule.nextUp;
  if (next.type !== "take") return NextResponse.json({ error: "Nothing with a set time is next." }, { status: 404 });
  const d = next.dose;
  const ics = buildIcs({
    uid: `${day.input.careDay.date}-${d.rule.id}-${d.occurrence}@bloom`,
    title: `${d.medication.name}${d.medication.doseLabel ? ` · ${d.medication.doseLabel}` : ""}, ${d.rule.label}`,
    description: "From Bloom. Tap Done in Bloom when you've taken it.",
    start: next.dueAt,
    url: publicEnv.appUrl(),
    now,
  });
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="bloom-next-dose.ics"', "Cache-Control": "no-store" },
  });
}
