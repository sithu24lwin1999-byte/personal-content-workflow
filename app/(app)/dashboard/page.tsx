import { requireActiveUser } from "@/lib/auth";
import { DashboardPanel } from "@/components/DashboardPanel";

export default async function DashboardPage() {
  await requireActiveUser();
  return <DashboardPanel />;
}
