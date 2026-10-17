import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { applyRemember, authCookieOptions, REMEMBER_COOKIE, wantsRemember } from "./cookies";

// Paths reachable without a session.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth/", "/offline"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

// Refreshes the Supabase session on every request so she stays signed in for weeks,
// and sends signed-out visitors to /login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const remember = wantsRemember(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabasePublishableKey(), {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, applyRemember(options, remember));
        }
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Don't put code between client creation and getClaims(): it is what refreshes the token.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
