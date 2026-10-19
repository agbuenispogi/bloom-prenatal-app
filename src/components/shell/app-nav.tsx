"use client";

import { BookOpen, CalendarDays, Settings2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/", label: "Today", icon: BookOpen, match: (p) => p === "/" },
  { href: "/history", label: "History", icon: CalendarDays, match: (p) => p.startsWith("/history") },
  { href: "/settings", label: "Settings", icon: Settings2, match: (p) => p.startsWith("/settings") },
];

// Width of each section's page column, so desktop links end on the content's right edge.
function columnWidth(path: string): number {
  if (path.startsWith("/history")) return 720;
  if (path.startsWith("/settings")) return 640;
  if (path.startsWith("/onboarding")) return 448;
  return 1120;
}

// Phones: a bottom bar in the thumb zone. Wider screens: quiet links at the top right of the page column.
export function AppNav({ hrefPrefix = "" }: { hrefPrefix?: string }) {
  const path = usePathname();
  const local = hrefPrefix ? path.replace(hrefPrefix, "").replace(/^\/home/, "") || "/" : path;
  return (
    <nav
      aria-label="Main"
      style={{ ["--col" as string]: `${columnWidth(local)}px` }}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-card pb-[env(safe-area-inset-bottom)] soft-shadow md:absolute md:inset-x-auto md:top-[max(1.25rem,env(safe-area-inset-top))] md:right-[max(0.75rem,calc((100vw-var(--col))/2+0.75rem))] md:bottom-auto md:border-0 md:bg-transparent md:pb-0"
    >
      <ul className="mx-auto flex max-w-md md:gap-1">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(local);
          return (
            <li key={href} className="flex-1">
              <Link
                href={hrefPrefix ? `${hrefPrefix}${href === "/" ? "/home" : href}` : href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 font-serif text-[0.8125rem] font-medium md:min-h-11 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-base ${active ? "text-ink md:bg-ribbon-fill md:text-ribbon-fill-ink" : "text-ink-soft"}`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full md:h-auto md:w-auto ${active ? "bg-ribbon-fill text-ribbon-fill-ink md:bg-transparent" : ""}`}>
                  <Icon aria-hidden className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
