import {
  apiErrorResponseWithCookies,
  jsonWithAuthCookies,
  requireApiOwnerFromRequest
} from "@/lib/api-auth";
import { brandSchema } from "@/lib/validation";

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "PATCH /api/owner/brands/[brandId]";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const { brandId } = await params;
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
    const { error } = await admin
      .from("brands")
      .update({ ...payload, brand_name: brand_name.trim() })
      .eq("id", brandId);

    if (error) {
      throw error;
    }

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "DELETE /api/owner/brands/[brandId]";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const { brandId } = await params;
    const { error } = await admin.from("brands").delete().eq("id", brandId);

    if (error) {
      throw error;
    }

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}
