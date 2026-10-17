import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { buildIcs } from "@/lib/reminders/ics";
import { cronSecret } from "@/lib/reminders/runtime";
import { verifyAction } from "@/lib/reminders/token";

// "Add to calendar" from a reminder email: a signed link, no session needed.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const now = new Date();
  const claims = verifyAction(token, cronSecret(), now);
  if (!claims) return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  const ics = buildIcs({
    uid: `${claims.d}-${claims.r}-${claims.o}@bloom`,
    title: claims.t,
    description: "From Bloom. Tap Done in Bloom when you've taken it.",
    start: new Date(claims.at),
    url: publicEnv.appUrl(),
    now,
  });
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="bloom-dose.ics"', "Cache-Control": "no-store" },
  });
}
