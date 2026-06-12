import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect, notFound } from "next/navigation"
import { ProblemIDEClient } from "./ProblemIDEClient"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = (await createClient()) as any
  const { data } = await (supabase as any)
    .from("coding_problems")
    .select("title")
    .eq("id", id)
    .single()

  return {
    title: data?.title ? `${data.title} — LogicLab` : "Problem — LogicLab",
    description: "Solve coding challenges on LogicLab",
  }
}

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const supabase = (await createClient()) as any

  // Fetch problem
  const { data: problem, error } = await (supabase as any)
    .from("coding_problems")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !problem) notFound()

  // Extract test cases from the embedded problem.test_cases column
  let parsedTestCases: any[] = problem.test_cases || []
  if (typeof parsedTestCases === "string") {
    try {
      parsedTestCases = JSON.parse(parsedTestCases)
    } catch {
      parsedTestCases = []
    }
  }

  const sampleTestCases = parsedTestCases
    .filter((tc: any) => tc.is_sample || tc.isSample)
    .map((tc: any, idx: number) => ({
      id: tc.id || String(idx),
      input: tc.input || "",
      expected_output: tc.expected_output || "",
    }))

  const totalTestCases = parsedTestCases.length

  // Fetch user's past submissions for this problem
  const { data: submissions } = await (supabase as any)
    .from("coding_submissions")
    .select("id, status, language_id, runtime, memory, passed_count, total_count, created_at")
    .eq("problem_id", id)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Fetch the previous problem
  const { data: prevData } = await (supabase as any)
    .from("coding_problems")
    .select("id")
    .lt("created_at", problem.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Fetch the next problem
  const { data: nextData } = await (supabase as any)
    .from("coding_problems")
    .select("id")
    .gt("created_at", problem.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  const prevProblemId = prevData?.id || null
  const nextProblemId = nextData?.id || null

  return (
    <ProblemIDEClient
      problem={problem}
      sampleTestCases={sampleTestCases ?? []}
      totalTestCases={totalTestCases ?? 0}
      submissions={submissions ?? []}
      userId={profile.id}
      userProfile={profile}
      prevProblemId={prevProblemId}
      nextProblemId={nextProblemId}
    />
  )
}
