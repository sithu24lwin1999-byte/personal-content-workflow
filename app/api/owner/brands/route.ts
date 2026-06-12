import {
  apiErrorResponseWithCookies,
  jsonWithAuthCookies,
  requireApiOwnerFromRequest
} from "@/lib/api-auth";
import { brandSchema } from "@/lib/validation";

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "POST /api/owner/brands";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin, profile } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const parsed = brandSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonWithAuthCookies(
        { error: "Invalid brand payload." },
        { status: 400 },
        cookiesToSet,
        context
      );
    }

    const { brand_name, ...fields } = parsed.data;
    const payload = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, nullableText(value)])
    );
    const { error } = await admin.from("brands").insert({
      ...payload,
      brand_name: brand_name.trim(),
      created_by: profile.id
    });

    if (error) {
      throw error;
    }

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}
