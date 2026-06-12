import {
  apiErrorResponseWithCookies,
  jsonWithAuthCookies,
  requireApiOwnerFromRequest
} from "@/lib/api-auth";
import { encryptSecret } from "@/lib/crypto";
import { geminiSettingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "PATCH /api/owner/settings";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin, profile } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const parsed = geminiSettingsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonWithAuthCookies(
        { error: "Invalid settings." },
        { status: 400 },
        cookiesToSet,
        context
      );
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

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}
