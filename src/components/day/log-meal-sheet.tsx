"use client";

import { Check, Plus, Utensils, X } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useId, useRef, useState } from "react";
import type { MainMeal } from "@/lib/engine";
import type { DayAction, DayActionResult, HomeView } from "@/lib/view/home";

type MealChoice = MainMeal | "snack";
type When = "now" | "soon" | "earlier";

const LABEL: Record<MealChoice, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function Choice({ name, value, checked, onChange, disabled, children }: { name: string; value: string; checked: boolean; onChange: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label
      className={`relative flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-[8px] border px-3 text-center text-base transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ribbon ${checked ? "cloth border-cloth-rule font-semibold text-cloth-ink" : "border-rule text-ink"} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      {children}
    </label>
  );
}

// A bottom sheet (native <dialog>) for logging a meal or snack: now, in a little while, or earlier today.
export function LogMealSheet({ view, tz, run }: { view: HomeView; tz: string; run: (a: DayAction) => Promise<DayActionResult> }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const firstOpen = view.meals.find((m) => !m.eaten && !m.skipped)?.meal ?? "snack";
  const [meal, setMeal] = useState<MealChoice>(firstOpen);
  const [when, setWhen] = useState<When>("now");
  const [time, setTime] = useState(() => formatInTimeZone(new Date(view.now), tz, "HH:mm"));
  const [error, setError] = useState<string | null>(null);
  const pending = false;

  const info = meal === "snack" ? null : view.meals.find((m) => m.meal === meal)!;
  const canSoon = Boolean(info && !info.eaten);
  const effectiveWhen: When = when === "soon" && !canSoon ? "now" : when;

  useEffect(() => {
    const d = dialog.current;
    const onClose = () => setError(null);
    d?.addEventListener("close", onClose);
    return () => d?.removeEventListener("close", onClose);
  }, []);

  const open = () => {
    setMeal(firstOpen);
    setWhen("now");
    setTime(formatInTimeZone(new Date(view.now), tz, "HH:mm"));
    dialog.current?.showModal();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let action: DayAction;
    if (meal === "snack") action = { type: "snack", time: effectiveWhen === "earlier" ? time : undefined };
    else if (effectiveWhen === "soon") action = { type: "intend", meal };
    else action = { type: "eat", meal, time: effectiveWhen === "earlier" ? time : undefined };
    void run(action).then((r) => {
      if (!r.ok) setError(r.error);
      else dialog.current?.close();
    });
  };

  if (!view.canLog) return null;

  return (
    <>
      <button type="button" onClick={open} className="-mr-2 flex min-h-12 items-center gap-1.5 rounded-[8px] px-2 text-base font-medium text-ink">
        <Plus aria-hidden className="size-5" /> Log a meal
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-0 mt-auto w-full max-w-none rounded-t-[16px] border-t border-rule bg-paper p-0 text-ink backdrop:bg-[rgb(28_23_25/0.45)] sm:m-auto sm:max-w-md sm:rounded-[16px] sm:border"
      >
        <form onSubmit={submit} className="settle-in flex flex-col gap-6 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="font-serif text-2xl">
              Log a meal
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="-mr-2 flex size-12 items-center justify-center rounded-full text-ink-soft">
              <X aria-hidden className="size-6" />
            </button>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base text-ink-soft">Which meal?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => {
                const st = m === "snack" ? null : view.meals.find((x) => x.meal === m)!;
                return (
                  <Choice key={m} name="meal" value={m} checked={meal === m} onChange={() => setMeal(m)} disabled={Boolean(st?.eaten)}>
                    {st?.eaten ? (
                      <span className="flex flex-col items-center leading-tight">
                        <span className="flex items-center gap-1">
                          <Check aria-hidden className="size-4" strokeWidth={2.6} /> {LABEL[m]}
                        </span>
                        <span className="tnum text-[0.8125rem] text-ink-soft">Logged {st.eatenLabel}</span>
                      </span>
                    ) : (
                      LABEL[m]
                    )}
                  </Choice>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base text-ink-soft">When?</legend>
            <div className="flex gap-2">
              <Choice name="when" value="now" checked={effectiveWhen === "now"} onChange={() => setWhen("now")}>
                Now
              </Choice>
              {meal !== "snack" ? (
                <Choice name="when" value="soon" checked={effectiveWhen === "soon"} onChange={() => setWhen("soon")} disabled={!canSoon}>
                  In ~{info?.leadMin ?? 30} min
                </Choice>
              ) : null}
              <Choice name="when" value="earlier" checked={effectiveWhen === "earlier"} onChange={() => setWhen("earlier")}>
                Earlier
              </Choice>
            </div>
            {effectiveWhen === "soon" && info?.preMealOpen ? (
              <p className="text-[0.9375rem] text-ink-soft">This also logs your Gaviscon now, and Bloom will nudge you when it&apos;s time to eat.</p>
            ) : null}
            {effectiveWhen === "earlier" ? (
              <label className="mt-1 flex flex-col gap-1.5 text-base text-ink-soft">
                What time?
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="tnum min-h-12 rounded-[12px] border border-rule bg-paper px-4 text-base text-ink"
                />
              </label>
            ) : null}
          </fieldset>

          {error ? (
            <p role="alert" className="text-base text-ribbon">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[10px] bg-ribbon-fill px-6 text-[1.1875rem] font-semibold text-ribbon-fill-ink transition-[background-color,transform] duration-150 active:scale-[0.985] active:bg-ribbon-press disabled:opacity-70"
          >
            <Utensils aria-hidden className="size-6" />
            {effectiveWhen === "soon" ? `Eating ${LABEL[meal].toLowerCase()} soon` : `Log ${LABEL[meal].toLowerCase()}`}
          </button>
        </form>
      </dialog>
    </>
  );
}
