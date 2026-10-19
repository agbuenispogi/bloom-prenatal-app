import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// Shared chrome for settings sub-pages: a back link and a serif title, on the journal page.
export function SettingsPage({ title, intro, back = "/settings", children }: { title: string; intro?: string; back?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <header className="pb-6">
        <Link href={back} className="-ml-2 inline-flex min-h-12 items-center gap-1 px-2 text-base text-ink-soft">
          <ChevronLeft aria-hidden className="size-5" /> Settings
        </Link>
        <h1 className="font-serif text-[1.75rem] leading-tight">{title}</h1>
        {intro ? <p className="mt-1 text-base text-pretty text-ink-soft">{intro}</p> : null}
      </header>
      {children}
    </div>
  );
}

export function TabPicker({ name, value }: { name: string; value: string }) {
  const tabs = ["mint", "sky", "clay", "blush", "oat"] as const;
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.9375rem] text-ink-soft">Colour tab</legend>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <label key={t} className="relative flex size-12 cursor-pointer items-center justify-center rounded-[14px] border border-rule has-[:checked]:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ribbon">
            <input type="radio" name={name} value={t} defaultChecked={value === t} className="sr-only" />
            <span aria-hidden className="h-6 w-2.5 rounded-[3px]" style={{ background: `var(--tab-${t})` }} />
            <span className="sr-only">{t}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-6 shrink-0 accent-[var(--ribbon-fill)]" />
      <span>
        <span className="block text-base text-ink">{label}</span>
        {hint ? <span className="block text-[0.875rem] text-ink-soft">{hint}</span> : null}
      </span>
    </label>
  );
}
