import {
  apiErrorResponseWithCookies,
  jsonWithAuthCookies,
  requireApiOwnerFromRequest
} from "@/lib/api-auth";
import { updateUserSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "PATCH /api/owner/users/[userId]";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const { userId } = await params;
    const parsed = updateUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonWithAuthCookies(
        { error: "Invalid user update." },
        { status: 400 },
        cookiesToSet,
        context
      );
    }

    const { error } = await admin
      .from("profiles")
      .update(parsed.data)
      .eq("id", userId);

    if (error) {
      throw error;
    }

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}
