// Sends due reminders. All I/O goes through `deps`, so the logic is tested with fakes and the route wires
// Supabase, web-push and Resend. Idempotent: rows are claimed atomically and marked sent once.
import type { ReminderPayload } from "./plan";

export interface ClaimedReminder {
  id: string;
  household_id: string;
  recipient_id: string;
  channel: "push" | "email";
  kind: string;
  due_at: string;
  payload: ReminderPayload;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface RecipientInfo {
  email: string;
  displayName: string;
  role: "patient" | "caregiver";
}

export type PushResult = "ok" | "gone" | "error";

export interface DispatchDeps {
  now(): Date;
  claim(limit: number): Promise<ClaimedReminder[]>;
  recipient(profileId: string): Promise<RecipientInfo | null>;
  subscriptions(profileId: string): Promise<PushSubscriptionRow[]>;
  sendPush(sub: PushSubscriptionRow, message: Record<string, unknown>): Promise<PushResult>;
  removeSubscription(id: string): Promise<void>;
  markSubscriptionOk(id: string, at: Date): Promise<void>;
  sendEmail(to: RecipientInfo, reminder: ClaimedReminder, links: { app: string; calendar: string | null }): Promise<void>;
  markSent(id: string, at: Date, note?: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markCancelled(id: string, at: Date, reason: string): Promise<void>;
  actionToken(r: ClaimedReminder): string | null;
  appUrl: string;
}

export interface DispatchReport {
  claimed: number;
  sent: number;
  failed: number;
  stale: number;
}

// A reminder this late is no longer useful: it's withdrawn instead of sent.
export const STALE_AFTER_MS = 30 * 60_000;

export function pushMessage(r: ClaimedReminder, token: string | null): Record<string, unknown> {
  const p = r.payload;
  return {
    title: p.title,
    body: p.body,
    tag: p.tag,
    url: p.url,
    requireInteraction: r.kind === "due" || r.kind === "nag" || r.kind === "anmum",
    actions:
      p.actionable && token
        ? [
            { action: "taken", title: "Taken" },
            { action: "snooze", title: "Snooze 10m" },
          ]
        : [],
    data: token ? { token } : {},
  };
}

export async function dispatch(deps: DispatchDeps, limit = 100): Promise<DispatchReport> {
  const report: DispatchReport = { claimed: 0, sent: 0, failed: 0, stale: 0 };
  const rows = await deps.claim(limit);
  report.claimed = rows.length;
  const people = new Map<string, Promise<RecipientInfo | null>>();
  const who = (id: string) => {
    if (!people.has(id)) people.set(id, deps.recipient(id));
    return people.get(id)!;
  };

  for (const r of rows) {
    const now = deps.now();
    try {
      if (now.getTime() - new Date(r.due_at).getTime() > STALE_AFTER_MS) {
        await deps.markCancelled(r.id, now, "stale");
        report.stale++;
        continue;
      }
      const token = deps.actionToken(r);

      if (r.channel === "push") {
        const subs = await deps.subscriptions(r.recipient_id);
        if (subs.length === 0) {
          await deps.markSent(r.id, now, "no push device");
          report.sent++;
          continue;
        }
        const message = pushMessage(r, token);
        const results = await Promise.all(subs.map((s) => deps.sendPush(s, message)));
        await Promise.all(
          subs.map((s, i) => (results[i] === "gone" ? deps.removeSubscription(s.id) : results[i] === "ok" ? deps.markSubscriptionOk(s.id, now) : Promise.resolve())),
        );
        if (results.includes("ok") || results.every((x) => x === "gone")) {
          await deps.markSent(r.id, now, results.includes("ok") ? undefined : "all devices gone");
          report.sent++;
        } else {
          await deps.markFailed(r.id, "push failed on every device");
          report.failed++;
        }
        continue;
      }

      const person = await who(r.recipient_id);
      if (!person?.email) {
        await deps.markSent(r.id, now, "no email address");
        report.sent++;
        continue;
      }
      const calendar = token && r.payload.actionable ? `${deps.appUrl}/api/ics?t=${encodeURIComponent(token)}` : null;
      await deps.sendEmail(person, r, { app: deps.appUrl, calendar });
      await deps.markSent(r.id, now);
      report.sent++;
    } catch (e) {
      await deps.markFailed(r.id, e instanceof Error ? e.message.slice(0, 300) : "send failed");
      report.failed++;
    }
  }
  return report;
}
