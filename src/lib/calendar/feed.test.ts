import { describe, expect, it } from "vitest";
import { buildDaySchedule, type DoseLog } from "@/lib/engine";
import { TUE, at, eaten, makeInput, taken } from "@/lib/engine/__tests__/fixtures";
import { buildCalendar } from "@/lib/reminders/ics";
import { signFeed, verifyFeed } from "@/lib/reminders/token";
import { feedEvents } from "./feed";

const sched = (doses: DoseLog[], now = at(TUE, "12:45")) =>
  buildDaySchedule(makeInput({ breakfastSkipped: true, meals: [eaten("lunch", at(TUE, "12:42"))], doses, now }));

describe("calendar feed", () => {
  it("lists open doses with a known time, each ringing on time; nothing estimated", () => {
    const now = at(TUE, "12:45");
    const ev = feedEvents([sched([taken("r-gav-l", at(TUE, "12:12")), taken("r-anmum", at(TUE, "10:00"))], now)], now, "https://bloom.example");
    expect(ev.map((e) => [e.title, e.start.toISOString()])).toEqual([
      ["Caltrate · 1 tablet", at(TUE, "13:42").toISOString()],
      ["Ferrous sulfate + Folic acid · 1 + 1 tablet", at(TUE, "17:00").toISOString()],
    ]);
    expect(ev[0]!.uid).toMatch(/^2026-10-20-r-cal-l-1@bloom$/);
  });

  it("a taken dose drops off the feed (its phone alarm disappears on refresh)", () => {
    const now = at(TUE, "13:50");
    const ev = feedEvents([sched([taken("r-gav-l", at(TUE, "12:12")), taken("r-cal-l", at(TUE, "13:43")), taken("r-anmum", at(TUE, "10:00"))], now)], now, "https://x");
    expect(ev.some((e) => e.title.startsWith("Caltrate"))).toBe(false);
  });

  it("adds an Anmum check-in at the deadline while it's below the minimum", () => {
    const now = at(TUE, "12:45");
    const ev = feedEvents([sched([taken("r-gav-l", at(TUE, "12:12"))], now)], now, "https://x");
    expect(ev.find((e) => e.title === "Anmum Materna today?")?.start).toEqual(at(TUE, "21:00"));
  });

  it("is a subscribable calendar with a refresh hint, and feed links are signed", () => {
    const now = at(TUE, "12:45");
    const ics = buildCalendar("Bloom", feedEvents([sched([], now)], now, "https://x"));
    expect(ics).toContain("X-WR-CALNAME:Bloom\r\n");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT15M\r\n");
    expect(ics.match(/BEGIN:VALARM/g)?.length).toBe(ics.match(/BEGIN:VEVENT/g)?.length);
    const t = signFeed({ h: "hh", p: "wife" }, "s3cret");
    expect(verifyFeed(t, "s3cret")).toEqual({ h: "hh", p: "wife" });
    expect(verifyFeed(t, "other")).toBeNull();
    expect(verifyFeed(t.replace(/.$/, "x"), "s3cret")).toBeNull();
  });
});
