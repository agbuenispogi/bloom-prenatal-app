"use client";

import { AlarmClock, Check, Moon, Utensils } from "lucide-react";
import { useId, useState, useTransition } from "react";
import type { DayAction, DayActionResult, NextUpView } from "@/lib/view/home";
import { Countdown } from "./countdown";
import { InkCheck, MedTab } from "./marks";

type Panel = "none" | "snooze" | "skip" | "time";
type RunAction = (action: DayAction) => Promise<DayActionResult>;

export const INK_MS = 750;

function vibrate() {
  try {
    navigator.vibrate?.(12);
  } catch {
    // Not supported (iOS Safari): the inked check carries the feedback.
  }
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[10px] bg-ribbon-fill px-6 text-[1.1875rem] font-semibold text-ribbon-fill-ink transition-[background-color,transform] duration-150 active:scale-[0.985] active:bg-ribbon-press disabled:opacity-70"
    >
      {children}
    </button>
  );
}

function QuietButton({ children, onClick, pressed, disabled }: { children: React.ReactNode; onClick: () => void; pressed?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] border border-cloth-rule bg-cloth/40 px-4 text-base font-medium text-cloth-ink transition-colors duration-150 aria-pressed:bg-cloth-ink/10 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

// `inked` / `onInk` live in the parent so the inked check survives the new view arriving mid-animation.
export function NextUpCard({
  view,
  serverNow,
  canLog,
  role,
  run,
  inked,
  onInk,
}: {
  view: NextUpView;
  serverNow: string;
  canLog: boolean;
  role: "patient" | "caregiver";
  run: RunAction;
  inked: string | null;
  onInk: (label: string | null) => void;
}) {
  const headingId = useId();
  const [panel, setPanel] = useState<Panel>("none");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  // Every action: optional ink moment, then the server (or demo) call. The card re-keys on the new next item.
  const act = (action: DayAction, inkLabel?: string) => {
    setError(null);
    if (inkLabel) {
      vibrate();
      onInk(inkLabel);
    }
    startTransition(async () => {
      const result = await run(action);
      if (!result.ok) {
        onInk(null);
        setError(result.error);
        return;
      }
      setPanel("none");
      setReason("");
    });
  };

  const ref = view.ruleId && view.occurrence ? { ruleId: view.ruleId, occurrence: view.occurrence } : null;
  const showBigTime = view.at && view.timeLabel && (view.kind === "take" || view.kind === "eat" || view.kind === "bedtime" || (view.kind === "prep_meal" && new Date(view.at) > new Date(serverNow)));

  let title = view.title;
  let sub: string | null = view.detail;
  if (view.kind === "take" && view.medName) {
    title = view.medName;
    sub = [view.why, view.doseLabel].filter(Boolean).join(" · ");
  } else if (view.kind === "prep_meal") {
    sub = view.hasPreMealDose ? `Take ${view.medName} now, then eat in ${view.leadMin} min` : "Log it when you start eating";
  } else if (view.kind === "bedtime") {
    sub = `${view.medName} at bedtime · ${view.doseLabel}`;
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={pending}
      className="cloth settle-in relative flex min-h-[min(55svh,32rem)] flex-col overflow-hidden rounded-[6px] py-6 pr-6 pl-9 text-cloth-ink ring-1 ring-cloth-rule md:min-h-0"
    >
      {/* The cloth spine of the journal, folded over the entry's left edge. */}
      <span aria-hidden className="spine absolute inset-y-0 left-0 w-4" />
      <h2 className="sr-only">Next up</h2>

      <div className="flex items-start gap-3">
        {view.kind !== "all_done" && view.kind !== "eat" ? <MedTab tab={view.tab} className="mt-2" /> : null}
        <div className="min-w-0">
          <p id={headingId} className="font-serif text-[2.125rem] leading-[1.1] tracking-[-0.01em] text-balance">
            {title}
          </p>
          {sub ? <p className="mt-1.5 text-[1.0625rem] text-pretty text-cloth-soft">{sub}</p> : null}
        </div>
      </div>

      {showBigTime ? (
        <div className="mt-6">
          <p className="font-serif text-[4.25rem] leading-none tracking-[-0.02em]">
            {view.timeLabel!.replace(/\s?[AP]M$/, "")}
            <span className="ml-2 text-[1.75rem] tracking-normal">{view.timeLabel!.slice(-2)}</span>
          </p>
          <p className={`mt-2 text-lg ${view.overdue ? "text-cloth-ink" : "text-cloth-soft"}`}>
            {view.estimated ? `${view.kind === "prep_meal" ? "Suggested" : "About this time"} · ` : null}
            <Countdown at={view.at!} serverNow={serverNow} />
          </p>
        </div>
      ) : null}

      {view.overdue ? <p className="mt-2 text-base text-cloth-soft">Whenever you&apos;re ready. Late is still good.</p> : null}

      {inked ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-cloth/85" role="status">
          <InkCheck className="h-24 w-32 text-ribbon" />
          <p className="settle-in font-serif text-2xl">{inked}</p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-paper/70 px-4 py-3 text-base text-ink">
          {error}
        </p>
      ) : null}

      {!canLog ? (
        view.kind === "all_done" ? null : (
          <p className="mt-auto border-t border-cloth-rule pt-4 text-base text-cloth-soft">
            {role === "caregiver" ? "She logs this one. You'll get the same reminder." : "Logging is turned off for this account."}
          </p>
        )
      ) : (
        <div className="mt-auto flex flex-col gap-3 pt-7">
          {view.kind === "take" && ref ? (
            <>
              <PrimaryButton onClick={() => act({ type: "take", ...ref }, `${view.medName} logged`)} disabled={pending}>
                <Check aria-hidden className="size-6" strokeWidth={2.5} />
                Done
              </PrimaryButton>
              {panel === "none" ? (
                <div className="flex gap-3">
                  <QuietButton onClick={() => setPanel("snooze")} disabled={pending}>
                    <AlarmClock aria-hidden className="size-5" /> Snooze
                  </QuietButton>
                  <QuietButton onClick={() => setPanel("skip")} disabled={pending}>
                    Skip
                  </QuietButton>
                </div>
              ) : null}
              {panel === "snooze" ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-base text-cloth-soft">Remind me again in</legend>
                  <div className="flex gap-3">
                    {([10, 20, 30] as const).map((m) => (
                      <QuietButton key={m} onClick={() => act({ type: "snooze", ...ref, minutes: m })} disabled={pending}>
                        <span className="tnum">{m} min</span>
                      </QuietButton>
                    ))}
                  </div>
                  <button type="button" onClick={() => setPanel("none")} className="min-h-12 text-base text-cloth-soft underline">
                    Never mind
                  </button>
                </fieldset>
              ) : null}
              {panel === "skip" ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act({ type: "skip", ...ref, reason: reason || undefined });
                  }}
                >
                  <label className="flex flex-col gap-1.5 text-base text-cloth-soft">
                    Reason (optional)
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. felt nauseous"
                      className="min-h-12 rounded-xl border border-cloth-rule bg-paper/60 px-4 text-base text-ink placeholder:text-ink-soft"
                    />
                  </label>
                  <div className="flex gap-3">
                    <QuietButton onClick={() => setPanel("none")}>Keep it</QuietButton>
                    <button type="submit" disabled={pending} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-cloth-ink px-4 text-base font-semibold text-cloth">
                      Skip this dose
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          ) : null}

          {view.kind === "prep_meal" && view.meal ? (
            <>
              {view.hasPreMealDose ? (
                <PrimaryButton onClick={() => act({ type: "intend", meal: view.meal! }, `${view.medName} logged`)} disabled={pending}>
                  <Utensils aria-hidden className="size-5" />
                  I&apos;m eating in ~{view.leadMin} min
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={() => act({ type: "eat", meal: view.meal! }, `${capitalize(view.meal!)} logged`)} disabled={pending}>
                  <Utensils aria-hidden className="size-5" />
                  Eating now
                </PrimaryButton>
              )}
              {panel === "time" ? (
                <fieldset>
                  <legend className="mb-2 text-base text-cloth-soft">I&apos;ll eat in</legend>
                  <div className="flex gap-3">
                    {[15, 45, 60].map((m) => (
                      <QuietButton key={m} onClick={() => act({ type: "intend", meal: view.meal!, minutes: m }, view.hasPreMealDose ? `${view.medName} logged` : undefined)} disabled={pending}>
                        <span className="tnum">{m} min</span>
                      </QuietButton>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <div className="flex gap-3">
                  {view.hasPreMealDose ? <QuietButton onClick={() => setPanel("time")}>Other time</QuietButton> : null}
                  {view.canSkip ? (
                    <QuietButton onClick={() => act({ type: "skipBreakfast" })} disabled={pending}>
                      Skip {view.meal}
                    </QuietButton>
                  ) : null}
                </div>
              )}
            </>
          ) : null}

          {view.kind === "eat" && view.meal ? (
            <PrimaryButton onClick={() => act({ type: "eat", meal: view.meal! }, `Enjoy your ${view.meal}`)} disabled={pending}>
              <Utensils aria-hidden className="size-5" />
              Eating now
            </PrimaryButton>
          ) : null}

          {view.kind === "bedtime" ? (
            <>
              <PrimaryButton onClick={() => act({ type: "bed" })} disabled={pending}>
                <Moon aria-hidden className="size-5" />
                Going to bed
              </PrimaryButton>
              <QuietButton onClick={() => act({ type: "snack" })} disabled={pending}>
                Having a snack first
              </QuietButton>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
