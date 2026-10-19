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
      <span className={`tnum pt-0.5 text-right text-[0.9375rem] whitespace-nowrap ${row.estimated ? "text-ink-soft" : "text-ink"}`}>
        {row.timeLabel ? (row.estimated ? `~${row.timeLabel}` : row.timeLabel) : "Any time"}
      </span>
      <span className="relative z-10 bg-paper pt-0.5">
        <StateMark state={row.state} />
      </span>
      <div className="min-w-0">
        <p className={`flex items-center gap-2 text-[1.0625rem] leading-snug ${quiet ? "text-ink-soft" : "text-ink"} ${struck ? "line-through decoration-1" : ""}`}>
          {row.kind === "dose" ? <MedTab tab={row.tab} className="h-4 w-2" /> : null}
          <span className={row.kind === "meal" ? "font-serif text-lg" : "font-medium"}>{row.title}</span>
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
  const grid = "grid grid-cols-[5.25rem_22px_1fr] gap-x-3.5 py-3";
  return (
    <li>
      {onOpen ? (
        // The whole row is the button: tap to log it, change its time, or put it back.
        <button
          type="button"
          onClick={() => onOpen(row)}
          aria-haspopup="dialog"
          className={`${grid} -mx-2 w-[calc(100%+1rem)] rounded-[8px] px-2 text-left transition-colors duration-150 active:bg-cloth/40`}
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
            <p className="tnum text-[0.9375rem] text-ink-soft">
              {progress.done >= progress.total ? `All ${progress.total} done today` : `${progress.done} of ${progress.total} done`}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children ? <div className="mb-3">{children}</div> : null}
      <ol className="relative divide-y divide-rule/70">
        {/* The journal's margin rule, running down the page between the times and the entries. */}
        <span aria-hidden className="absolute inset-y-0 left-[calc(5.25rem+0.875rem+10px)] w-px bg-margin" />
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
