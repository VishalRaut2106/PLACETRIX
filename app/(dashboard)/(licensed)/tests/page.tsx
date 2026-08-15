// app/(dashboard)/(licensed)/tests/page.tsx

import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { CandidateTestsClient } from "./CandidateTestsClient"
import { InstituteTestsClient } from "./InstituteTestsClient"
import { UnderDevelopment } from "@/components/under-development"
import { getCandidateTestsAction, getInstituteTestsAction } from "./actions"

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
    const { tests, count, tabCounts } = await getCandidateTestsAction({
      page: 1,
      size,
      search,
      tab,
      now: nowStr,
    })
    return (
      <CandidateTestsClient
        tests={tests}
        serverNow={nowStr}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        initialSort={params.sort || ""}
        initialDuration={params.duration || "all"}
        initialAttemptStatus={params.attemptStatus || "all"}
        totalCount={count}
        tabCounts={tabCounts}
      />
    )
  }

  if (profile.account_type === "institute_staff" || profile.account_type === "institute_placement_officer" || profile.account_type === "institute_primary") {
    const { tests, count, tabCounts } = await getInstituteTestsAction({
      page: 1,
      size,
      search,
      tab,
      sort: params.sort,
      duration: params.duration,
      questions: params.questions,
      results: params.results,
      marks: params.marks,
      attempts: params.attempts,
      author: params.author,
      now: nowStr,
    })
    return (
      <InstituteTestsClient
        tests={tests}
        serverNow={nowStr}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        initialSort={params.sort || ""}
        initialDuration={params.duration || "all"}
        initialQuestions={params.questions || "all"}
        initialResults={params.results || "all"}
        initialMarks={params.marks || "all"}
        initialAttempts={params.attempts || "all"}
        initialAuthor={params.author || "all"}
        currentUserId={profile.id}
        totalCount={count}
        tabCounts={tabCounts}
      />
    )
  }

  // Other account types — redirect to home
  redirect("/home")
}
