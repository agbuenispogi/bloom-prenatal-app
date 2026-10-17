import { createHmac, timingSafeEqual } from "node:crypto";

// Short signed tokens for links and buttons that must work without a session: "Taken" / "Snooze" on a
// push notification (the service worker may run with the app closed) and "Add to calendar" in an email.
export interface ActionClaims {
  h: string;   // household id
  p: string;   // profile id of the recipient
  d: string;   // care date
  r: string;   // rule id
  o: number;   // occurrence
  t: string;   // title for calendar / confirmation
  at: number;  // due time, epoch ms
  exp: number; // epoch ms
}

const b64 = (s: Buffer | string) => Buffer.from(s).toString("base64url");

function mac(body: string, secret: string) {
  return createHmac("sha256", `bloom-action:${secret}`).update(body).digest("base64url");
}

export function signAction(claims: ActionClaims, secret: string): string {
  const body = b64(JSON.stringify(claims));
  return `${body}.${mac(body, secret)}`;
}

export function verifyAction(token: string, secret: string, now: Date): ActionClaims | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ActionClaims;
    if (typeof claims.exp !== "number" || claims.exp < now.getTime()) return null;
    return claims;
  } catch {
    return null;
  }
}

// Private calendar-feed link for one member: {h: household, p: profile}. No expiry: it's a subscription URL.
// Rotating CRON_SECRET revokes every feed link.
export interface FeedClaims {
  h: string;
  p: string;
}

function feedMac(body: string, secret: string) {
  return createHmac("sha256", `bloom-feed:${secret}`).update(body).digest("base64url");
}

export function signFeed(claims: FeedClaims, secret: string): string {
  const body = b64(JSON.stringify(claims));
  return `${body}.${feedMac(body, secret)}`;
}

export function verifyFeed(token: string, secret: string): FeedClaims | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = Buffer.from(feedMac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as FeedClaims;
    return typeof c.h === "string" && typeof c.p === "string" ? c : null;
  } catch {
    return null;
  }
}

// Constant-time check of "Authorization: Bearer <secret>".
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
