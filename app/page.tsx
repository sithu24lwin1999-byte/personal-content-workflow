import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";

export default async function Home() {
  const { profile } = await getCurrentUserAndProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "owner") {
    redirect("/owner");
  }

  redirect("/dashboard");
}
