"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { inviteMember, type InviteState } from "./actions";

export function InviteForm({ defaultRole }: { defaultRole: "patient" | "caregiver" }) {
  const [state, action] = useActionState<InviteState, FormData>(inviteMember, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Their email" name="email" type="email" autoComplete="off" />
      <input type="hidden" name="role" value={defaultRole} />
      <FormMessage state={state} />
      {state.link ? (
        <div className="flex flex-col gap-2">
          <output className="break-all rounded-xl bg-foreground/5 p-3 font-mono text-sm">{state.link}</output>
          <button
            type="button"
            className="min-h-12 rounded-xl border border-foreground/25 px-5"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link!);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
      <SubmitButton>Create invite link</SubmitButton>
    </form>
  );
}
