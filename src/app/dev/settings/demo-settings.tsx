"use client";

import { MedicationsForm } from "@/components/settings/medications-form";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { PregnancyForm } from "@/components/settings/pregnancy-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { ShiftsForm } from "@/components/settings/shifts-form";
import type { FormAction, MedData } from "@/components/settings/types";

// Synthetic settings for the dev preview. Saving only says it saved.
const ok: FormAction = async () => {
  await new Promise((r) => setTimeout(r, 300));
  return { message: "Saved (demo)." };
};

const MEDS: MedData[] = [
  { id: "1", name: "Gaviscon", doseLabel: "10 ml", color: "mint", active: true, rules: [
    { id: "11", label: "before breakfast", ruleType: "before_meal", anchor: "breakfast", minutes: 30, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
    { id: "12", label: "before lunch", ruleType: "before_meal", anchor: "lunch", minutes: 30, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
    { id: "15", label: "before dinner", ruleType: "before_meal", anchor: "dinner", minutes: 30, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
    { id: "17", label: "at bedtime", ruleType: "bedtime", anchor: "bedtime", minutes: 0, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
  ] },
  { id: "2", name: "Caltrate", doseLabel: "1 tablet", color: "sky", active: true, rules: [
    { id: "13", label: "after lunch", ruleType: "after_meal", anchor: "lunch", minutes: 60, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
    { id: "16", label: "after dinner", ruleType: "after_meal", anchor: "dinner", minutes: 60, fixedTime: null, minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
  ] },
  { id: "3", name: "Ferrous sulfate + Folic acid", doseLabel: "1 + 1 tablet", color: "clay", active: true, rules: [
    { id: "14", label: "afternoon dose", ruleType: "fixed_time", anchor: null, minutes: 0, fixedTime: "17:00", minPerDay: 1, maxPerDay: 1, deadline: null, active: true },
  ] },
  { id: "4", name: "Anmum Materna", doseLabel: "1 glass", color: "blush", active: true, rules: [
    { id: "18", label: "once or twice a day", ruleType: "daily_count", anchor: null, minutes: 0, fixedTime: null, minPerDay: 1, maxPerDay: 2, deadline: "21:00", active: true },
  ] },
];

export function DemoSettings({ section }: { section: string }) {
  const back = "/dev/settings";
  if (section === "medications")
    return (
      <SettingsPage title="Medicines" back={back} intro="Change these only as your OB advises. Changes apply from the next dose.">
        <MedicationsForm meds={MEDS} save={ok} add={ok} />
      </SettingsPage>
    );
  if (section === "shifts")
    return (
      <SettingsPage title="Work shifts" back={back} intro="Your meal and dose suggestions follow these.">
        <ShiftsForm
          weekly={[
            { weekday: 0, start: null, end: null },
            { weekday: 1, start: "19:00", end: "24:00" },
            { weekday: 2, start: "14:00", end: "24:00" },
            { weekday: 3, start: "14:00", end: "24:00" },
            { weekday: 4, start: "14:00", end: "24:00" },
            { weekday: 5, start: "14:00", end: "24:00" },
            { weekday: 6, start: null, end: null },
          ]}
          overrides={[{ id: "o1", date: "2026-10-23", label: "Fri 23 Oct", isOff: true, start: null, end: null, note: "Prenatal check-up" }]}
          saveWeekly={ok}
          addOverride={ok}
          removeOverride={async () => {}}
        />
      </SettingsPage>
    );
  if (section === "pregnancy")
    return (
      <SettingsPage title="Pregnancy" back={back}>
        <PregnancyForm dueDate="2027-02-05" weekLabel="Week 24, day 4 · 108 days to go" save={ok} />
      </SettingsPage>
    );
  return (
    <SettingsPage title="Reminders" back={back}>
      <NotificationsForm
        role="patient"
        caregiverName="Ag"
        my={{ push: true, email: true }}
        times={{ anmumDeadline: "21:00", summaryTime: "09:00", bedtimeDefault: "01:00", nagAfter: 15, escalateAfter: 30, ironSpacing: 120 }}
        caregiverCanLog={false}
        saveMine={ok}
        saveTimes={ok}
        saveCaregiver={ok}
        installHref="/dev/onboarding"
      />
    </SettingsPage>
  );
}
