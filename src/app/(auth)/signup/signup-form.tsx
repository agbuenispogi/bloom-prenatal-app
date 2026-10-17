"use client";

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
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
