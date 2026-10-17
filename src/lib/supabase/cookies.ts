import type { CookieOptions } from "@supabase/ssr";

// "Keep me signed in" marker. "0" = auth cookies become session cookies (cleared when the browser closes).
export const REMEMBER_COOKIE = "bloom-remember";

// Auth cookies are httpOnly: all Supabase access goes through the server, never the browser.
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// @supabase/ssr always sets maxAge (400 days). When the user opted out of staying signed in,
// drop maxAge/expires so the cookie lives only for the browser session. Removals (maxAge 0) pass through.
export function applyRemember(options: CookieOptions, remember: boolean): CookieOptions {
  if (remember || !options.maxAge) return options;
  const session = { ...options };
  delete session.maxAge;
  delete session.expires;
  return session;
}

export function wantsRemember(value: string | undefined): boolean {
  return value !== "0";
}
