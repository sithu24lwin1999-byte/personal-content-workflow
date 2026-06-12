import { requireOwner } from "@/lib/auth";
import { OwnerPanel } from "@/components/OwnerPanel";

export default async function OwnerPage() {
  await requireOwner();
  return <OwnerPanel />;
}
