import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { getStaffMembers } from "./actions"
import { StaffManagementClient, CreateStaffDialog } from "./StaffManagementClient"

export const metadata = {
  title: "Staff Management | PlaceTrix",
  description: "Manage your institute's staff and TPO accounts.",
}

export default async function StaffManagementPage() {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute_primary") {
    redirect("/home")
  }

  const members = await getStaffMembers()

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {members.length} team member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <CreateStaffDialog />
      </div>

      <StaffManagementClient initialMembers={members} />
    </div>
  )
}
