// Central env access. Throws early with a clear message instead of failing deep inside a client.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var ${name}. See .env.example.`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  // Public address for links in emails, push and calendar feeds. A localhost value never wins on Vercel:
  // there the production domain Vercel provides is used instead.
  appUrl: () => {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (configured && !(vercel && /localhost|127\.0\.0\.1/.test(configured))) return configured.replace(/\/$/, "");
    if (vercel) return `https://${vercel}`;
    return "http://localhost:3000";
  },
};
