import { notFound } from "next/navigation";
import { demoAllowed } from "@/lib/demo/allowed";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { AppFrame } from "@/components/shell/app-frame";

export default function DevOnboarding() {
  if (!demoAllowed()) notFound();
  return (
    <AppFrame nav={false}>
      <OnboardingFlow name="Love" vapidKey={null} save={null} todayHref="/dev/home" calendarUrl="#calendar-demo" />
    </AppFrame>
  );
}
