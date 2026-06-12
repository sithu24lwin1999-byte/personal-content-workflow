import {
  apiErrorResponseWithCookies,
  jsonWithAuthCookies,
  requireApiOwnerFromRequest
} from "@/lib/api-auth";
import { FEATURE_PERMISSIONS } from "@/lib/types";
import { createUserSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let cookiesToSet: Awaited<
    ReturnType<typeof requireApiOwnerFromRequest>
  >["cookiesToSet"] = [];
  const context = "POST /api/owner/users";

  try {
    const apiContext = await requireApiOwnerFromRequest(request, context);
    const { admin } = apiContext;
    cookiesToSet = apiContext.cookiesToSet;
    const parsed = createUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonWithAuthCookies(
        { error: "Invalid user payload." },
        { status: 400 },
        cookiesToSet,
        context
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name || "" }
    });

    if (error || !data.user) {
      throw error || new Error("Could not create user.");
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.full_name || null,
      role: parsed.data.role,
      daily_usage_limit: parsed.data.daily_usage_limit
    });

    if (profileError) {
      throw profileError;
    }

    const { error: permissionError } = await admin.from("user_permissions").insert(
      FEATURE_PERMISSIONS.map((permission) => ({
        user_id: data.user.id,
        permission,
        enabled: parsed.data.role === "owner"
      }))
    );

    if (permissionError) {
      throw permissionError;
    }

    return jsonWithAuthCookies({ ok: true }, undefined, cookiesToSet, context);
  } catch (error) {
    return apiErrorResponseWithCookies(error, cookiesToSet, context);
  }
}
