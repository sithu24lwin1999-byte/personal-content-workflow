import { NextResponse } from "next/server";
import { apiErrorResponse, getApiContext } from "@/lib/api-auth";
import type { FeaturePermission } from "@/lib/types";

export async function GET() {
  try {
    const { admin, profile } = await getApiContext();
    const { data: permissionRows } = await admin
      .from("user_permissions")
      .select("permission, enabled")
      .eq("user_id", profile.id);
    const permissions =
      profile.role === "owner"
        ? [
            "content_generate",
            "qc_check",
            "brand_database_view",
            "history_view",
            "export_output",
            "gemini_settings"
          ]
        : (permissionRows || [])
            .filter((row) => row.enabled)
            .map((row) => row.permission);
    const canUseBrands = permissions.some((permission) =>
      ["content_generate", "qc_check", "brand_database_view"].includes(permission)
    );
    const { data: brands } = canUseBrands
      ? await admin.from("brands").select("*").order("brand_name")
      : { data: [] };
    const { data: history } = permissions.includes("history_view")
      ? await admin
          .from("ai_outputs")
          .select("*, brands(brand_name)")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(25)
      : { data: [] };

    return NextResponse.json({
      profile,
      permissions: permissions as FeaturePermission[],
      brands,
      history
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
