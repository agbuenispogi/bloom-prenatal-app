import type { DayCard } from "@/lib/view/history";
import { AdherenceRing } from "./adherence-ring";

// What happened, in the list rows' voice: "6 on time · none late, skipped or missed".
export function tally(card: DayCard): string {
  const s = card.summary;
  const rest = [
    s.late ? `${s.late} late` : null,
    s.skipped ? `${s.skipped} skipped` : null,
    s.missed ? `${s.missed} missed` : null,
  ].filter(Boolean);
  return `${s.onTime} on time · ${rest.length ? rest.join(" · ") : "none late, skipped or missed"}`;
}

// The list-row form, short enough for one line at 390px: "All 6 on time", "5 of 6 on time · 1 late".
export function shortTally(card: DayCard): string {
  const s = card.summary;
  if (s.onTime === s.scheduled) return `All ${s.scheduled} on time`;
  const rest = [s.late ? `${s.late} late` : null, s.skipped ? `${s.skipped} skipped` : null, s.missed ? `${s.missed} missed` : null].filter(Boolean);
  return [`${s.onTime} of ${s.scheduled} on time`, ...rest].join(" · ");
}

// The summary block for one finished care day: the same content the 9 AM email carries.
export function DaySummaryBlock({ card }: { card: DayCard }) {
  const s = card.summary;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <AdherenceRing pct={s.adherencePct} size={88} label={`${s.adherencePct}% of doses on time`} />
        <p className="min-w-0 font-serif text-xl leading-snug text-pretty">{card.note}</p>
      </div>
      <p className="tnum border-t border-rule pt-3 text-[1.0625rem]">{tally(card)}</p>
      <p className={`text-[1.0625rem] ${s.anmumMissed ? "text-ribbon" : "text-ink"}`}>
        {s.anmumMissed ? "Anmum Materna: not taken this day" : `Anmum Materna: ${s.anmumTaken} ${s.anmumTaken === 1 ? "glass" : "glasses"}`}
      </p>
    </div>
  );
}
