import { notFound } from "next/navigation";
import { AppNav } from "@/components/shell/app-nav";
import { DemoSettings } from "../demo-settings";

export default async function DevSettingsSection({ params }: PageProps<"/dev/settings/[section]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { section } = await params;
  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <DemoSettings section={section} />
      <AppNav hrefPrefix="/dev" />
    </div>
  );
}
