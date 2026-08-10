import { getUserProfile } from "@/lib/supabase/profile"
import { requireActiveLicense } from "@/lib/supabase/license"
import { redirect } from "next/navigation"

/**
 * (licensed) route group layout
 *
 * Guards all feature routes under this group behind an active institute license.
 * Unauthenticated users are redirected to login.
 * Users without an active license are redirected to /home?license=<status>.
 * PlaceTrix admins (account_type === "admin") bypass all license checks.
 */
export default async function LicensedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // requireActiveLicense() redirects to /home?license=<status> if not active.
  // Returns null for admins (bypass).
  await requireActiveLicense(profile)

  // Enforce profile completeness for candidates, staff, and TPOs.
  const needsProfileCheck =
    profile.account_type === "institute_candidate" ||
    profile.account_type === "institute_staff" ||
    profile.account_type === "institute_placement_officer";

  if (needsProfileCheck && profile.profile_updated !== true) {
    redirect("/myprofile?incomplete=true")
  }

  return <>{children}</>
}
