"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[testId]/actions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"


// ─── Guard helper ─────────────────────────────────────────────────────────────
// Verifies the authenticated user is the institute that owns the test.

async function requireAuth(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) throw new Error("Not authenticated")
  return user.sub as string
}

async function assertOwner(testId: string): Promise<string> {
  const profile = await getUserProfile()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_staff" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Forbidden")
  }

  const supabase = await createClient()

  const { data: test, error } = await (supabase as any)
    .from("tests")
    .select("institute_id")
    .eq("id", testId)
    .maybeSingle()

  if (error || !test) throw new Error("Test not found")
  if (test.institute_id !== profile.institute_id) throw new Error("Forbidden")

  return profile.id
}


// ─── Toggle Results ────────────────────────────────────────────────────────────
// Flips results_available. Students can/cannot see scores after this.

export async function toggleResultsAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data: current } = await (supabase as any)
    .from("tests")
    .select("results_available")
    .eq("id", testId)
    .maybeSingle()

  const { error } = await (supabase as any)
    .from("tests")
    .update({ results_available: !current?.results_available })
    .eq("id", testId)

  if (error) throw new Error("Failed to toggle results: " + error.message)
  revalidatePath(`/tests/${testId}`)
}


// ─── Toggle Publish ────────────────────────────────────────────────────────────
// draft → published  or  published → draft.
// Archived tests are not touched here.

export async function togglePublishAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data: current } = await (supabase as any)
    .from("tests")
    .select("status")
    .eq("id", testId)
    .maybeSingle()

  if (current?.status === "archived") throw new Error("Cannot publish an archived test.")

  const next = current?.status === "published" ? "draft" : "published"

  const { error } = await (supabase as any)
    .from("tests")
    .update({ status: next })
    .eq("id", testId)

  if (error) throw new Error("Failed to update status: " + error.message)
  revalidatePath(`/tests/${testId}`)
  revalidatePath("/tests")
}


// ─── Delete Test ───────────────────────────────────────────────────────────────
// Hard-deletes the test row. Cascade removes questions, options, attempts.

export async function deleteTestAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("tests")
    .delete()
    .eq("id", testId)

  if (error) throw new Error("Failed to delete test: " + error.message)

  revalidatePath("/tests")
  redirect("/tests")
}


// ─── Delete Attempt ───────────────────────────────────────────────────────────
// Hard-deletes a single test attempt. Cascade removes answers.

export async function deleteAttemptAction(testId: string, attemptId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("test_attempts")
    .delete()
    .eq("id", attemptId)
    .eq("test_id", testId) // safety check

  if (error) throw new Error("Failed to delete attempt: " + error.message)

  revalidatePath(`/tests/${testId}`)
}


// ─── Clear All Attempts ────────────────────────────────────────────────────────
// Hard-deletes ALL attempts for a test. Useful when reusing a test for a new cohort.

export async function clearAllAttemptsAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("test_attempts")
    .delete()
    .eq("test_id", testId)

  if (error) throw new Error("Failed to clear attempts: " + error.message)

  revalidatePath(`/tests/${testId}`)
}

// ─── Fetch All Attempts for Export ────────────────────────────────────────────

export async function fetchAllTestAttemptsForExportAction(testId: string) {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("test_attempts")
    .select(
      "id, tab_switch_count, status, score, total_marks, percentage, time_spent_seconds, started_at, submitted_at, profile:profiles!candidate_id(full_name, email, candidate_academic_details(passout_year, course:institute_courses(course_name)))"
    )
    .eq("test_id", testId)
    .not("started_at", "is", null)
    .order("started_at", { ascending: false })

  if (error) {
    throw new Error("Failed to fetch attempts for export: " + error.message)
  }

  // Format exactly like mapAttemptRow in page.tsx
  return (data || []).map((a: any) => {
    const cad = Array.isArray(a.profile?.candidate_academic_details)
      ? a.profile?.candidate_academic_details[0]
      : a.profile?.candidate_academic_details;
    
    const courseName = Array.isArray(cad?.course)
      ? cad?.course[0]?.course_name
      : cad?.course?.course_name;

    return {
      id: a.id,
      student_name: a.profile?.full_name ?? "Unknown",
      student_email: a.profile?.email ?? "Unknown",
      status: a.status,
      score: a.score ?? null,
      total_marks: a.total_marks ?? null,
      percentage: a.percentage ?? null,
      time_spent_seconds: a.time_spent_seconds ?? null,
      started_at: a.started_at,
      submitted_at: a.submitted_at ?? null,
      tab_switch_count: a.tab_switch_count ?? null,
      branch: courseName ?? null,
      passout_year: cad?.passout_year ?? null,
    }
  })
}