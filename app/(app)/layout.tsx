import { AppSidebar } from "@/components/AppSidebar";
import { requireActiveUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FeaturePermission } from "@/lib/types";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireActiveUser();
  const supabase = await createSupabaseServerClient();
  const { data: permissionRows } = await supabase
    .from("user_permissions")
    .select("permission, enabled")
    .eq("user_id", profile.id);
  const permissions =
    profile.role === "owner"
      ? ([
          "content_generate",
          "qc_check",
          "brand_database_view",
          "history_view",
          "export_output",
          "gemini_settings"
        ] satisfies FeaturePermission[])
      : ((permissionRows || [])
          .filter((row) => row.enabled)
          .map((row) => row.permission) as FeaturePermission[]);

  return (
    <div className="min-h-dvh bg-slate-50 lg:pl-72">
      <AppSidebar profile={profile} permissions={permissions} />
      <main className="px-5 py-6 sm:px-7 lg:px-9">{children}</main>
    </div>
  );
}
