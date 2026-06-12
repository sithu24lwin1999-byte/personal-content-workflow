import { NextResponse } from "next/server";
import { apiErrorResponse, requireApiOwner } from "@/lib/api-auth";
import { encryptSecret } from "@/lib/crypto";
import { geminiSettingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    const { admin, profile } = await requireApiOwner();
    const parsed = geminiSettingsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
    }

    const { api_key, ...settings } = parsed.data;
    const updatePayload: Record<string, unknown> = {
      ...settings,
      updated_by: profile.id
    };

    if (api_key?.trim()) {
      updatePayload.api_key_encrypted = encryptSecret(api_key.trim());
    }

    const { error } = await admin
      .from("gemini_settings")
      .update(updatePayload)
      .eq("id", true);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
