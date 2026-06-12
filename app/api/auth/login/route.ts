import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = loginSchema
      .extend({ next: z.string().startsWith("/").optional() })
      .safeParse(await request.json());

    if (!body.success) {
      return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.data.email,
      password: body.data.password
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Login failed." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .single();

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account is inactive." }, { status: 403 });
    }

    return NextResponse.json({
      redirectTo:
        body.data.next || (profile.role === "owner" ? "/owner" : "/dashboard")
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 }
    );
  }
}
