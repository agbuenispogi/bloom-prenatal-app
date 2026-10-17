import "server-only";
import { render } from "@react-email/render";
import { Resend } from "resend";
import webpush from "web-push";
import { ReminderEmail } from "@/emails/reminder-email";
import type { ClaimedReminder, PushResult, PushSubscriptionRow, RecipientInfo } from "./dispatch";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(subject, pub, priv);
  vapidReady = true;
}

export async function sendWebPush(sub: PushSubscriptionRow, message: Record<string, unknown>): Promise<PushResult> {
  ensureVapid();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(message), {
      TTL: 30 * 60, // a reminder older than half an hour isn't worth delivering
      urgency: "high",
    });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}

let resend: Resend | null = null;
export async function sendReminderEmail(to: RecipientInfo, r: ClaimedReminder, links: { app: string; calendar: string | null }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Resend is not configured");
  resend ??= new Resend(key);
  const props = { kind: r.kind, recipientName: to.displayName, title: r.payload.title, body: r.payload.body, appUrl: links.app, calendarUrl: links.calendar };
  const [html, text] = await Promise.all([render(ReminderEmail(props)), render(ReminderEmail(props), { plainText: true })]);
  const { error } = await resend.emails.send({
    from,
    to: to.email,
    subject: r.payload.title,
    html,
    text,
    headers: { "X-Entity-Ref-ID": r.id }, // keeps Gmail from threading separate reminders
  });
  if (error) throw new Error(`resend: ${error.message}`);
}
