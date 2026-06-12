import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getApiContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError("Not authenticated.", 401);
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    throw new ApiError("Profile not found.", 403);
  }

  if (!profile.is_active) {
    throw new ApiError("Account is inactive.", 403);
  }

  return { admin, profile, supabase, user };
}

export async function requireApiOwner() {
  const context = await getApiContext();

  if (context.profile.role !== "owner") {
    throw new ApiError("Owner access required.", 403);
  }

  return context;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status: 500 }
  );
}
