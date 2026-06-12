import { NextResponse } from "next/server";
import { apiErrorResponse, getApiContext } from "@/lib/api-auth";
import { FEATURE_PERMISSIONS } from "@/lib/types";

export async function GET() {
  try {
    const { admin, profile } = await getApiContext();
    const permissions =
      profile.role === "owner"
        ? FEATURE_PERMISSIONS
        : (
            await admin
              .from("user_permissions")
              .select("permission")
              .eq("user_id", profile.id)
              .eq("enabled", true)
          ).data?.map((row) => row.permission) || [];
    const canUseBrands =
      permissions.includes("brand_database_view") ||
      permissions.includes("content_generate") ||
      permissions.includes("qc_check");

    if (!canUseBrands) {
      return NextResponse.json({ brands: [] });
    }

    const { data: brands, error } = await admin
      .from("brands")
      .select("*")
      .order("brand_name");

    if (error) {
      throw error;
    }

    return NextResponse.json({ brands });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
