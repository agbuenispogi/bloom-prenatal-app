import type { ItemState } from "@/lib/engine";
import type { Tab } from "@/lib/view/home";

// Cloth index tab: each medicine's swatch, like the coloured tabs in a keepsake book.
export function MedTab({ tab, className = "" }: { tab: Tab; className?: string }) {
  return <span aria-hidden className={`inline-block h-6 w-2.5 shrink-0 rounded-[3px] ${className}`} style={{ background: `var(--tab-${tab})` }} />;
}

// State is carried by form, not colour alone: solid ink = done, dashed = upcoming, ringed = due,
// struck = skipped, hollow = missed, dotted = snoozed.
export function StateMark({ state }: { state: ItemState }) {
  const common = { width: 22, height: 22, viewBox: "0 0 22 22", "aria-hidden": true as const };
  switch (state) {
    case "done":
      // The same hand-inked check drawn on Done, left on the page in ink.
      return (
        <svg {...common}>
          <path d="M2.5 12.6c2 1.3 3.7 3.1 5 5.4.5.8.9.8 1.4 0C11.8 12 15.4 7.2 20 3.6" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "due":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="9.5" fill="none" stroke="var(--ribbon)" strokeWidth="2.5" />
          <circle cx="11" cy="11" r="4" fill="var(--ribbon)" />
        </svg>
      );
    case "snoozed":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--ribbon)" strokeWidth="1.75" strokeDasharray="1.5 3" strokeLinecap="round" />
        </svg>
      );
    case "skipped":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" />
          <path d="M5 17 17 5" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "missed":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" strokeDasharray="3.2 2.6" />
        </svg>
      );
  }
}

export const STATE_WORD: Record<ItemState, string> = {
  done: "Done",
  due: "Due now",
  upcoming: "Coming up",
  snoozed: "Snoozed",
  skipped: "Skipped",
  missed: "Missed",
};

// The hand-inked check drawn when she taps Done.
export function InkCheck({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <path
        className="ink-draw"
        style={{ ["--ink-len" as string]: 190 }}
        d="M10 50c9 6 18 15 26 27 3 4 5 4 8 0C62 49 84 24 112 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
