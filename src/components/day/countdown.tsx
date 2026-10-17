"use client";

import { useEffect, useState } from "react";

function phrase(at: number, now: number): string {
  const min = Math.round((at - now) / 60_000);
  if (Math.abs(min) < 1) return "now";
  const abs = Math.abs(min);
  const span = abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}`;
  return min > 0 ? `in ${span}` : `${span} ago`;
}

// Live "in 23 min". Runs on the view's clock: the first render uses `serverNow` (so hydration matches) and
// then advances with real elapsed time, which also keeps a wrong device clock from skewing the countdown.
export function Countdown({ at, serverNow, className = "" }: { at: string; serverNow: string; className?: string }) {
  const base = new Date(serverNow).getTime();
  const [tick, setTick] = useState({ base, elapsed: 0 });
  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => setTick({ base, elapsed: performance.now() - started }), 20_000);
    return () => window.clearInterval(id);
  }, [base]);
  const now = base + (tick.base === base ? tick.elapsed : 0);
  return <span className={`tnum ${className}`}>{phrase(new Date(at).getTime(), now)}</span>;
}
