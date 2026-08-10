"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/actions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { getFriendlyErrorMessage } from "@/lib/errors"
import type { AttemptInfo } from "./_types"


// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the Supabase client and a normalised user object.
 *
 * Uses getUserProfile (which handles token refresh + race conditions) so that
 * long-running exam sessions — e.g. a 2-hour paper — don't fail with an
 * "Unauthorized" error the first time a save fires after the access token
 * silently expires in the background.
 */
async function requireAuth() {
  const supabase = await createClient()
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized or session expired")
  return { supabase, userId: profile.id }
}

/**
 * Ultra-fast auth check for high-frequency exam sync actions — uses JWT claims
 * without querying the profiles table.
 */
async function requireFastAuth() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized or session expired")
    return { supabase, userId: user.id }
  }
  return { supabase, userId }
}


// ─── Start Attempt ────────────────────────────────────────────────────────────
//
// Creates a new attempt row ONLY when the student clicks "Begin test".
// If an in-progress attempt already exists it is returned as-is (idempotent).
//
// Race condition mitigation: the INSERT uses a unique constraint on
// (test_id, candidate_id, attempt_number) rather than a client-side check so
// that two simultaneous clicks produce one attempt row, not two.
// ──────────────────────────────────────────────────────────────────────────────

export async function startAttemptAction(testId: string): Promise<AttemptInfo> {
  const { supabase, userId } = await requireAuth()

  // Fetch everything we need in a single round-trip.
  const [profileRes, testRes, existingRes, completedRes] = await Promise.all([
    (supabase as any)
      .from("profiles")
      .select(`
        institute_id
      `)
      .eq("id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("tests")
      .select(
        "status, institute_id, time_limit_seconds, max_attempts, available_from, available_until"
      )
      .eq("id", testId)
      .maybeSingle(),
    (supabase as any)
      .from("test_attempts")
      .select("id, started_at, expires_at, tab_switch_count, attempt_number")
      .eq("test_id", testId)
      .eq("candidate_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from("test_attempts")
      .select("*", { count: "exact", head: true })
      .eq("test_id", testId)
      .eq("candidate_id", userId)
      .in("status", ["submitted", "auto_submitted"]),
  ])

  const test = testRes.data
  const existingAttempt = existingRes.data

  if (
    !test ||
    test.status !== "published" ||
    test.institute_id !== profileRes.data?.institute_id
  ) {
    throw new Error("Test not available")
  }

  // Return the existing in-progress attempt; the client already has all
  // required state so we just refresh the server_time.
  if (existingAttempt) {
    return {
      id: existingAttempt.id,
      started_at: existingAttempt.started_at,
      server_time: new Date().toISOString(),
      expires_at: existingAttempt.expires_at,
      tab_switch_count: existingAttempt.tab_switch_count ?? 0,
      attempt_number: existingAttempt.attempt_number,
    }
  }

  // Validate the availability window for NEW attempts only.
  const now = new Date()
  if (test.available_from && new Date(test.available_from) > now) {
    throw new Error("Test is not yet open")
  }
  if (test.available_until && new Date(test.available_until) < now) {
    throw new Error("Test has closed")
  }

  const completedCount = completedRes.count ?? 0
  if (completedCount >= test.max_attempts) {
    throw new Error("Max attempts reached")
  }

  const attemptNumber = completedCount + 1
  const expiresAt = test.time_limit_seconds
    ? new Date(Date.now() + test.time_limit_seconds * 1000).toISOString()
    : null

  // The unique constraint on (test_id, candidate_id, attempt_number) turns a
  // concurrent duplicate INSERT into a conflict that we surface as a clear
  // error rather than silently creating two rows.
  const { data: newAttempt, error: insertError } = await (supabase as any)
    .from("test_attempts")
    .insert({
      test_id: testId,
      candidate_id: userId,
      attempt_number: attemptNumber,
      expires_at: expiresAt,
    })
    .select("id, started_at")
    .maybeSingle()

  if (insertError) {
    // Unique-violation code in Postgres is "23505".  Another tab won the race;
    // fetch the winning row instead of crashing.
    if (insertError.code === "23505") {
      const { data: racedAttempt } = await (supabase as any)
        .from("test_attempts")
        .select("id, started_at, expires_at, tab_switch_count, attempt_number")
        .eq("test_id", testId)
        .eq("candidate_id", userId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (racedAttempt) {
        return {
          id: racedAttempt.id,
          started_at: racedAttempt.started_at,
          server_time: new Date().toISOString(),
          expires_at: racedAttempt.expires_at,
          tab_switch_count: racedAttempt.tab_switch_count ?? 0,
          attempt_number: racedAttempt.attempt_number,
        }
      }
    }
    throw new Error(getFriendlyErrorMessage(insertError, "Failed to start the test. Please try again."))
  }

  if (!newAttempt) throw new Error("Failed to start attempt")

  return {
    id: newAttempt.id,
    started_at: newAttempt.started_at,
    server_time: new Date().toISOString(),
    expires_at: expiresAt,
    tab_switch_count: 0,
    attempt_number: attemptNumber,
  }
}


// ─── Sync Attempt (Combined Heartbeat + Answer Delta Batch) ───────────────────
export async function syncAction(
  attemptId: string,
  sessionToken: string,
  batch: Array<{
    questionId: string
    selectedOptionIds: string[]
    timeSpentSeconds: number
  }>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireFastAuth()

  const { data, error } = await (supabase as any).rpc("test_attempt_sync", {
    p_attempt_id: attemptId,
    p_session_token: sessionToken,
    p_batch: batch,
  })

  if (error) {
    console.error("[syncAction] RPC error:", error)
    return { ok: false, error: getFriendlyErrorMessage(error, "Failed to sync your answers. They are saved locally and will retry.") }
  }

  if (data?.error) {
    return { ok: false, error: getFriendlyErrorMessage(data, "An issue occurred during sync. Your answers are safe.") }
  }

  return { ok: true }
}


// ─── Claim Session ─────────────────────────────────────────────────────────────
export async function claimSessionAction(
  attemptId: string,
  sessionToken: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAuth()

  const { data, error } = await (supabase as any).rpc("test_attempt_claim_session", {
    p_attempt_id: attemptId,
    p_session_token: sessionToken,
  })

  if (error) {
    console.error("[claimSessionAction] RPC error:", error)
    return { ok: false, error: getFriendlyErrorMessage(error, "Failed to claim session. Please refresh and try again.") }
  }

  if (data?.error) {
    return { ok: false, error: getFriendlyErrorMessage(data, "Session could not be claimed. Please try again.") }
  }

  return { ok: true }
}


// ─── Submit Attempt ────────────────────────────────────────────────────────────
export async function submitAttemptAction(
  attemptId: string
): Promise<{ error?: string; redirectPath?: string }> {
  const { supabase, userId } = await requireAuth()

  const { data: ownerCheck } = await (supabase as any)
    .from("test_attempts")
    .select("id")
    .eq("id", attemptId)
    .eq("candidate_id", userId)
    .in("status", ["in_progress", "auto_submitted"])
    .maybeSingle()

  if (!ownerCheck) {
    return { error: "Attempt not found or already submitted" }
  }

  const { data: result, error } = await (supabase as any).rpc("test_attempt_grade", {
    p_attempt_id: attemptId,
  })

  if (error) {
    console.error("[submitAttemptAction] RPC error:", error)
    return { error: getFriendlyErrorMessage(error, "Failed to submit your test. Please try again.") }
  }

  const typedResult = result as { test_id?: string; error?: string } | null

  if (!typedResult) {
    return { error: "Received an empty response from server while grading." }
  }

  if (typedResult.error) {
    return { error: getFriendlyErrorMessage(typedResult, "Something went wrong during grading. Please contact your instructor.") }
  }

  return { redirectPath: typedResult.test_id ? `/tests/${typedResult.test_id}` : "/tests" }
}


// ─── Record Violation ──────────────────────────────────────────────────────────
//
// Keeps the attempt's tab_switch_count in sync with the client-side violation
// counter for auditing purposes.
//
// This action is fire-and-forget on the client — the server logs errors but
// does NOT throw so that a transient network hiccup never interrupts the exam.
// ──────────────────────────────────────────────────────────────────────────────

export async function recordViolationAction(
  attemptId: string,
  _type: "focus_loss" | "fullscreen_exit",
  totalCount: number,
  _timestamp: string
): Promise<void> {
  try {
    const { supabase, userId } = await requireAuth()

    const { error } = await (supabase as any)
      .from("test_attempts")
      .update({ tab_switch_count: totalCount })
      .eq("id", attemptId)
      .eq("candidate_id", userId)   // ownership guard
      .eq("status", "in_progress") // don't mutate a completed attempt

    if (error) {
      console.error("[recordViolationAction] update error:", error.message)
    }
  } catch (err) {
    // Intentionally swallowed: violation recording must never interrupt the exam.
    console.error("[recordViolationAction] unexpected error:", err)
  }
}


// ─── Submit Feedback ───────────────────────────────────────────────────────────
//
// Persists an optional star-rating + free-text feedback after the test is
// submitted.  One feedback per attempt (enforced by a UNIQUE on attempt_id).
// ──────────────────────────────────────────────────────────────────────────────

export async function submitFeedbackAction(
  attemptId: string,
  testId: string,
  data: {
    rating: number
    overallComment?: string
    bugsIssues?: string
    suggestions?: string
    difficultyFelt?: "too_easy" | "as_expected" | "too_hard"
  }
): Promise<void> {
  const { supabase, userId } = await requireAuth()

  // Verify ownership of the attempt
  const { data: ownerCheck } = await (supabase as any)
    .from("test_attempts")
    .select("id")
    .eq("id", attemptId)
    .eq("candidate_id", userId)
    .maybeSingle()

  if (!ownerCheck) {
    throw new Error("Attempt not found or unauthorized")
  }

  const { error } = await (supabase as any).from("test_attempt_feedbacks").insert({
    attempt_id: attemptId,
    candidate_id: userId,
    test_id: testId,
    rating: data.rating,
    overall_comment: data.overallComment ?? null,
    bugs_issues: data.bugsIssues ?? null,
    suggestions: data.suggestions ?? null,
    difficulty_felt: data.difficultyFelt ?? null,
  })

  if (error) {
    console.error("[submitFeedbackAction] insert error:", error)
    throw new Error(getFriendlyErrorMessage(error, "Failed to submit feedback. Please try again."))
  }
}