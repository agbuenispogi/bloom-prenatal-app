import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { ReminderEmail } from "./reminder-email";

describe("ReminderEmail", () => {
  it("renders the reminder with an Open Bloom button and a calendar link", async () => {
    const html = await render(ReminderEmail({ kind: "due", recipientName: "Love", title: "Time for Caltrate · 1 tablet", body: "After lunch · 1:42 PM", appUrl: "https://bloom.example", calendarUrl: "https://bloom.example/api/ics?t=x" }));
    expect(html).toContain("Time for Caltrate · 1 tablet");
    expect(html).toContain("Open Bloom");
    expect(html).toContain("https://bloom.example/api/ics?t=x");
    expect(html).toContain("not medical advice");
  });

  it("escalation to the caregiver is a kind heads-up, not an alarm", async () => {
    const text = await render(ReminderEmail({ kind: "escalation", recipientName: "Ag", title: "Caltrate not logged yet", body: "It was due at 1:42 PM (after lunch) and hasn't been logged after 30 minutes.", appUrl: "https://bloom.example", calendarUrl: null }), { plainText: true });
    expect(text).toContain("Hi Ag, a gentle heads-up");
    expect(text).not.toMatch(/urgent|warning|failed/i);
  });
});
