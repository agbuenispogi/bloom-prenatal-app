"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/lib/auth/action-state";
import { signUp } from "../actions";

export function SignupForm({ invite, email }: { invite?: string; email?: string }) {
  const [state, action] = useActionState(signUp, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-5">
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email ?? email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters. Your phone's password manager can save it."
      />
      <FormMessage state={state} />
      {state.signInHref ? (
        <Link href={state.signInHref} className="flex min-h-12 items-center justify-center rounded-[8px] border border-rule px-5 text-base font-medium text-ink">
          Sign in instead
        </Link>
      ) : null}
      <SubmitButton>Create account</SubmitButton>
      <p className="text-[0.9375rem] text-ink-soft">
        Already have an account?{" "}
        <Link className="underline" href={`/login?next=${encodeURIComponent(invite ? `/welcome?invite=${invite}` : "/welcome")}`}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
