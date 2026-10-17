import { AppNav } from "@/components/shell/app-nav";

// Signed-in pages share the journal's navigation. Bottom padding keeps content clear of the phone tab bar.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {children}
      <AppNav />
    </div>
  );
}
