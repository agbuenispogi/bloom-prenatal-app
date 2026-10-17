"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/lib/auth/action-state";
import { acceptInvite, createHousehold } from "./actions";

export function CreateHouseholdForm() {
  const [state, action] = useActionState(createHousehold, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Household name" name="household" defaultValue="Our home" />
      <Field label="Your name" name="displayName" autoComplete="given-name" />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">You are…</legend>
        <label className="flex min-h-12 items-center gap-3">
          <input type="radio" name="role" value="caregiver" defaultChecked className="size-5 accent-[var(--ribbon-fill)]" />
          The caregiver (I get reminders and see her timeline)
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="radio" name="role" value="patient" className="size-5 accent-[var(--ribbon-fill)]" />
          The one taking the medications
        </label>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton>Create household</SubmitButton>
    </form>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvite, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <Field label="What should Bloom call you?" name="displayName" autoComplete="given-name" />
      <FormMessage state={state} />
      <SubmitButton>Join household</SubmitButton>
    </form>
  );
}
