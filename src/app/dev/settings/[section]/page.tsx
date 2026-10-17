import { notFound } from "next/navigation";
import { demoAllowed } from "@/lib/demo/allowed";
import { AppFrame } from "@/components/shell/app-frame";
import { DemoSettings } from "../demo-settings";

export default async function DevSettingsSection({ params }: PageProps<"/dev/settings/[section]">) {
  if (!demoAllowed()) notFound();
  const { section } = await params;
  return (
    <AppFrame hrefPrefix="/dev">
      <DemoSettings section={section} />
    </AppFrame>
  );
}
