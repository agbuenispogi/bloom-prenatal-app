"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Check, Clock, RotateCcw, SkipForward, Utensils, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { DayAction, DayActionResult, TimelineRow } from "@/lib/view/home";

const btn = "flex min-h-14 w-full items-center gap-3 rounded-[10px] border border-rule px-4 text-left text-[1.0625rem] text-ink transition-colors duration-150 active:bg-cloth/40";
const primary = "flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[10px] bg-ribbon-fill px-6 text-[1.1875rem] font-semibold text-ribbon-fill-ink transition-[background-color,transform] duration-150 active:scale-[0.985] active:bg-ribbon-press";

// Tap any row on Today to log it, in any order: taken now, taken earlier, skip, or put it back to "not yet".
export function ItemSheet({ row, tz, now, run, onClose }: { row: TimelineRow | null; tz: string; now: string; run: (a: DayAction) => Promise<DayActionResult>; onClose: () => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [earlier, setEarlier] = useState(false);
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (row && !d.open) {
      setEarlier(false);
      setError(null);
      setTime(formatInTimeZone(new Date(row.loggedAt ?? now), tz, "HH:mm"));
      d.showModal();
    } else if (!row && d.open) d.close();
  }, [row, now, tz]);

  useEffect(() => {
    const d = dialog.current;
    d?.addEventListener("close", onClose);
    return () => d?.removeEventListener("close", onClose);
  }, [onClose]);

  const act = async (a: DayAction) => {
    setError(null);
    const r = await run(a);
    if (r.ok) dialog.current?.close();
    else setError(r.error);
  };

  const r = row;
  const isDose = Boolean(r?.ruleId && r.occurrence);
  const isSnack = r?.meal === "snack";
  const mainMeal = r && r.meal && r.meal !== "snack" ? r.meal : null;
  const done = r?.state === "done";
  const loggedLabel = r?.loggedAt ? formatInTimeZone(new Date(r.loggedAt), tz, "h:mm a") : null;
  const verb = isDose ? "Taken" : "Eaten";

  const logAt = (t?: string): DayAction | null => {
    if (!r) return null;
    if (isDose) return { type: "take", ruleId: r.ruleId!, occurrence: r.occurrence!, time: t };
    if (mainMeal) return { type: "eat", meal: mainMeal, time: t };
    return null;
  };
  const reset: DayAction | null = !r ? null : isDose ? { type: "resetDose", ruleId: r.ruleId!, occurrence: r.occurrence! } : mainMeal ? { type: "resetMeal", meal: mainMeal } : null;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="m-0 mt-auto w-full max-w-none rounded-t-[16px] border-t border-rule bg-paper p-0 text-ink backdrop:bg-[rgb(28_23_25/0.45)] sm:m-auto sm:max-w-md sm:rounded-[16px] sm:border"
    >
      {r ? (
        <div className="settle-in flex flex-col gap-5 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="font-serif text-2xl">
                {r.title}
              </h2>
              <p className="text-base text-ink-soft">
                {[r.note, done && loggedLabel ? `${verb} at ${loggedLabel}` : r.state === "skipped" ? "Skipped" : r.timeLabel ? `${r.estimated ? "About " : ""}${r.timeLabel}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="-mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-ink-soft">
              <X aria-hidden className="size-6" />
            </button>
          </div>

          {isSnack ? (
            <button type="button" className={btn} onClick={() => r.loggedAt && act({ type: "removeSnack", eatenAt: r.loggedAt })}>
              <RotateCcw aria-hidden className="size-5 text-ink-soft" /> Remove this snack
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              {!done ? (
                <button type="button" className={primary} onClick={() => act(logAt()!)}>
                  {isDose ? <Check aria-hidden className="size-6" strokeWidth={2.6} /> : <Utensils aria-hidden className="size-6" />}
                  {isDose ? "Taken now" : "Eating now"}
                </button>
              ) : null}

              {earlier ? (
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(logAt(time)!);
                  }}
                >
                  <label className="flex flex-1 flex-col gap-1.5 text-base text-ink-soft">
                    {done ? `${verb} at` : isDose ? "Taken at" : "Ate at"}
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required autoFocus className="tnum min-h-12 rounded-[12px] border border-rule bg-paper px-4 text-base text-ink" />
                  </label>
                  <button type="submit" className="min-h-12 rounded-[10px] bg-cloth-ink px-5 text-base font-semibold text-cloth">
                    Save
                  </button>
                </form>
              ) : (
                <button type="button" className={btn} onClick={() => setEarlier(true)}>
                  <Clock aria-hidden className="size-5 text-ink-soft" />
                  {done ? "Change the time" : isDose ? "Taken earlier…" : "Ate earlier…"}
                </button>
              )}

              {isDose && !done && r.state !== "skipped" ? (
                <button type="button" className={btn} onClick={() => act({ type: "skip", ruleId: r.ruleId!, occurrence: r.occurrence! })}>
                  <SkipForward aria-hidden className="size-5 text-ink-soft" /> Skip this one
                </button>
              ) : null}
              {mainMeal === "breakfast" && !done && r.state !== "skipped" ? (
                <button type="button" className={btn} onClick={() => act({ type: "skipBreakfast" })}>
                  <SkipForward aria-hidden className="size-5 text-ink-soft" /> Skipping breakfast today
                </button>
              ) : null}
              {reset && (done || (r.state === "skipped" && !r.autoSkipped) || (mainMeal === "breakfast" && r.state === "skipped")) ? (
                <button type="button" className={btn} onClick={() => act(reset)}>
                  <RotateCcw aria-hidden className="size-5 text-ink-soft" />
                  {done ? (isDose ? "Mark as not taken" : "Mark as not eaten") : "Undo skip"}
                </button>
              ) : null}
            </div>
          )}

          {error ? (
            <p role="alert" className="text-base text-ribbon">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
