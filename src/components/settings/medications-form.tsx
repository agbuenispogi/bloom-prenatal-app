"use client";

import { ChevronDown } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { FormAction, MedData, RuleData } from "./types";
import { voice, type Viewer } from "./voice";
import { TabPicker, Toggle } from "./settings-page";

const RULE_TYPES: { value: RuleData["ruleType"]; label: string }[] = [
  { value: "before_meal", label: "Before a meal" },
  { value: "after_meal", label: "After a meal" },
  { value: "fixed_time", label: "At a set time" },
  { value: "bedtime", label: "At bedtime" },
  { value: "daily_count", label: "Any time, count per day" },
];
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

const selectClass = "min-h-12 w-full rounded-[12px] border border-rule bg-paper px-3 text-base text-ink";

export function describeRule(r: RuleData): string {
  switch (r.ruleType) {
    case "before_meal":
      return `${r.minutes} min before ${r.anchor}`;
    case "after_meal":
      return `${r.minutes} min after ${r.anchor}`;
    case "fixed_time":
      return `at ${r.fixedTime}`;
    case "bedtime":
      return "at bedtime";
    case "daily_count":
      return `${r.minPerDay === r.maxPerDay ? r.maxPerDay : `${r.minPerDay}–${r.maxPerDay}`} a day, reminder by ${r.deadline ?? "21:00"}`;
  }
}

// The timing fields for one rule. `prefix` namespaces the inputs (rule.<id>.<field>).
function RuleFields({ rule, prefix }: { rule: RuleData; prefix: string }) {
  const [type, setType] = useState(rule.ruleType);
  const f = (k: string) => `${prefix}.${k}`;
  return (
    <div className="flex flex-col gap-3">
      <Field label="Shown on the page as" name={f("label")} defaultValue={rule.label} hint={rule.label ? undefined : "e.g. before lunch"} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={f("ruleType")} className="text-[0.9375rem] text-ink-soft">
          When
        </label>
        <select id={f("ruleType")} name={f("ruleType")} value={type} onChange={(e) => setType(e.target.value as RuleData["ruleType"])} className={selectClass}>
          {RULE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {type === "before_meal" || type === "after_meal" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutes" name={f("minutes")} type="number" inputMode="numeric" min={0} max={720} defaultValue={rule.minutes || 30} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={f("anchor")} className="text-[0.9375rem] text-ink-soft">
              Meal
            </label>
            <select id={f("anchor")} name={f("anchor")} defaultValue={rule.anchor && rule.anchor !== "bedtime" ? rule.anchor : "lunch"} className={selectClass}>
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      {type === "fixed_time" ? <Field label="Time" name={f("fixedTime")} type="time" defaultValue={rule.fixedTime ?? "17:00"} /> : null}
      {type === "daily_count" ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="At least" name={f("minPerDay")} type="number" inputMode="numeric" min={0} max={10} defaultValue={rule.minPerDay} />
          <Field label="At most" name={f("maxPerDay")} type="number" inputMode="numeric" min={1} max={10} defaultValue={rule.maxPerDay} />
          <Field label="Remind by" name={f("deadline")} type="time" defaultValue={rule.deadline ?? "21:00"} />
        </div>
      ) : null}
    </div>
  );
}

function MedicationEditor({ med, action, viewer }: { med: MedData; action: FormAction; viewer: Viewer }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <details className="group border-b border-rule/70">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="h-6 w-2.5 shrink-0 rounded-[3px]" style={{ background: `var(--tab-${med.color})` }} />
        <span className="min-w-0 flex-1">
          <span className={`block font-serif text-lg ${med.active ? "" : "text-ink-soft line-through"}`}>{med.name}</span>
          <span className="block text-[0.9375rem] text-ink-soft">{med.rules.map(describeRule).join(" · ")}</span>
        </span>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <form action={formAction} className="flex flex-col gap-4 pb-6">
        <input type="hidden" name="id" value={med.id} />
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <Field label="Name" name="name" defaultValue={med.name} />
          <Field label="Dose" name="doseLabel" defaultValue={med.doseLabel} required={false} />
        </div>
        <TabPicker name="color" value={med.color} />
        <Toggle name="active" label={`In ${voice(viewer).your} regimen`} defaultChecked={med.active} hint="Turn off to pause it without losing its history." />
        {med.rules.map((r, i) => (
          <fieldset key={r.id} className="flex flex-col gap-3 border-t border-margin pt-4">
            <legend className="sr-only">Timing {i + 1}</legend>
            <input type="hidden" name="ruleId" value={r.id} />
            <RuleFields rule={r} prefix={`rule.${r.id}`} />
            <Toggle name={`rule.${r.id}.active`} label="Use this timing" defaultChecked={r.active} />
          </fieldset>
        ))}
        <FormMessage state={state} />
        <SubmitButton>Save {med.name}</SubmitButton>
      </form>
    </details>
  );
}

const NEW_ID = "00000000-0000-4000-8000-000000000000";

function AddMedication({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, {});
  const blank: RuleData = { id: NEW_ID, label: "", ruleType: "after_meal", anchor: "dinner", minutes: 30, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true };
  return (
    <details className="group mt-8 rounded-[16px] border border-rule px-4">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-serif text-lg [&::-webkit-details-marker]:hidden">
        Add a medicine
        <ChevronDown aria-hidden className="size-5 text-ink-soft transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <form action={formAction} className="flex flex-col gap-4 pb-5">
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <Field label="Name" name="name" />
          <Field label="Dose" name="doseLabel" required={false} />
        </div>
        <TabPicker name="color" value="oat" />
        <input type="hidden" name={`rule.${NEW_ID}.active`} value="on" />
        <RuleFields rule={blank} prefix={`rule.${NEW_ID}`} />
        <FormMessage state={state} />
        <SubmitButton>Add medicine</SubmitButton>
      </form>
    </details>
  );
}

export function MedicationsForm({ meds, save, add, viewer = "patient" }: { meds: MedData[]; save: FormAction; add: FormAction; viewer?: Viewer }) {
  return (
    <div>
      <div className="border-t border-rule/70">
        {meds.map((m) => (
          <MedicationEditor key={m.id} med={m} action={save} viewer={viewer} />
        ))}
      </div>
      <AddMedication action={add} />
    </div>
  );
}
