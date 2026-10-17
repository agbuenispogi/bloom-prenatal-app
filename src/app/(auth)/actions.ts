"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import type { ActionState } from "@/lib/auth/action-state";
import { safeNext } from "@/lib/auth/redirect";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
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

export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = { email: form.get("email")?.toString() ?? "" };
  const parsed = signUpSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    invite: form.get("invite")?.toString() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };

  await setRemember(true);
  const supabase = await createClient({ remember: true });
  const next = parsed.data.invite ? `/welcome?invite=${parsed.data.invite}` : "/welcome";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: confirmUrl(next) },
  });
  if (error) {
    // The invite-only hook rejects strangers with a friendly message; surface it as-is.
    return { error: error.message || "Couldn't create the account.", values };
  }
  if (data.session) redirect(next);
  return { message: "Check your email to confirm your account, then come back here.", values };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
