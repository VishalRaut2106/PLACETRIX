import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"

export default async function LogicLabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // Block institute primary and TPO from LogicLab; staff can access
  if (profile.account_type === "institute_primary" || profile.account_type === "institute_placement_officer") {
    redirect("/home")
  }

  return <>{children}</>
}
