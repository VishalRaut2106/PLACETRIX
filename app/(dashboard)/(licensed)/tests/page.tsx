// app/(dashboard)/(licensed)/tests/page.tsx

import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { CandidateTestsClient } from "./CandidateTestsClient"
import { FoldersDashboardClient } from "./FoldersDashboardClient"
import { UnderDevelopment } from "@/components/under-development"

interface SearchParams {
  page?: string
  size?: string
  search?: string
  tab?: string
  sort?: string
  duration?: string
  questions?: string
  results?: string
  marks?: string
  attempts?: string
  author?: string
  attemptStatus?: string
  folder?: string
}

export const metadata = {
  title: "Tests",
  description: "Tests",
}

export default async function TestsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile) return null

  const params = await props.searchParams
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const tab = params.tab || ""
  const nowStr = new Date().toISOString()

  if (profile.account_type === "institute_candidate") {
    return (
      <CandidateTestsClient
        userId={profile.id}
        instituteId={profile.institute_id}
        serverNow={nowStr}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        initialSort={params.sort || ""}
        initialDuration={params.duration || "all"}
        initialAttemptStatus={params.attemptStatus || "all"}
      />
    )
  }

  if (
    profile.account_type === "institute_staff" ||
    profile.account_type === "institute_placement_officer" ||
    profile.account_type === "institute_primary"
  ) {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data: initialFolders } = await (supabase as any)
      .from("test_folders")
      .select("*")
      .eq("institute_id", profile.institute_id || "")
      .order("name", { ascending: true })

    const { count: totalTestsCount } = await (supabase as any)
      .from("tests")
      .select("*", { count: "exact", head: true })
      .eq("institute_id", profile.institute_id || "")

    return (
      <FoldersDashboardClient
        instituteId={profile.institute_id || ""}
        initialFolders={initialFolders || []}
        totalTestsCount={totalTestsCount || 0}
      />
    )
  }

  // Other account types — redirect to home
  redirect("/home")
}
