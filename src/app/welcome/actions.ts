"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/auth/action-state";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const name = z.string().trim().min(1, "Please add a name.").max(60);

export async function createHousehold(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = z
    .object({
      household: z.string().trim().min(1, "Please name your household.").max(80),
      displayName: name,
      role: z.enum(["patient", "caregiver"]),
    })
    .safeParse({ household: form.get("household"), displayName: form.get("displayName"), role: form.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: parsed.data.household,
    p_display_name: parsed.data.displayName,
    p_role: parsed.data.role,
  });
  if (error) return { error: error.message.includes("already") ? "You're already in a household." : "Couldn't create the household." };
  redirect("/settings/household?created=1");
}

export async function acceptInvite(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/), displayName: name })
    .safeParse({ token: form.get("token"), displayName: form.get("displayName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "This invite link looks incomplete." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: parsed.data.token, p_display_name: parsed.data.displayName });
  if (error) {
    if (error.message.includes("different email")) return { error: "This invite was sent to a different email address." };
    if (error.message.includes("already")) return { error: "You're already in a household." };
    return { error: "This invite has expired or was already used. Ask for a new link." };
  }
  redirect("/");
}
