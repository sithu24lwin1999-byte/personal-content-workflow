import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse, getApiContext } from "@/lib/api-auth";
import { decryptSecret } from "@/lib/crypto";
import { formatBrandContext, generateWithGemini } from "@/lib/gemini";
import { aiRequestSchema } from "@/lib/validation";

async function assertUsageAvailable(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdminClient>,
  userId: string,
  dailyLimit: number
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await admin
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) {
    throw error;
  }

  if ((count || 0) >= dailyLimit) {
    throw new ApiError("Daily usage limit reached.", 429);
  }
}

export async function POST(request: Request) {
  try {
    const { admin, profile } = await getApiContext();
    const parsed = aiRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Brand and brief are required." }, { status: 400 });
    }

    const [{ data: permission }, { data: brand }, { data: settings }] =
      await Promise.all([
        admin
          .from("user_permissions")
          .select("enabled")
          .eq("user_id", profile.id)
          .eq("permission", "content_generate")
          .maybeSingle(),
        admin.from("brands").select("*").eq("id", parsed.data.brand_id).single(),
        admin.from("gemini_settings").select("*").eq("id", true).single()
      ]);

    if (profile.role !== "owner" && !permission?.enabled) {
      throw new ApiError("Content generation is not enabled for this user.", 403);
    }

    if (!brand) {
      throw new ApiError("Brand not found.", 404);
    }

    if (!settings?.api_key_encrypted) {
      throw new ApiError("Gemini API key is not configured.", 400);
    }

    await assertUsageAvailable(
      admin,
      profile.id,
      profile.daily_usage_limit || settings.daily_usage_limit_default
    );

    const output = await generateWithGemini({
      apiKey: decryptSecret(settings.api_key_encrypted),
      model: settings.model_name,
      systemInstruction: settings.content_system_prompt,
      prompt: [
        "Create content from this brief using the brand data.",
        formatBrandContext(brand),
        `Brief:\n${parsed.data.input}`
      ].join("\n\n"),
      temperature: Number(settings.temperature),
      maxOutputTokens: settings.max_output_tokens
    });

    const [{ error: outputError }, { error: logError }] = await Promise.all([
      admin.from("ai_outputs").insert({
        user_id: profile.id,
        brand_id: brand.id,
        output_type: "content_generation",
        prompt: parsed.data.input,
        output,
        model_name: settings.model_name
      }),
      admin.from("usage_logs").insert({
        user_id: profile.id,
        feature: "content_generate",
        brand_id: brand.id,
        input_chars: parsed.data.input.length,
        output_chars: output.length,
        metadata: { model: settings.model_name }
      })
    ]);

    if (outputError || logError) {
      throw outputError || logError;
    }

    return NextResponse.json({ output });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
