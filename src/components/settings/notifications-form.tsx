"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { FormAction, ReminderTimes } from "./types";
import { Toggle } from "./settings-page";

export function NotificationsForm({
  role,
  caregiverName,
  my,
  times,
  caregiverCanLog,
  saveMine,
  saveTimes,
  saveCaregiver,
  installHref = "/onboarding",
  emailEnabled = true,
  calendarUrl = null,
}: {
  role: "patient" | "caregiver";
  caregiverName: string | null;
  my: { push: boolean; email: boolean };
  times: ReminderTimes;
  caregiverCanLog: boolean;
  saveMine: FormAction;
  saveTimes: FormAction;
  saveCaregiver: FormAction;
  installHref?: string;
  emailEnabled?: boolean;
  calendarUrl?: string | null;
}) {
  const [mineState, mineAction] = useActionState(saveMine, {});
  const [timesState, timesAction] = useActionState(saveTimes, {});
  const [cgState, cgAction] = useActionState(saveCaregiver, {});
  return (
    <div className="flex flex-col gap-10">
      <form action={mineAction} className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl">How you hear from Bloom</h2>
        <Toggle name="push" label="Alarms on this phone" defaultChecked={my.push} hint="A push alarm for every dose. Tap it to open Bloom (Android and computers also show Taken and Snooze)." />
        {emailEnabled ? (
          <Toggle name="email" label="Emails" defaultChecked={my.email} hint={role === "caregiver" ? "Due reminders, the 30-minute heads-up, and the morning summary." : "Due reminders and the morning summary."} />
        ) : (
          <>
            <input type="hidden" name="email" value={my.email ? "on" : ""} />
            <p className="py-1 text-[0.875rem] text-ink-soft">Email is off for now. Everything comes to this phone instead, including the morning summary.</p>
          </>
        )}
        <Link href={installHref} className="flex min-h-12 items-center text-base text-ink underline">
          Set up alarms on this phone
        </Link>
        <FormMessage state={mineState} />
        <SubmitButton variant="quiet">Save</SubmitButton>
      </form>

      {calendarUrl ? (
        <section aria-labelledby="calendar" className="flex flex-col gap-2">
          <h2 id="calendar" className="font-serif text-2xl">
            Alarms in your Calendar
          </h2>
          <p className="text-[0.9375rem] text-pretty text-ink-soft">
            Adds a private &ldquo;Bloom&rdquo; calendar to this phone. Its own alerts ring for each upcoming dose, even if a notification is missed. Taken doses drop off by themselves.
          </p>
          <a href={calendarUrl} className="flex min-h-12 items-center justify-center rounded-[8px] border border-rule px-5 text-base font-medium text-ink">
            Add to my phone&apos;s Calendar
          </a>
          <p className="text-[0.875rem] text-pretty text-ink-soft">On iPhone: tap Subscribe. To keep it fresh, set Settings → Calendar → Accounts → Fetch New Data to every 15 minutes.</p>
        </section>
      ) : null}

      <form action={timesAction} className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Reminder timing</h2>
        <p className="-mt-2 text-[0.9375rem] text-ink-soft">Shared by both of you.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Remind again after (min)" name="nagAfter" type="number" inputMode="numeric" min={5} max={120} defaultValue={times.nagAfter} />
          <Field label={`Heads-up to ${caregiverName ?? "your caregiver"} after (min)`} name="escalateAfter" type="number" inputMode="numeric" min={10} max={240} defaultValue={times.escalateAfter} />
          <Field label="Anmum reminder at" name="anmumDeadline" type="time" defaultValue={times.anmumDeadline} />
          <Field label="Morning summary at" name="summaryTime" type="time" defaultValue={times.summaryTime} />
          <Field label="Usual bedtime" name="bedtimeDefault" type="time" defaultValue={times.bedtimeDefault} hint={`An estimate until ${role === "patient" ? "you tap" : "she taps"} Going to bed.`} />
          <Field label="Iron spacing note (min)" name="ironSpacing" type="number" inputMode="numeric" min={0} max={360} defaultValue={times.ironSpacing} hint="0 turns the note off." />
        </div>
        <FormMessage state={timesState} />
        <SubmitButton variant="quiet">Save timing</SubmitButton>
      </form>

      {role === "patient" ? (
        <form action={cgAction} className="flex flex-col gap-2">
          <h2 className="font-serif text-2xl">Your caregiver</h2>
          <Toggle
            name="caregiverCanLog"
            label={`Let ${caregiverName ?? "your caregiver"} log doses for me`}
            defaultChecked={caregiverCanLog}
            hint={`Off by default. ${caregiverName ?? "Your caregiver"} always sees your page and gets the same reminders.`}
          />
          <FormMessage state={cgState} />
          <SubmitButton variant="quiet">Save</SubmitButton>
        </form>
      ) : (
        <p className="text-[0.9375rem] text-ink-soft">{caregiverCanLog ? "She has let you log doses for her." : "Her page is read-only for you. She can let you log doses in her settings."}</p>
      )}
    </div>
  );
}
