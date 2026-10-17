import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
import { emailEnabled } from "@/lib/reminders/channels";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Bloom" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  if (await getAuthUser()) redirect(next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-[2.125rem] leading-[1.1] text-balance">Welcome back</h1>
        <p className="text-[1.0625rem] text-pretty text-ink-soft">Sign in once and Bloom keeps you signed in on this phone.</p>
      </header>
      <LoginForm next={next} magicLink={emailEnabled()} />
    </main>
  );
}
