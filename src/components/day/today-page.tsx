import { Info } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { TimelineRow } from "@/lib/view/home";
import { MedTab, StateMark, STATE_WORD } from "./marks";
import { Ribbon } from "./ribbon";

function Row({ row, onOpen }: { row: TimelineRow; onOpen?: (row: TimelineRow) => void }) {
  const struck = row.state === "skipped";
  const quiet = row.state === "skipped" || row.state === "missed";
  const late = row.lateByMin && row.targetLabel ? `${row.lateByMin} min late (planned ${row.targetLabel})` : null;
  const body = (
    <>
      <span className={`tnum pt-1 text-[0.875rem] font-bold whitespace-nowrap ${row.estimated ? "text-ink-soft" : "text-ink"}`}>
        {row.timeLabel ? (row.estimated ? `~${row.timeLabel}` : row.timeLabel) : "Any time"}
      </span>
      <span className="pt-0.5">
        <StateMark state={row.state} />
      </span>
      <div className="min-w-0">
        <p className={`flex items-center gap-2 text-[1.0625rem] leading-snug ${quiet ? "text-ink-soft" : "text-ink"} ${struck ? "line-through decoration-1" : ""}`}>
          {row.kind === "dose" ? <MedTab tab={row.tab} className="h-4 w-2" /> : null}
          <span className={row.kind === "meal" ? "font-serif text-lg" : "font-bold"}>{row.title}</span>
        </p>
        <p className="text-[0.9375rem] text-ink-soft">
          {[row.note, row.state === "done" || row.note === "skipped with breakfast" ? null : STATE_WORD[row.state], late, row.reason ? `“${row.reason}”` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {row.warning ? (
          // A margin note in ink, not an alert box: it informs, it doesn't alarm.
          <p className="mt-2 flex gap-2 border-t border-margin pt-2 text-[0.875rem] leading-snug text-ink-soft">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ribbon" />
            <span>{row.warning}</span>
          </p>
        ) : null}
      </div>
    </>
  );
  const grid = "grid grid-cols-[4.75rem_26px_1fr] items-start gap-x-3 rounded-[18px] bg-card px-3.5 py-3 soft-shadow";
  return (
    <li>
      {onOpen ? (
        // The whole row is the button: tap to log it, change its time, or put it back.
        <button
          type="button"
          onClick={() => onOpen(row)}
          aria-haspopup="dialog"
          className={`${grid} w-full text-left transition-transform duration-150 active:scale-[0.99]`}
        >
          {body}
        </button>
      ) : (
        <div className={grid}>{body}</div>
      )}
    </li>
  );
}

export function TodayPage({
  rows,
  ribbonBefore,
  nowLabel,
  children,
  action,
  onOpen,
  progress,
  title = "Today",
}: {
  rows: TimelineRow[];
  ribbonBefore: string | null;
  nowLabel: string | null;
  children?: ReactNode;
  action?: ReactNode;
  onOpen?: (row: TimelineRow) => void;
  progress?: { done: number; total: number };
  title?: string;
}) {
  return (
    <section aria-labelledby="today-heading" className="px-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="today-heading" className="font-serif text-2xl">
            {title}
          </h2>
          {progress && progress.total ? (
            <p className="tnum text-[0.9375rem] font-bold text-ink-soft">
              {progress.done >= progress.total ? `All ${progress.total} done today` : `${progress.done} of ${progress.total} done`}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {progress && progress.total ? (
        <div aria-hidden className="mb-4 h-2.5 overflow-hidden rounded-full bg-paper-sunk ring-1 ring-cloth-rule">
          <div className="wash h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round((100 * Math.min(progress.done, progress.total)) / progress.total)}%` }} />
        </div>
      ) : null}
      {children ? <div className="mb-3">{children}</div> : null}
      <ol className="flex flex-col gap-2">
        {rows.map((row) => (
          <Fragment key={row.key}>
            {nowLabel && ribbonBefore === row.key ? <Ribbon label={nowLabel} /> : null}
            <Row row={row} onOpen={onOpen} />
          </Fragment>
        ))}
        {nowLabel && ribbonBefore === null ? <Ribbon label={nowLabel} /> : null}
      </ol>
    </section>
  );
}
