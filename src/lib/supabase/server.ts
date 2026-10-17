import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { applyRemember, authCookieOptions, REMEMBER_COOKIE, wantsRemember } from "./cookies";

// One client per request, acting as the signed-in user (RLS applies).
// `remember` overrides the stored preference (used by the sign-in action before the marker cookie is readable).
export async function createClient(opts: { remember?: boolean } = {}) {
  const store = await cookies();
  const remember = opts.remember ?? wantsRemember(store.get(REMEMBER_COOKIE)?.value);

  return createServerClient<Database, "bloom">(publicEnv.supabaseUrl(), publicEnv.supabasePublishableKey(), {
    db: { schema: "bloom" },
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, applyRemember(options, remember));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the session.
        }
      },
    },
  });
}
