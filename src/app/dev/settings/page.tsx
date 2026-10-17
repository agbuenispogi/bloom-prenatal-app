import { notFound } from "next/navigation";
import { demoAllowed } from "@/lib/demo/allowed";
import { SettingsHub } from "@/components/settings/settings-hub";
import { AppFrame } from "@/components/shell/app-frame";

export default function DevSettings() {
  if (!demoAllowed()) notFound();
  return (
    <AppFrame hrefPrefix="/dev">
      <SettingsHub
        items={[
          { href: "/dev/settings/medications", title: "Medicines", detail: "What you take and when, as your OB set it." },
          { href: "/dev/settings/shifts", title: "Work shifts", detail: "Your weekly shifts and one-off changes." },
          { href: "/dev/settings/pregnancy", title: "Pregnancy", detail: "Due 5 February 2027 · Week 24" },
          { href: "/dev/settings/notifications", title: "Reminders", detail: "Alarms, emails, nags and the morning summary." },
          { href: "/dev/onboarding", title: "Install & alarms", detail: "Add Bloom to the Home Screen and turn on alarms." },
          { href: "#", title: "Household", detail: "Our home · invites" },
        ]}
      />
    </AppFrame>
  );
}
