import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";
import { bearerMatches, signAction, verifyAction, type ActionClaims } from "./token";

const claims: ActionClaims = { h: "hh", p: "wife", d: "2026-10-20", r: "rule", o: 1, t: "Caltrate", at: 1, exp: Date.UTC(2026, 9, 21) };
const now = new Date(Date.UTC(2026, 9, 20, 6));

describe("action tokens", () => {
  it("round-trips and rejects tampering, wrong secrets and expiry", () => {
    const t = signAction(claims, "s3cret");
    expect(verifyAction(t, "s3cret", now)).toEqual(claims);
    expect(verifyAction(t, "other", now)).toBeNull();
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, p: "ag" })).toString("base64url");
    expect(verifyAction(`${forged}.${sig}`, "s3cret", now)).toBeNull();
    expect(verifyAction(`${body}.x`, "s3cret", now)).toBeNull();
    expect(verifyAction(t, "s3cret", new Date(Date.UTC(2026, 9, 22)))).toBeNull();
    expect(verifyAction("garbage", "s3cret", now)).toBeNull();
  });

  it("checks the cron bearer in constant time", () => {
    expect(bearerMatches("Bearer abc", "abc")).toBe(true);
    expect(bearerMatches("Bearer abd", "abc")).toBe(false);
    expect(bearerMatches("abc", "abc")).toBe(false);
    expect(bearerMatches(null, "abc")).toBe(false);
    expect(bearerMatches("Bearer ", undefined)).toBe(false);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({
    uid: "dose-2026-10-20-caltrate@bloom",
    title: "Caltrate · 1 tablet, after lunch",
    description: "Logged in Bloom; tap Done when you've taken it.",
    start: new Date(Date.UTC(2026, 9, 20, 5, 42)),
    url: "https://bloom.example/",
    now,
  });

  it("is a valid single event with an on-time alarm, in UTC, with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261020T054200Z\r\n");
    expect(ics).toContain("DTEND:20261020T055700Z\r\n");
    expect(ics).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\n");
    expect(ics).toContain("TRIGGER:PT0M\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas and semicolons, and folds long lines", () => {
    expect(ics).toContain("SUMMARY:Caltrate · 1 tablet\\, after lunch");
    expect(ics).toContain("Logged in Bloom\; tap Done");
    const long = buildIcs({ uid: "u", title: "x".repeat(200), description: "d", start: now, now });
    expect(long.split("\r\n").every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
  });
});
