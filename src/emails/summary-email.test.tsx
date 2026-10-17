import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import type { SummaryPayload } from "@/lib/summary/daily";
import { SummaryEmail, summarySubject } from "./summary-email";

const base: SummaryPayload = {
  careDate: "2026-10-19", longLabel: "Monday, 19 October", weekLabel: "Week 24 · day 3", pct: 83,
  tally: "5 on time · 1 missed", note: "One slipped by, and that's okay. Today is a fresh page.", streak: 0,
  anmumLine: "Anmum Materna: not taken", anmumMissed: true, empty: false,
  rows: [
    { time: "12:05 PM", title: "Caltrate", note: "after lunch", kind: "dose", state: "done", stateWord: "Taken", estimated: false },
    { time: "8:00 PM", title: "Caltrate", note: "after dinner", kind: "dose", state: "missed", stateWord: "Missed", estimated: false },
  ],
};

describe("SummaryEmail", () => {
  it("shows the page: date, percentage, tally, note, the Anmum flag and every row", async () => {
    const html = await render(SummaryEmail({ summary: base, recipientName: "Love", appUrl: "https://bloom.example" }));
    for (const s of ["Yesterday&#x27;s page", "Monday, 19 October", "83%", "5 on time · 1 missed", "Anmum Materna: not taken", "12:05 PM", "Missed", "Open Bloom"]) expect(html).toContain(s);
  });

  it("subject names the result and flags missing Anmum", () => {
    expect(summarySubject(base)).toBe("Yesterday: 5 on time · Anmum not taken");
    expect(summarySubject({ ...base, anmumMissed: false, tally: "6 on time · none late, skipped or missed" })).toBe("Yesterday: 6 on time");
    expect(summarySubject({ ...base, empty: true })).toBe("Yesterday's page in Bloom");
  });
});
