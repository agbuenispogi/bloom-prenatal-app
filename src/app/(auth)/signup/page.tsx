import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account · Bloom" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const invite = typeof params.invite === "string" && /^[a-f0-9]{64}$/.test(params.invite) ? params.invite : undefined;
  const email = typeof params.email === "string" ? params.email : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-[2.125rem] leading-[1.1] text-balance">{invite ? "You're invited" : "Start your household"}</h1>
        <p className="text-[1.0625rem] text-pretty text-ink-soft">
          {invite
            ? "Create your account to join your household on Bloom."
            : "Bloom is invite-only. The first person creates the household, then invites the other."}
        </p>
      </header>
      <SignupForm invite={invite} email={email} />
    </main>
  );
}
