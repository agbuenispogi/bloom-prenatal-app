"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { Toggle } from "./settings-page";
import type { FormAction } from "./types";

export function PregnancyForm({
  dueDate,
  weekLabel,
  save,
  viewer = "patient",
  snowflake,
}: {
  dueDate: string | null;
  weekLabel: string | null;
  save: FormAction;
  viewer?: "patient" | "caregiver";
  snowflake?: {
    url: string;
    siteDueDate: string | null;
    shareStreak: boolean;
    saveShare: FormAction;
  };
}) {
  const [state, action] = useActionState(save, {});
  const [shareState, shareAction] = useActionState(
    snowflake?.saveShare ?? (async () => ({})),
    {},
  );
  return (
    <div className="flex flex-col gap-10">
      <form action={action} className="flex flex-col gap-4">
        {weekLabel ? <p className="font-serif text-2xl">{weekLabel}</p> : null}
        <Field
          label="Due date"
          name="dueDate"
          type="date"
          defaultValue={dueDate ?? ""}
          required={false}
          hint={`From ${viewer === "patient" ? "your" : "her"} OB. Bloom shows the week on each page and in the morning summary.`}
        />
        <FormMessage state={state} />
        {!dueDate && snowflake?.siteDueDate ? (
          <p className="text-[0.875rem] text-ink-soft">
            Using Baby Snowflake&apos;s due date ({snowflake.siteDueDate}) until
            you set one here.
          </p>
        ) : null}
        <SubmitButton>Save due date</SubmitButton>
      </form>

      {snowflake ? (
        <section aria-labelledby="snowflake" className="flex flex-col gap-3">
          <h2 id="snowflake" className="font-serif text-2xl">
            Baby Snowflake
          </h2>
          <p className="text-[0.9375rem] text-pretty text-ink-soft">
            Today shows the latest update from{" "}
            <a
              href={snowflake.url}
              target="_blank"
              rel="noopener"
              className="text-ink underline"
            >
              your Baby Snowflake page
            </a>
            .
          </p>
          {viewer === "patient" ? (
            <form action={shareAction} className="flex flex-col gap-2">
              <Toggle
                name="shareStreak"
                label="Show my caring streak on Baby Snowflake"
                defaultChecked={snowflake.shareStreak}
                hint="Public, for family: only a line like “Mama has cared for Snowflake 5 days in a row”. Never medicine names, doses, times or missed doses."
              />
              <FormMessage state={shareState} />
              <SubmitButton variant="quiet">Save</SubmitButton>
            </form>
          ) : (
            <p className="text-[0.9375rem] text-ink-soft">
              {snowflake.shareStreak
                ? "She shares a gentle caring streak on Baby Snowflake."
                : "She hasn't chosen to share anything from Bloom on Baby Snowflake."}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
