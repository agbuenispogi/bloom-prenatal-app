import { writeFileSync } from "node:fs";
import { render } from "@react-email/render";
import { it } from "vitest";
import { ReminderEmail } from "./reminder-email";

// Writes review previews when BLOOM_EMAIL_PREVIEW is set (skipped otherwise).
it.skipIf(!process.env.BLOOM_EMAIL_PREVIEW)("writes email previews", async () => {
  const dir = process.env.BLOOM_EMAIL_PREVIEW!;
  writeFileSync(`${dir}/email-due.html`, await render(ReminderEmail({ kind: "due", recipientName: "Love", title: "Time for Caltrate · 1 tablet", body: "After lunch · 1:42 PM", appUrl: "https://bloom.example", calendarUrl: "https://bloom.example/api/ics?t=x" })));
  writeFileSync(`${dir}/email-escalation.html`, await render(ReminderEmail({ kind: "escalation", recipientName: "Ag", title: "Caltrate not logged yet", body: "It was due at 1:42 PM (after lunch) and hasn't been logged after 30 minutes.", appUrl: "https://bloom.example", calendarUrl: null })));
});
