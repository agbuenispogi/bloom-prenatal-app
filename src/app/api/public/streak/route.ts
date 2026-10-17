import { NextResponse } from "next/server";
import type { Household } from "@/lib/auth/session";
import { addDays, streak, summarizeDay } from "@/lib/engine";
import { currentCareDate, loadDays } from "@/lib/data/day";
import { parseHouseholdSettings } from "@/lib/data/settings";
import { SNOWFLAKE_URL, streakMessage } from "@/lib/snowflake/feed";
import { createAdminClient } from "@/lib/supabase/admin";

// The ONLY public Bloom data: a gentle "N caring days in a row" line for Baby Snowflake, and only when she has
// turned sharing on (Settings → Pregnancy). No medicine names, doses, times or misses ever leave Bloom.
export const revalidate = 600;

const cors = { "Access-Control-Allow-Origin": new URL(SNOWFLAKE_URL).origin, "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: households } = await admin.from("households").select("*");
    const h = (households as Household[] | null)?.find((x) => parseHouseholdSettings(x.tz, x.settings).shareStreak);
    if (!h) return NextResponse.json({ enabled: false }, { headers: cors });

    const now = new Date();
    const yesterday = addDays(currentCareDate(h, now), -1);
    const firstDay = currentCareDate(h, new Date(h.created_at));
    if (yesterday < firstDay) return NextResponse.json({ enabled: true, streak: 0, message: streakMessage(0) }, { headers: cors });
    const from = [addDays(yesterday, -60), firstDay].sort().at(-1)!;
    const days = await loadDays(admin, h, null, now, from, yesterday);
    const n = streak(days.map((d) => summarizeDay(d.schedule)));
    return NextResponse.json({ enabled: true, streak: n, message: streakMessage(n), asOf: yesterday }, { headers: cors });
  } catch (e) {
    console.error("public streak failed", e);
    return NextResponse.json({ enabled: false }, { status: 200, headers: cors });
  }
}
