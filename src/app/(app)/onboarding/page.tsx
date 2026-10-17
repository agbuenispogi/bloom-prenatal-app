import { savePushSubscription } from "@/app/actions/push";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireMember } from "@/lib/auth/session";
import { calendarFeedUrl } from "@/lib/calendar/link";

export const metadata = { title: "Set up · Bloom" };

export default async function Onboarding() {
  const { profile, household } = await requireMember();
  return <OnboardingFlow name={profile.display_name} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} save={savePushSubscription} calendarUrl={calendarFeedUrl(household.id, profile.id)} />;
}
