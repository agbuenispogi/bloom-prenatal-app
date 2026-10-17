import { HomeLive } from "@/components/day/home-live";
import { requireMember } from "@/lib/auth/session";
import { loadDay } from "@/lib/data/day";
import { createClient } from "@/lib/supabase/server";
import { fetchSnowflakeFeed, safeLink } from "@/lib/snowflake/feed";
import { toHomeView } from "@/lib/view/home";

export default async function Home() {
  const { profile, household } = await requireMember();
  const supabase = await createClient();
  const [day, feed] = await Promise.all([loadDay(supabase, household, profile, new Date()), fetchSnowflakeFeed()]);
  const latest = feed?.latest;
  const view = toHomeView(day.input, day.schedule, {
    // Bloom's own due date wins; otherwise borrow Baby Snowflake's so both show the same week.
    dueDate: day.settings.dueDate ?? feed?.dueDate ?? null,
    role: profile.role,
    canLog: day.canLog,
    snowflake: latest ? { title: latest.title, week: latest.week, date: latest.date, href: safeLink(latest.url) } : null,
  });
  return <HomeLive view={view} tz={household.tz} />;
}
