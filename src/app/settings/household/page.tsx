import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";

export const metadata = { title: "Household · Bloom" };

export default async function HouseholdSettingsPage({ searchParams }: PageProps<"/settings/household">) {
  const { profile, household } = await requireMember();
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data: members } = await supabase.from("profiles").select("id, display_name, role").order("created_at");
  const hasPatient = members?.some((m) => m.role === "patient") ?? false;
  const full = (members?.length ?? 0) >= 2;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm underline opacity-70">← Home</Link>
        <h1 className="text-3xl font-semibold">{household.name}</h1>
        {created ? <p role="status">Household created. Now invite {profile.role === "caregiver" ? "her" : "your caregiver"}.</p> : null}
      </header>

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-lg font-semibold">Members</h2>
        <ul className="flex flex-col gap-2">
          {members?.map((m) => (
            <li key={m.id} className="flex min-h-12 items-center justify-between rounded-xl bg-foreground/5 px-4">
              <span>{m.display_name}{m.id === profile.id ? " (you)" : ""}</span>
              <span className="text-sm opacity-70">{m.role === "patient" ? "Patient" : "Caregiver"}</span>
            </li>
          ))}
        </ul>
      </section>

      {full ? null : (
        <section aria-labelledby="invite" className="flex flex-col gap-3">
          <h2 id="invite" className="text-lg font-semibold">Invite {hasPatient ? "a caregiver" : "the patient"}</h2>
          <InviteForm defaultRole={hasPatient ? "caregiver" : "patient"} />
        </section>
      )}
    </main>
  );
}
