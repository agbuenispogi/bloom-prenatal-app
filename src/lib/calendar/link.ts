import "server-only";
import { publicEnv } from "@/lib/env";
import { signFeed } from "@/lib/reminders/token";

// webcal:// link to this member's private calendar feed (null until CRON_SECRET is configured).
export function calendarFeedUrl(householdId: string, profileId: string): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return null;
  const token = signFeed({ h: householdId, p: profileId }, secret);
  return `${publicEnv.appUrl().replace(/^https?:\/\//, "webcal://")}/api/calendar/${token}.ics`;
}
