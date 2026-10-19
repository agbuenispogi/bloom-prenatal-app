"use client";

import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import { buildDaySchedule, type EngineInput } from "@/lib/engine";
import { applyAction, checkAction, inverseOf, labelOf } from "@/lib/view/apply";
import { toHomeView, type DayAction, type DayActionResult } from "@/lib/view/home";

export type ViewOpts = Parameters<typeof toHomeView>[2];
export type Toast = { id: number; label: string; undo: DayAction[] | null; error: boolean };
export type Save = (actions: DayAction[]) => Promise<DayActionResult>;

const TOAST_MS = 7000;

// Today's page state. A tap changes the screen at once (optimistic) and saves in the background; the saved day
// from the server replaces the optimistic one when it arrives. Every tap offers Undo for a few seconds.
export function useDay(base: EngineInput, opts: ViewOpts, save: Save) {
  // "Now" runs on from the server's clock (or the demo scenario's), not the phone's, which may be off.
  const anchor = useRef({ base: base.now.getTime(), at: 0 });
  useEffect(() => {
    anchor.current = { base: base.now.getTime(), at: performance.now() };
  }, [base]);
  const clock = useCallback(() => {
    const { base: b, at } = anchor.current;
    return new Date(at ? b + (performance.now() - at) : b);
  }, []);

  const [input, addOptimistic] = useOptimistic(base, (cur: EngineInput, actions: DayAction[]) => {
    const now = clock();
    return actions.reduce((acc, a) => applyAction(acc, a, now), cur);
  });
  const view = useMemo(() => toHomeView(input, buildDaySchedule(input), opts), [input, opts]);

  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Latest shown day, so Undo is computed against what she actually saw when she tapped.
  const shown = useRef(input);
  useEffect(() => {
    shown.current = input;
  }, [input]);

  const commit = useCallback(
    (actions: DayAction[], label: string | null, undo: DayAction[] | null) => {
      startTransition(async () => {
        addOptimistic(actions);
        if (label) setToast({ id: ++seq.current, label, undo, error: false });
        const r = await save(actions).catch((): DayActionResult => ({ ok: false, error: "That didn't save. Check your connection and try again." }));
        if (!r.ok) setToast({ id: ++seq.current, label: r.error, undo: null, error: true });
      });
    },
    [addOptimistic, save],
  );

  const run = useCallback(
    async (a: DayAction): Promise<DayActionResult> => {
      const now = clock();
      const before = shown.current;
      const problem = checkAction(before, a, now);
      if (problem) return { ok: false, error: problem };
      commit([a], labelOf(before, a), inverseOf(before, a, now));
      return { ok: true };
    },
    [commit, clock],
  );

  const undo = useCallback(() => {
    if (!toast?.undo?.length) return;
    const actions = toast.undo;
    setToast(null);
    commit(actions, null, null);
  }, [toast, commit]);

  return { view, run, toast, undo, dismiss: () => setToast(null) };
}
