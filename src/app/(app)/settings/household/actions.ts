"use server";

import { z } from "zod";
import { publicEnv } from "@/lib/env";
import type { ActionState } from "@/lib/auth/action-state";
import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type InviteState = ActionState & { link?: string };

export async function inviteMember(_prev: InviteState, form: FormData): Promise<InviteState> {
  await requireMember();
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("Please enter a valid email."), role: z.enum(["patient", "caregiver"]) })
    .safeParse({ email: form.get("email"), role: form.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invite", { p_email: parsed.data.email, p_role: parsed.data.role });
  if (error || !token) {
    return { error: error?.message.includes("patient") ? "This household already has a patient." : "Couldn't create the invite." };
  }
  const link = `${publicEnv.appUrl()}/signup?invite=${token}&email=${encodeURIComponent(parsed.data.email)}`;
  return { message: "Invite ready. Send this link by text or chat. It works for 7 days, once.", link };
}
