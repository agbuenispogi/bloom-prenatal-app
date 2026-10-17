"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { FormAction } from "./types";

export function PregnancyForm({ dueDate, weekLabel, save, viewer = "patient" }: { dueDate: string | null; weekLabel: string | null; save: FormAction; viewer?: "patient" | "caregiver" }) {
  const [state, action] = useActionState(save, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {weekLabel ? <p className="font-serif text-2xl">{weekLabel}</p> : null}
      <Field label="Due date" name="dueDate" type="date" defaultValue={dueDate ?? ""} required={false} hint={`From ${viewer === "patient" ? "your" : "her"} OB. Bloom shows the week on each page and in the morning summary.`} />
      <FormMessage state={state} />
      <SubmitButton>Save due date</SubmitButton>
    </form>
  );
}
