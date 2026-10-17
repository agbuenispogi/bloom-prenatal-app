import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth/session";
import { AcceptInviteForm, CreateHouseholdForm } from "./forms";

export const metadata = { title: "Welcome · Bloom" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  await requireUser();
  if (await getProfile()) redirect("/");
  const params = await searchParams;
  const invite = typeof params.invite === "string" && /^[a-f0-9]{64}$/.test(params.invite) ? params.invite : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{invite ? "Join your household" : "Set up your household"}</h1>
        <p className="opacity-70">
          {invite
            ? "One last step and you'll see the same reminders and timeline."
            : "We'll add the default regimen and shifts. You can edit everything later in Settings."}
        </p>
      </header>
      {invite ? <AcceptInviteForm token={invite} /> : <CreateHouseholdForm />}
    </main>
  );
}
