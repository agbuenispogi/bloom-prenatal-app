// Concatenates supabase/migrations into one SQL file you can paste into the Supabase SQL Editor once.
// Used because Bloom shares a Supabase project with another app: `supabase db push` would compare against
// that app's migration history. Everything Bloom creates lives in the `bloom` schema.
// Usage: npm run db:bundle  →  supabase/bloom-install.sql
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const parts = files.map((f) => `-- ===== ${f} =====\n${readFileSync(`${dir}/${f}`, "utf8").trim()}\n`);
const out = `-- Bloom install bundle (${files.length} migrations). Run ONCE in Supabase → SQL Editor on a project
-- that has no \`bloom\` schema yet. It only creates objects in the \`bloom\` schema, plus the pg_cron job
-- 'bloom-dispatch-reminders'. It doesn't touch \`public\` or other apps.
begin;
${parts.join("\n")}
commit;
`;
writeFileSync("supabase/bloom-install.sql", out);
console.log(`wrote supabase/bloom-install.sql (${files.length} migrations)`);
