import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { signOut } from "./(auth)/actions";

// Interim home for Phase 2 (auth checkpoint). Phase 4 replaces this with the "Next up" card + Today timeline.
export default async function Home() {
  const { profile, household } = await requireMember();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Hi, {profile.display_name}</h1>
      <p className="opacity-70">
        You&apos;re signed in to <strong>{household.name}</strong> as the {profile.role}. The Next up screen arrives in Phase 4.
      </p>
      <Link href="/settings/household" className="flex min-h-12 items-center rounded-xl border border-foreground/25 px-5">
        Household &amp; invites
      </Link>
      <form action={signOut}>
        <button type="submit" className="min-h-12 rounded-xl px-5 underline">Sign out</button>
      </form>
    </main>
  );
}
