import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = emailSchema.safeParse((await request.json()).email);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${appUrl}/update-password`
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
