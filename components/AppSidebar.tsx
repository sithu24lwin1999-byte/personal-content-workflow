"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ClipboardCheck,
  Database,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield
} from "lucide-react";
import type { FeaturePermission, Profile } from "@/lib/types";

const userLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard#generator", label: "Generator", icon: Bot, permission: "content_generate" },
  { href: "/dashboard#qc", label: "QC Checker", icon: ClipboardCheck, permission: "qc_check" },
  { href: "/dashboard#brands", label: "Brands", icon: Database, permission: "brand_database_view" },
  { href: "/dashboard#history", label: "History", icon: History, permission: "history_view" }
] satisfies {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: FeaturePermission;
}[];

export function AppSidebar({
  profile,
  permissions
}: {
  profile: Profile;
  permissions: FeaturePermission[];
}) {
  const pathname = usePathname();
  const allowed = new Set(permissions);

  return (
    <aside className="flex min-h-dvh w-full flex-col border-r border-slate-200 bg-white p-4 lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
      <Link className="mb-7 flex items-center gap-3" href="/dashboard">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
          <Shield size={20} />
        </span>
        <span>
          <span className="block text-sm font-black uppercase text-slate-950">
            Workflow
          </span>
          <span className="block text-xs text-slate-500">Content Ops MVP</span>
        </span>
      </Link>

      <nav className="grid gap-1">
        {profile.role === "owner" ? (
          <Link
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold ${
              pathname.startsWith("/owner")
                ? "bg-teal-50 text-teal-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
            href="/owner"
          >
            <Settings size={17} />
            Owner Panel
          </Link>
        ) : null}
        {userLinks
          .filter((link) => !link.permission || allowed.has(link.permission))
          .map((link) => {
            const Icon = link.icon;
            return (
              <Link
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold ${
                  pathname === "/dashboard"
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                href={link.href}
                key={link.href}
              >
                <Icon size={17} />
                {link.label}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto rounded-lg bg-slate-50 p-3 text-sm">
        <div className="font-bold text-slate-950">{profile.email}</div>
        <div className="mt-1 text-xs uppercase text-slate-500">{profile.role}</div>
        <Link
          className="mt-3 flex items-center gap-2 text-sm font-bold text-rose-700"
          href="/logout"
        >
          <LogOut size={15} />
          Logout
        </Link>
      </div>
    </aside>
  );
}
