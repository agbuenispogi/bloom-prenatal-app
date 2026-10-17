"use client";

import { X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { FormAction, OverrideData, ShiftDay } from "./types";
import { Toggle } from "./settings-page";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first, as she reads her week
const timeInput = "tnum min-h-12 w-full min-w-0 rounded-[12px] border border-rule bg-paper px-3 text-base text-ink";
const show = (t: string | null) => (t === "24:00" ? "00:00" : (t ?? ""));

function DayRow({ day }: { day: ShiftDay }) {
  const [off, setOff] = useState(!day.start);
  const name = DAYS[day.weekday]!;
  return (
    <fieldset className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-rule/70 py-3">
      <legend className="sr-only">{name}</legend>
      <div className="col-span-2 flex items-center justify-between">
        <p className="font-serif text-lg">{name}</p>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-[0.9375rem] text-ink-soft">
          <input type="checkbox" name={`off.${day.weekday}`} checked={off} onChange={(e) => setOff(e.target.checked)} className="size-5 accent-[var(--ribbon-fill)]" />
          Day off
        </label>
      </div>
      {off ? null : (
        <>
          <label className="flex min-w-0 flex-col gap-1 text-[0.875rem] text-ink-soft">
            Starts
            <input type="time" name={`start.${day.weekday}`} defaultValue={show(day.start) || "14:00"} required className={timeInput} aria-label={`${name} shift starts`} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.875rem] text-ink-soft">
            Ends
            <input type="time" name={`end.${day.weekday}`} defaultValue={show(day.end) || "00:00"} required className={timeInput} aria-label={`${name} shift ends`} />
          </label>
        </>
      )}
    </fieldset>
  );
}

export function ShiftsForm({
  weekly,
  overrides,
  saveWeekly,
  addOverride,
  removeOverride,
}: {
  weekly: ShiftDay[];
  overrides: OverrideData[];
  saveWeekly: FormAction;
  addOverride: FormAction;
  removeOverride: (id: string) => Promise<void>;
}) {
  const [weekState, weekAction] = useActionState(saveWeekly, {});
  const [overrideState, overrideAction] = useActionState(addOverride, {});
  const [offDay, setOffDay] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-10">
      <form action={weekAction} className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Every week</h2>
        <p className="-mt-2 text-[0.9375rem] text-ink-soft">Bloom suggests meal times around these: dinner before a 7 PM start, or on a break during a long shift. A shift ending at 12:00 AM ends at midnight.</p>
        <div className="border-t border-rule/70">
          {ORDER.map((w) => (
            <DayRow key={w} day={weekly.find((d) => d.weekday === w) ?? { weekday: w, start: null, end: null }} />
          ))}
        </div>
        <FormMessage state={weekState} />
        <SubmitButton>Save shifts</SubmitButton>
      </form>

      <section aria-labelledby="overrides" className="flex flex-col gap-4">
        <h2 id="overrides" className="font-serif text-2xl">
          One-off changes
        </h2>
        {overrides.length ? (
          <ul className="border-t border-rule/70">
            {overrides.map((o) => (
              <li key={o.id} className="flex min-h-14 items-center gap-3 border-b border-rule/70 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-lg">{o.label}</span>
                  <span className="tnum block text-[0.9375rem] text-ink-soft">
                    {o.isOff ? "Day off" : `${show(o.start)}–${show(o.end)}`}
                    {o.note ? ` · ${o.note}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => removeOverride(o.id))}
                  aria-label={`Remove the change on ${o.label}`}
                  className="flex size-12 items-center justify-center rounded-full text-ink-soft"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.9375rem] text-ink-soft">No changes coming up. Add one for a meeting day, a leave, or an extra shift.</p>
        )}
        <form action={overrideAction} className="flex flex-col gap-3 rounded-[16px] border border-rule p-4">
          <Field label="Date" name="date" type="date" />
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base">
            <input type="checkbox" name="off" checked={offDay} onChange={(e) => setOffDay(e.target.checked)} className="size-6 accent-[var(--ribbon-fill)]" />
            Day off
          </label>
          {offDay ? null : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts" name="start" type="time" defaultValue="14:00" />
              <Field label="Ends" name="end" type="time" defaultValue="00:00" />
            </div>
          )}
          <Field label="Note (optional)" name="note" required={false} />
          <FormMessage state={overrideState} />
          <SubmitButton variant="quiet">Add change</SubmitButton>
        </form>
      </section>
    </div>
  );
}

export { Toggle };
