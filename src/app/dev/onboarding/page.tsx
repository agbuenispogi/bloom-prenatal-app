import { notFound } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default function DevOnboarding() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OnboardingFlow name="Love" vapidKey={null} save={null} todayHref="/dev/home" />;
}
