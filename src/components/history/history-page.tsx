import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { HistoryView } from "@/lib/view/history";
import { AdherenceRing } from "./adherence-ring";
import { DaySummaryBlock, shortTally } from "./day-summary";

export function HistoryPage({ view, hrefFor }: { view: HistoryView; hrefFor: (date: string) => string }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 sm:px-6">
      <header className="pb-6">
        <h1 className="font-serif text-[1.75rem] leading-tight">History</h1>
        <p className="text-base text-ink-soft">{view.streak > 1 ? `${view.streak} clean days in a row` : "Every page she's filled in"}</p>
      </header>

      {view.yesterday ? (
        <section aria-labelledby="yesterday" className="flex flex-col gap-4 pb-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="yesterday" className="font-serif text-2xl">
              Yesterday
            </h2>
            <Link href={hrefFor(view.yesterday.careDate)} className="flex min-h-12 items-center gap-1 text-base text-ink underline">
              See the page <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="-mt-3 text-base text-ink-soft">
            {view.yesterday.longLabel}
            {view.yesterday.weekLabel ? ` · ${view.yesterday.weekLabel}` : ""}
          </p>
          <DaySummaryBlock card={view.yesterday} />
        </section>
      ) : (
        <p className="pb-8 text-[1.0625rem] text-ink-soft">Yesterday&apos;s summary will appear here after your first full day with Bloom.</p>
      )}

      {view.earlier.length ? (
        <section aria-labelledby="earlier">
          <h2 id="earlier" className="mb-2 font-serif text-2xl">
            Earlier
          </h2>
          <ul className="divide-y divide-rule/70">
            {view.earlier.map((d) => (
              <li key={d.careDate}>
                <Link href={hrefFor(d.careDate)} className="flex min-h-16 items-center gap-4 py-3">
                  {d.empty ? (
                    <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-dashed border-rule text-ink-soft">
                      –
                    </span>
                  ) : (
                    <AdherenceRing pct={d.summary.adherencePct} size={44} label={`${d.summary.adherencePct}% on time`} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-lg">{d.dateLabel}</span>
                    <span className="block text-[0.9375rem] text-ink-soft">
                      {d.empty
                        ? "Nothing logged"
                        : [shortTally(d), d.summary.anmumMissed ? "no Anmum" : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 text-ink-soft" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
