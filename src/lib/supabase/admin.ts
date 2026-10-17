import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Bypasses RLS. Only for server code that has already authorized the caller (reminders, summaries, cron).
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing env var SUPABASE_SECRET_KEY. See .env.example.");
  return createClient<Database, "bloom">(publicEnv.supabaseUrl(), key, {
    db: { schema: "bloom" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
