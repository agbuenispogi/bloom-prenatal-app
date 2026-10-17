import { HomeLive } from "@/components/day/home-live";
import { requireMember } from "@/lib/auth/session";
import { loadDay } from "@/lib/data/day";
import { createClient } from "@/lib/supabase/server";
import { toHomeView } from "@/lib/view/home";

export default async function Home() {
  const { profile, household } = await requireMember();
  const supabase = await createClient();
  const day = await loadDay(supabase, household, profile, new Date());
  const view = toHomeView(day.input, day.schedule, { dueDate: day.settings.dueDate, role: profile.role, canLog: day.canLog });
  return <HomeLive view={view} tz={household.tz} />;
}
