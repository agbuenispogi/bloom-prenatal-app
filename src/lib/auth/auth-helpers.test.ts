import { describe, expect, it } from "vitest";
import { applyRemember, wantsRemember } from "@/lib/supabase/cookies";
import { isPublicPath } from "@/lib/supabase/proxy";
import { safeNext } from "./redirect";

describe("applyRemember", () => {
  const persistent = { path: "/", httpOnly: true, maxAge: 400 * 24 * 60 * 60 };

  it("keeps the long-lived cookie when she chose to stay signed in", () => {
    expect(applyRemember(persistent, true)).toEqual(persistent);
  });

  it("turns auth cookies into session cookies when she opted out", () => {
    const result = applyRemember({ ...persistent, expires: new Date() }, false);
    expect(result.maxAge).toBeUndefined();
    expect(result.expires).toBeUndefined();
    expect(result.httpOnly).toBe(true);
  });

  it("never blocks cookie removal (maxAge 0)", () => {
    expect(applyRemember({ path: "/", maxAge: 0 }, false)).toEqual({ path: "/", maxAge: 0 });
  });

  it("defaults to remembering when there is no marker cookie", () => {
    expect(wantsRemember(undefined)).toBe(true);
    expect(wantsRemember("1")).toBe(true);
    expect(wantsRemember("0")).toBe(false);
  });
});

describe("safeNext", () => {
  it.each([
    ["/settings/household", "/settings/household"],
    ["/welcome?invite=abc", "/welcome?invite=abc"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["https://evil.com", "/"],
    [null, "/"],
    ["", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("isPublicPath", () => {
  it.each([
    ["/login", true],
    ["/signup", true],
    ["/auth/confirm", true],
    ["/offline", true],
    ["/api/reminders/dispatch", true],
    ["/", false],
    ["/loginx", false],
    ["/settings/household", false],
    ["/welcome", false],
  ])("%s → %s", (path, expected) => {
    expect(isPublicPath(path)).toBe(expected);
  });
});
