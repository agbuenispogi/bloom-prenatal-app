"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { DayAction, DayActionResult, ServingView } from "@/lib/view/home";
import { MedTab } from "./marks";

// Any-time items (Anmum Materna): a count, a gentle note after the deadline, one tap to add a serving.
export function ServingsStrip({ servings, canLog, run }: { servings: ServingView[]; canLog: boolean; run: (a: DayAction) => Promise<DayActionResult> }) {
  const [error, setError] = useState<string | null>(null);
  if (servings.length === 0) return null;
  return (
    <section aria-label="Any time today" className="flex flex-col gap-3">
      {servings.map((s) => {
        const range = s.min === s.max ? `${s.max}` : `${s.min}–${s.max}`;
        const note = s.skipped
          ? "Skipped today"
          : s.needsReminder
            ? "Not yet today. A glass before bed?"
            : s.taken >= s.max
              ? "All done for today"
              : `By ${s.deadlineLabel}`;
        return (
          <div key={s.ruleId} className="flex items-center gap-3 rounded-2xl border border-rule px-4 py-3">
            <MedTab tab={s.tab} />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{s.name}</p>
              <p className={`tnum text-[0.9375rem] ${s.needsReminder ? "text-ribbon" : "text-ink-soft"}`}>
                {s.taken} of {range} today <span className="whitespace-nowrap">· {note}</span>
              </p>
            </div>
            {canLog && s.canTakeMore ? (
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  const r = await run({ type: "serving", ruleId: s.ruleId });
                  if (!r.ok) setError(r.error);
                }}
                className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-rule px-3.5 text-base font-medium whitespace-nowrap disabled:opacity-60"
              >
                <Plus aria-hidden className="size-5" /> Had {s.doseLabel.startsWith("1 ") ? `a ${s.doseLabel.slice(2)}` : "one"}
              </button>
            ) : null}
          </div>
        );
      })}
      {error ? <p role="alert" className="text-base text-ribbon">{error}</p> : null}
    </section>
  );
}
