"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/lib/auth/action-state";
import { signIn } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required={false} />
      <label className="flex min-h-12 items-center gap-3 text-base">
        <input type="checkbox" name="remember" defaultChecked className="size-5" />
        Keep me signed in
      </label>
      <FormMessage state={state} />
      <SubmitButton name="intent" value="password">Sign in</SubmitButton>
      <SubmitButton name="intent" value="magic" variant="quiet">
        Email me a sign-in link instead
      </SubmitButton>
      <p className="text-sm opacity-70">
        First time here? <Link className="underline" href="/signup">Create the household</Link> or open your invite link.
      </p>
    </form>
  );
}
