"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

// Saves this device's Web Push subscription for the signed-in member (RLS: own rows only).
export async function savePushSubscription(raw: unknown): Promise<{ ok: boolean }> {
  const { profile } = await requireMember();
  const sub = subscription.parse(raw);
  const supabase = await createClient();
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ profile_id: profile.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: ua }, { onConflict: "endpoint" });
  if (error) {
    console.error("push subscription save failed", error);
    return { ok: false };
  }
  return { ok: true };
}
