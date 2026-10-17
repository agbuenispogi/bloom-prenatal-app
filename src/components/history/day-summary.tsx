import { tally, type DayCard } from "@/lib/view/history";

export { shortTally, tally } from "@/lib/view/history";
import { AdherenceRing } from "./adherence-ring";

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
