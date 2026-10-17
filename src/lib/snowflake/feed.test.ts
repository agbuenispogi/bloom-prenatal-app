import { describe, expect, it } from "vitest";
import { parseFeed, safeLink, SNOWFLAKE_URL, streakMessage } from "./feed";

describe("Baby Snowflake feed", () => {
  it("accepts the published shape and ignores anything malformed", () => {
    const feed = { dueDate: "2027-04-02", latest: { date: "2026-10-11", week: 15, title: "Low-risk screening results", summary: "All clear.", url: `${SNOWFLAKE_URL}/#latest` } };
    expect(parseFeed(feed)).toEqual(feed);
    expect(parseFeed({ dueDate: "April 2" })).toBeNull();
    expect(parseFeed({ latest: { date: "2026-10-11", title: "" } })).toBeNull();
    expect(parseFeed("nope")).toBeNull();
    expect(parseFeed({})).toEqual({});
  });

  it("only follows links back to the site", () => {
    expect(safeLink(`${SNOWFLAKE_URL}/#latest`)).toBe(`${SNOWFLAKE_URL}/#latest`);
    expect(safeLink("https://evil.example/")).toBe(SNOWFLAKE_URL);
    expect(safeLink(undefined)).toBe(SNOWFLAKE_URL);
  });

  it("the public streak line is gentle and contains no medical detail", () => {
    expect(streakMessage(5)).toBe("Mama has cared for Snowflake 5 days in a row");
    expect(streakMessage(1)).toBe("Mama cared for Snowflake yesterday");
    for (const n of [0, 1, 7]) expect(streakMessage(n)).not.toMatch(/dose|medicine|missed|late|caltrate|iron|gaviscon/i);
  });
});
