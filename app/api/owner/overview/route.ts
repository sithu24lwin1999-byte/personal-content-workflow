import { NextResponse } from "next/server";
import { apiErrorResponse, requireApiOwner } from "@/lib/api-auth";

export async function GET() {
  try {
    const { admin } = await requireApiOwner();
    const [users, permissions, brands, settings, usageLogs] = await Promise.all([
      admin.from("profiles").select("*").order("created_at", { ascending: false }),
      admin.from("user_permissions").select("*"),
      admin.from("brands").select("*").order("updated_at", { ascending: false }),
      admin.from("gemini_settings").select("*").eq("id", true).single(),
      admin
        .from("usage_logs")
        .select("*, profiles(email, full_name), brands(brand_name)")
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

    [users, permissions, brands, settings, usageLogs].forEach((result) => {
      if (result.error) {
        throw result.error;
      }
    });

    const rawSettings = settings.data;

    return NextResponse.json({
      users: users.data,
      permissions: permissions.data,
      brands: brands.data,
      settings: rawSettings
        ? {
            model_name: rawSettings.model_name,
            temperature: rawSettings.temperature,
            max_output_tokens: rawSettings.max_output_tokens,
            content_system_prompt: rawSettings.content_system_prompt,
            qc_system_prompt: rawSettings.qc_system_prompt,
            daily_usage_limit_default: rawSettings.daily_usage_limit_default,
            has_api_key: Boolean(rawSettings.api_key_encrypted)
          }
        : null,
      usageLogs: usageLogs.data
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
