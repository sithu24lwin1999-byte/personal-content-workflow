import { NextResponse } from "next/server";
import { apiErrorResponse, requireApiOwner } from "@/lib/api-auth";
import { permissionSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  try {
    const { admin } = await requireApiOwner();
    const parsed = permissionSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid permission payload." },
        { status: 400 }
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
