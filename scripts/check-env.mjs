// Checks that every env var Bloom needs is present and well-formed. Prints names and problems, never values.
// Usage: node --env-file=.env.local scripts/check-env.mjs [--production]
const prod = process.argv.includes("--production");
const v = (k) => process.env[k] ?? "";
const checks = [
  ["NEXT_PUBLIC_SUPABASE_URL", (x) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(x), "https://<ref>.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", (x) => x.startsWith("sb_publishable_") || x.startsWith("eyJ"), "starts with sb_publishable_"],
  ["SUPABASE_SECRET_KEY", (x) => x.startsWith("sb_secret_") || x.startsWith("eyJ"), "starts with sb_secret_ (server only)"],
  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", (x) => /^[A-Za-z0-9_-]{80,90}$/.test(x), "87-char base64url"],
  ["VAPID_PRIVATE_KEY", (x) => /^[A-Za-z0-9_-]{40,46}$/.test(x), "43-char base64url"],
  ["VAPID_SUBJECT", (x) => /^mailto:.+@.+/.test(x) || x.startsWith("https://"), "mailto:you@domain"],
  ["RESEND_API_KEY", (x) => x.startsWith("re_"), "starts with re_", "optional"],
  ["EMAIL_FROM", (x) => /<[^@>]+@[^>]+>$/.test(x) || /^[^@\s]+@[^@\s]+$/.test(x), "Bloom <bloom@yourdomain.com>", "optional"],
  ["CRON_SECRET", (x) => x.length >= 24, "24+ random characters"],
  ["NEXT_PUBLIC_APP_URL", (x) => (prod ? x.startsWith("https://") : /^https?:\/\//.test(x)), prod ? "https://your-app.vercel.app" : "http://localhost:3000 or https://…"],
];
let bad = 0;
for (const [name, ok, hint, optional] of checks) {
  const val = v(name);
  if (!val && optional) {
    console.log(`– ${name.padEnd(38)} off (optional: email stays disabled, phones get everything)`);
    continue;
  }
  const status = !val ? "MISSING" : ok(val) ? "ok" : "LOOKS WRONG";
  if (status !== "ok") bad++;
  console.log(`${status === "ok" ? "✓" : "✗"} ${name.padEnd(38)} ${status === "ok" ? "" : `${status}: expected ${hint}`}`);
}
if (process.env.BLOOM_DEMO) {
  console.log("✗ BLOOM_DEMO is set: remove it (it exposes the demo pages)");
  bad++;
}
console.log(bad ? `\n${bad} to fix.` : "\nAll set.");
process.exit(bad ? 1 : 0);
