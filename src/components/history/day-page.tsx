import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TodayPage } from "@/components/day/today-page";
import type { TimelineRow } from "@/lib/view/home";
import type { DayCard } from "@/lib/view/history";
import { DaySummaryBlock } from "./day-summary";

// One past care day: its summary, then the page as she filled it in (read-only).
export function DayPage({ card, rows, backHref }: { card: DayCard; rows: TimelineRow[]; backHref: string }) {
  return (
    <div className="mx-auto w-full max-w-[720px] pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <header className="px-5 pb-6 sm:px-6">
        <Link href={backHref} className="-ml-2 inline-flex min-h-12 items-center gap-1 px-2 text-base text-ink-soft">
          <ChevronLeft aria-hidden className="size-5" /> History
        </Link>
        <h1 className="font-serif text-[1.75rem] leading-tight">{card.longLabel}</h1>
        {card.weekLabel ? <p className="text-base text-ink-soft">{card.weekLabel}</p> : null}
      </header>
      <div className="px-5 pb-8 sm:px-6">
        <DaySummaryBlock card={card} />
      </div>
      <TodayPage rows={rows} ribbonBefore={null} nowLabel={null} title="The page" />
    </div>
  );
}
