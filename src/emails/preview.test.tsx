import { writeFileSync } from "node:fs";
import { render } from "@react-email/render";
import { it } from "vitest";
import { buildDaySchedule } from "@/lib/engine";
import { DEMO_DUE_DATE, demoPastDays } from "@/lib/demo/scenarios";
import { buildSummary } from "@/lib/summary/daily";
import { ReminderEmail } from "./reminder-email";
import { SummaryEmail } from "./summary-email";

// Writes review previews when BLOOM_EMAIL_PREVIEW is set (skipped otherwise).
it.skipIf(!process.env.BLOOM_EMAIL_PREVIEW)("writes email previews", async () => {
  const dir = process.env.BLOOM_EMAIL_PREVIEW!;
  writeFileSync(`${dir}/email-due.html`, await render(ReminderEmail({ kind: "due", recipientName: "Love", title: "Time for Caltrate · 1 tablet", body: "After lunch · 1:42 PM", appUrl: "https://bloom.example", calendarUrl: "https://bloom.example/api/ics?t=x" })));
  const days = demoPastDays().map((input) => ({ input, schedule: buildDaySchedule(input) }));
  writeFileSync(`${dir}/email-summary.html`, await render(SummaryEmail({ summary: buildSummary(days, DEMO_DUE_DATE), recipientName: "Love", appUrl: "https://bloom.example" })));
  writeFileSync(`${dir}/email-summary-rough.html`, await render(SummaryEmail({ summary: buildSummary(days.slice(3), DEMO_DUE_DATE), recipientName: "Ag", appUrl: "https://bloom.example" })));
  writeFileSync(`${dir}/email-escalation.html`, await render(ReminderEmail({ kind: "escalation", recipientName: "Ag", title: "Caltrate not logged yet", body: "It was due at 1:42 PM (after lunch) and hasn't been logged after 30 minutes.", appUrl: "https://bloom.example", calendarUrl: null })));
});
