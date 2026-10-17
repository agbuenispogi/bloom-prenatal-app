"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import type { ActionState } from "@/lib/auth/action-state";
import { safeNext } from "@/lib/auth/redirect";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const email = z.string().trim().toLowerCase().email("Please enter a valid email.");
const password = z.string().min(8, "Use at least 8 characters.");

async function setRemember(remember: boolean) {
  (await cookies()).set(REMEMBER_COOKIE, remember ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}

function confirmUrl(next: string) {
  return `${publicEnv.appUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const intent = form.get("intent") === "magic" ? "magic" : "password";
  const remember = form.get("remember") === "on";
  const next = safeNext(form.get("next")?.toString());
  const parsedEmail = email.safeParse(form.get("email"));
  const values = { email: form.get("email")?.toString() ?? "" };
  if (!parsedEmail.success) return { error: parsedEmail.error.issues[0]?.message, values };

  await setRemember(remember);
  const supabase = await createClient({ remember });

  if (intent === "magic") {
    const { error } = await supabase.auth.signInWithOtp({
      email: parsedEmail.data,
      options: { shouldCreateUser: false, emailRedirectTo: confirmUrl(next) },
    });
    // Same message whether or not the account exists, so the form can't be used to probe emails.
    if (error && error.status !== 400 && error.status !== 422) return { error: "Couldn't send the link. Try again in a minute.", values };
    return { message: "If that email has a Bloom account, a sign-in link is on its way.", values };
  }

  const parsedPassword = password.safeParse(form.get("password"));
  if (!parsedPassword.success) return { error: "Please enter your password.", values };
  const { error } = await supabase.auth.signInWithPassword({ email: parsedEmail.data, password: parsedPassword.data });
  if (error) return { error: "That email and password don't match.", values };
  redirect(next);
}

const signUpSchema = z.object({
  email,
  password,
  invite: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

// Sign-up without email: the Supabase project is shared with another app, so Bloom can't rely on its auth
// emails or change its settings. The server checks the invite (or that this is the very first household),
// creates the account already confirmed, and signs her in.
export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = { email: form.get("email")?.toString() ?? "" };
  const parsed = signUpSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    invite: form.get("invite")?.toString() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  const { email: addr, password: pass, invite } = parsed.data;
  const admin = createAdminClient();

  if (invite) {
    const hash = createHash("sha256").update(invite, "utf8").digest("hex");
    const { data: inv } = await admin.from("household_invites").select("email, expires_at, accepted_at").eq("token_hash", hash).maybeSingle();
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) return { error: "This invite has expired or was already used. Ask for a new link.", values };
    if (inv.email !== addr) return { error: "This invite was sent to a different email address.", values };
  } else {
    const { count } = await admin.from("households").select("id", { count: "exact", head: true });
    if (count) return { error: "Bloom is invite-only. Ask for an invite link.", values };
  }

  const next = invite ? `/welcome?invite=${invite}` : "/welcome";
  const { error } = await admin.auth.admin.createUser({ email: addr, password: pass, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { error: "This email already has an account. Sign in with its password instead.", values, signInHref: `/login?next=${encodeURIComponent(next)}` };
    }
    console.error("sign-up failed", error);
    return { error: "Couldn't create the account. Try again in a moment.", values };
  }

  await setRemember(true);
  const supabase = await createClient({ remember: true });
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: addr, password: pass });
  if (signInError) return { message: "Account created. Sign in to continue.", values, signInHref: `/login?next=${encodeURIComponent(next)}` };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
