import { ChevronRight } from "lucide-react";
import Link from "next/link";

export interface HubItem {
  href: string;
  title: string;
  detail: string;
}

export function SettingsHub({ items, footer, viewer = "patient" }: { items: HubItem[]; footer?: React.ReactNode; viewer?: "patient" | "caregiver" }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <header className="pb-4">
        <h1 className="font-serif text-[1.75rem] leading-tight">Settings</h1>
      </header>
      <ul className="divide-y divide-rule/70 border-y border-rule/70">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex min-h-16 items-center gap-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-lg">{i.title}</span>
                <span className="block text-[0.9375rem] text-pretty text-ink-soft">{i.detail}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[0.9375rem] text-pretty text-ink-soft">Bloom is a reminder and logging tool. Changes to {viewer === "patient" ? "your" : "her"} medicines and timings should come from {viewer === "patient" ? "your" : "her"} OB.</p>
      {footer}
    </div>
  );
}
