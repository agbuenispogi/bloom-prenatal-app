import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Household = Database["public"]["Tables"]["households"]["Row"];

// Verified identity from the JWT (getClaims validates the signature; never trust getSession on the server).
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

// For pages that need a household member. Signed-out → /login; signed-in without household → /welcome.
export async function requireMember(): Promise<{ profile: Profile; household: Household }> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/welcome");
  const supabase = await createClient();
  const { data: household } = await supabase.from("households").select("*").eq("id", profile.household_id).single();
  if (!household) redirect("/welcome");
  return { profile, household };
}

export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}
