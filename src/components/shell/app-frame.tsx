import { AppNav } from "./app-nav";

// Signed-in page frame: the page's <main> landmark, room for the phone tab bar, and the navigation.
export function AppFrame({ children, hrefPrefix, nav = true }: { children: React.ReactNode; hrefPrefix?: string; nav?: boolean }) {
  return (
    <div className={`relative flex flex-1 flex-col ${nav ? "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      {nav ? <AppNav hrefPrefix={hrefPrefix} /> : null}
    </div>
  );
}
