import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logFromToken } from "@/lib/reminders/log-from-token";
import { cronSecret } from "@/lib/reminders/runtime";
import { verifyAction } from "@/lib/reminders/token";

// POST from the service worker when she taps "Taken" or "Snooze 10m" on a notification.
export const dynamic = "force-dynamic";

const body = z.object({ token: z.string().min(10).max(2000), action: z.enum(["taken", "snooze"]) });

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  const now = new Date();
  const claims = verifyAction(parsed.data.token, cronSecret(), now);
  if (!claims) return NextResponse.json({ ok: false, message: "This reminder has expired. Open Bloom to log it." }, { status: 401 });
  try {
    const result = await logFromToken(claims, parsed.data.action, now);
    return NextResponse.json(result, { status: result.ok ? 200 : 403 });
  } catch (e) {
    console.error("notify action failed", e);
    return NextResponse.json({ ok: false, message: "That didn't save. Open Bloom to log it." }, { status: 500 });
  }
}
