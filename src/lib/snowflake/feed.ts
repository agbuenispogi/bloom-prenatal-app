// Baby Snowflake (the family's public pregnancy journal) ↔ Bloom.
// Contract: the site publishes /bloom-feed.json; Bloom shows its latest update and can borrow its due date.
// Anything malformed or missing is ignored: Bloom never depends on the site being up.
import { z } from "zod";

export const SNOWFLAKE_URL = (process.env.BABY_SNOWFLAKE_URL || "https://baby-snowflake.vercel.app").replace(/\/$/, "");

const feedSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  latest: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      week: z.number().int().min(1).max(42).optional(),
      title: z.string().trim().min(1).max(120),
      summary: z.string().trim().max(280).optional(),
      url: z.string().url().optional(),
    })
    .optional(),
});

export type SnowflakeFeed = z.infer<typeof feedSchema>;

export function parseFeed(raw: unknown): SnowflakeFeed | null {
  const r = feedSchema.safeParse(raw);
  return r.success ? r.data : null;
}

// Only links back to the site itself are followed.
export function safeLink(url: string | undefined): string {
  if (url && (url === SNOWFLAKE_URL || url.startsWith(`${SNOWFLAKE_URL}/`) || url.startsWith(`${SNOWFLAKE_URL}#`))) return url;
  return SNOWFLAKE_URL;
}

// Server-side fetch, cached for an hour; never throws.
export async function fetchSnowflakeFeed(): Promise<SnowflakeFeed | null> {
  try {
    const res = await fetch(`${SNOWFLAKE_URL}/bloom-feed.json`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return parseFeed(await res.json());
  } catch {
    return null;
  }
}

// The only thing Bloom ever shares publicly: a gentle streak line. No medicine names, doses, times or misses.
export function streakMessage(days: number): string {
  if (days >= 2) return `Mama has cared for Snowflake ${days} days in a row`;
  if (days === 1) return "Mama cared for Snowflake yesterday";
  return "Every day is a fresh page for Mama and Snowflake";
}
