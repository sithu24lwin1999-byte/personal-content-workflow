import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentUserAndProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile };
}

export async function requireActiveUser() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile?.is_active) {
    redirect("/login?error=inactive");
  }

  return { user, profile };
}

export async function requireOwner() {
  const { user, profile } = await requireActiveUser();

  if (profile.role !== "owner") {
    redirect("/dashboard");
  }

  return { user, profile };
}
