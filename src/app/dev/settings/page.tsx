import { notFound } from "next/navigation";
import { SettingsHub } from "@/components/settings/settings-hub";
import { AppNav } from "@/components/shell/app-nav";

export default function DevSettings() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
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
      <AppNav hrefPrefix="/dev" />
    </div>
  );
}
