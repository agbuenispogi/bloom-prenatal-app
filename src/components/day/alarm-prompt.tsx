"use client";

import { AlarmClock, Check } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { DayAction, DayActionResult, NextUpView } from "@/lib/view/home";
import { MedTab } from "./marks";

// A soft two-note chime, synthesized (no audio file). Browsers may block it until she has tapped the page once.
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes: [number, number][] = [
      [659.25, 0],
      [987.77, 0.28],
    ];
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + at;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.7);
    }
    window.setTimeout(() => ctx.close().catch(() => {}), 2500);
  } catch {
    // No audio available: the prompt itself is the alarm.
  }
}

// Full-screen in-app alarm when a timed dose comes due while Bloom is open.
export function AlarmPrompt({ view, run, onClose }: { view: NextUpView; run: (a: DayAction) => Promise<DayActionResult>; onClose: () => void }) {
  const done = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chime();
    done.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!view.ruleId || !view.occurrence) return null;
  const ref = { ruleId: view.ruleId, occurrence: view.occurrence };
  const act = (a: DayAction) =>
    start(async () => {
      const r = await run(a);
      if (r.ok) onClose();
      else setError(r.error);
    });

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" aria-describedby="alarm-why" className="fixed inset-0 z-50 flex flex-col bg-paper px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="settle-in mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mt-6 flex items-start gap-3">
          <MedTab tab={view.tab} className="mt-3" />
          <h2 id="alarm-title" className="font-serif text-[2.125rem] leading-[1.1] tracking-[-0.01em] text-balance">
            {view.medName}
          </h2>
        </div>
        <p id="alarm-why" className="mt-2 text-[1.1875rem] text-ink-soft">
          {[view.why, view.doseLabel].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-8 font-serif text-[4.25rem] leading-none">
          {view.timeLabel?.replace(/\s?[AP]M$/, "")}
          <span className="ml-2 text-[1.75rem]">{view.timeLabel?.slice(-2)}</span>
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-base text-ribbon">
            {error}
          </p>
        ) : null}
        <div className="mt-auto flex flex-col gap-3">
          <button
            ref={done}
            type="button"
            disabled={pending}
            onClick={() => act({ type: "take", ...ref })}
            className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[10px] bg-ribbon-fill px-6 text-[1.1875rem] font-semibold text-ribbon-fill-ink active:bg-ribbon-press disabled:opacity-70"
          >
            <Check aria-hidden className="size-6" strokeWidth={2.5} /> Done
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => act({ type: "snooze", ...ref, minutes: 10 })}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-rule text-base font-medium text-ink"
          >
            <AlarmClock aria-hidden className="size-5" /> Snooze 10 min
          </button>
          <button type="button" onClick={onClose} className="min-h-12 text-base text-ink-soft underline">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
