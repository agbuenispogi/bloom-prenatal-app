import { notFound } from "next/navigation";
import { SCENARIOS, type ScenarioKey } from "@/lib/demo/scenarios";
import { DemoHome } from "./demo-home";

// Development-only preview of Home with synthetic data (no Supabase). 404 in production.
export default async function DevHome({ searchParams }: PageProps<"/dev/home">) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const s = (typeof params.s === "string" && params.s in SCENARIOS ? params.s : "caltrate") as ScenarioKey;
  const role = params.role === "caregiver" ? "caregiver" : "patient";
  return <DemoHome key={`${s}-${role}`} scenario={s} role={role} />;
}
