import { describe, expect, it } from "vitest";
import { dispatch, pushMessage, type ClaimedReminder, type DispatchDeps, type PushResult } from "./dispatch";

const NOW = new Date("2026-10-20T05:43:00Z");
const payload = { title: "Time for Caltrate · 1 tablet", body: "After lunch · 1:42 PM", url: "/", tag: "dose:x", careDate: "2026-10-20", itemKey: "caltrate-after-lunch#1", ruleId: "r", occurrence: 1, dueLabel: "1:42 PM", actionable: true };
const row = (over: Partial<ClaimedReminder> = {}): ClaimedReminder => ({ id: "1", household_id: "h", recipient_id: "wife", channel: "push", kind: "due", due_at: "2026-10-20T05:42:00Z", payload, ...over });

function fakes(rows: ClaimedReminder[], opts: { subs?: number; push?: PushResult[]; emailFails?: boolean; email?: string } = {}) {
  const log: string[] = [];
  let pushCall = 0;
  const deps: DispatchDeps = {
    now: () => NOW,
    claim: async () => rows,
    recipient: async () => ({ email: opts.email ?? "wife@example.com", displayName: "Love", role: "patient" }),
    subscriptions: async () => Array.from({ length: opts.subs ?? 1 }, (_, i) => ({ id: `s${i}`, endpoint: `https://push/${i}`, p256dh: "k", auth: "a" })),
    sendPush: async () => (opts.push ?? ["ok"])[pushCall++] ?? "ok",
    removeSubscription: async (id) => void log.push(`remove ${id}`),
    markSubscriptionOk: async (id) => void log.push(`ok ${id}`),
    sendEmail: async (to, r, links) => {
      if (opts.emailFails) throw new Error("resend 500");
      log.push(`email ${to.email} ${r.kind} cal=${Boolean(links.calendar)}`);
    },
    markSent: async (id, _at, note) => void log.push(`sent ${id}${note ? ` (${note})` : ""}`),
    markFailed: async (id, e) => void log.push(`failed ${id}: ${e}`),
    markCancelled: async (id, _at, reason) => void log.push(`cancel ${id}: ${reason}`),
    actionToken: () => "tok",
    appUrl: "https://bloom.example",
  };
  return { deps, log };
}

describe("dispatch", () => {
  it("sends a push to every device and marks the row sent", async () => {
    const { deps, log } = fakes([row()], { subs: 2 });
    expect(await dispatch(deps)).toEqual({ claimed: 1, sent: 1, failed: 0, stale: 0 });
    expect(log).toEqual(["ok s0", "ok s1", "sent 1"]);
  });

  it("prunes devices the push service says are gone, and still counts a delivery to the rest", async () => {
    const { deps, log } = fakes([row()], { subs: 2, push: ["gone", "ok"] });
    await dispatch(deps);
    expect(log).toEqual(["remove s0", "ok s1", "sent 1"]);
  });

  it("marks a push failed (to retry) when every device errors", async () => {
    const { deps, log } = fakes([row()], { subs: 2, push: ["error", "error"] });
    expect((await dispatch(deps)).failed).toBe(1);
    expect(log.at(-1)).toBe("failed 1: push failed on every device");
  });

  it("withdraws reminders more than 30 minutes late instead of sending them", async () => {
    const { deps, log } = fakes([row({ due_at: "2026-10-20T05:00:00Z" })]);
    expect((await dispatch(deps)).stale).toBe(1);
    expect(log).toEqual(["cancel 1: stale"]);
  });

  it("emails with an Add to calendar link for actionable doses, and records failures for retry", async () => {
    const ok = fakes([row({ channel: "email" })]);
    await dispatch(ok.deps);
    expect(ok.log).toEqual(["email wife@example.com due cal=true", "sent 1"]);
    const bad = fakes([row({ channel: "email" })], { emailFails: true });
    await dispatch(bad.deps);
    expect(bad.log).toEqual(["failed 1: resend 500"]);
  });

  it("a recipient with no device or no email is marked sent with a note (nothing to retry)", async () => {
    const noDevice = fakes([row()], { subs: 0 });
    await dispatch(noDevice.deps);
    expect(noDevice.log).toEqual(["sent 1 (no push device)"]);
    const noEmail = fakes([row({ channel: "email" })], { email: "" });
    await dispatch(noEmail.deps);
    expect(noEmail.log).toEqual(["sent 1 (no email address)"]);
  });

  it("push messages carry Taken / Snooze only for actionable reminders with a token", () => {
    expect(pushMessage(row(), "tok")).toMatchObject({ requireInteraction: true, actions: [{ action: "taken" }, { action: "snooze" }], data: { token: "tok" } });
    expect(pushMessage(row({ payload: { ...payload, actionable: false } }), "tok").actions).toEqual([]);
    expect(pushMessage(row({ kind: "eat_nudge" }), null)).toMatchObject({ requireInteraction: false, actions: [] });
  });
});
