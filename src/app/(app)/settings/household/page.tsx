import { SettingsPage } from "@/components/settings/settings-page";
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
    <SettingsPage title={household.name} intro={created ? "Your household is ready. Invite the other person to join." : undefined}>
      <section aria-labelledby="members" className="flex flex-col gap-2 pb-10">
        <h2 id="members" className="font-serif text-2xl">
          Members
        </h2>
        <ul className="border-t border-rule/70">
          {members?.map((m) => (
            <li key={m.id} className="flex min-h-14 items-center justify-between border-b border-rule/70">
              <span className="font-serif text-lg">
                {m.display_name}
                {m.id === profile.id ? <span className="font-sans text-base text-ink-soft"> (you)</span> : null}
              </span>
              <span className="text-[0.9375rem] text-ink-soft">{m.role === "patient" ? "Taking the medicines" : "Caregiver"}</span>
            </li>
          ))}
        </ul>
      </section>

      {full ? null : (
        <section aria-labelledby="invite" className="flex flex-col gap-3">
          <h2 id="invite" className="font-serif text-2xl">
            Invite {hasPatient ? "a caregiver" : "her"}
          </h2>
          <InviteForm defaultRole={hasPatient ? "caregiver" : "patient"} />
        </section>
      )}
    </SettingsPage>
  );
}
