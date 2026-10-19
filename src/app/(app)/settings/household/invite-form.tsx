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
          <output className="block rounded-[16px] border border-rule p-3 text-[0.875rem] break-all text-ink">{state.link}</output>
          <button
            type="button"
            className="min-h-12 rounded-[14px] border border-rule px-5 text-base font-medium"
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
