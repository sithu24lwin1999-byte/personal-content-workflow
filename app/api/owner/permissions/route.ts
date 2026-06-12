import {
  apiErrorResponseWithCookies,
  jsonWithAuthCookies,
  requireApiOwnerFromRequest
} from "@/lib/api-auth";
import { permissionSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "PUT /api/owner/permissions";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const parsed = permissionSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonWithAuthCookies(
        { error: "Invalid permission payload." },
        { status: 400 },
        cookiesToSet,
        context
      );
    }

    const rows = Object.entries(parsed.data.permissions).map(
      ([permission, enabled]) => ({
        user_id: parsed.data.user_id,
        permission,
        enabled
      })
    );
    const { error } = await admin
      .from("user_permissions")
      .upsert(rows, { onConflict: "user_id,permission" });

    if (error) {
      throw error;
    }

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}
