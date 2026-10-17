import { savePushSubscription } from "@/app/actions/push";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireMember } from "@/lib/auth/session";

export const metadata = { title: "Set up · Bloom" };

export default async function Onboarding() {
  const { profile } = await requireMember();
  return <OnboardingFlow name={profile.display_name} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} save={savePushSubscription} />;
}
