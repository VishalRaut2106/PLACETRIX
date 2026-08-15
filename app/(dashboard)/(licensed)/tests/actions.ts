"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { buildOptimizedStorageUrl } from "@/lib/storage"
import {
  deriveStatus,
  type CandidateTest,
  type CandidateTestAttempt,
  type InstituteTest,
} from "./_types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstituteFilterOptions {
  sort?: string
  duration?: string
  questions?: string
  results?: string
  marks?: string
  attempts?: string
  author?: string
  userId?: string
}

// ─── Server Actions ────────────────────────────────────────────────────────────

export async function getCandidateTestsAction({
  page,
  size,
  search,
  tab,
  now,
}: {
  page: number
  size: number
  search: string
  tab: string
  now: string
}): Promise<{
  tests: CandidateTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; attempted: number }
}> {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute_candidate") {
    throw new Error("Unauthorized")
  }
  if (!profile.institute_id) {
    return { tests: [], count: 0, tabCounts: { all: 0, live: 0, upcoming: 0, past: 0, attempted: 0 } }
  }
  return fetchCandidateTests(profile.id, profile.institute_id, now, page, size, search, tab)
}

export async function getInstituteTestsAction({
  page,
  size,
  search,
  tab,
  sort,
  duration,
  questions,
  results,
  marks,
  attempts,
  author,
  now,
}: {
  page: number
  size: number
  search: string
  tab: string
  sort?: string
  duration?: string
  questions?: string
  results?: string
  marks?: string
  attempts?: string
  author?: string
  now: string
}): Promise<{
  tests: InstituteTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}> {
  const profile = await getUserProfile()
  if (
    !profile ||
    !["admin", "institute_staff", "institute_placement_officer", "institute_primary"].includes(profile.account_type)
  ) {
    throw new Error("Unauthorized")
  }
  const instituteId = profile.institute_id ?? (profile.account_type === "admin" ? "" : null)
  if (instituteId === null) {
    throw new Error("No institute associated with profile")
  }
  return fetchInstituteTests(instituteId, now, page, size, search, tab, {
    sort,
    duration,
    questions,
    results,
    marks,
    attempts,
    author,
    userId: profile.id,
  })
}

// ─── Candidate Data Fetcher (High Performance Single-Pass RPC) ───────────────

async function fetchCandidateTests(
  userId: string,
  instituteId: string,
  now: string,
  page: number,
  size: number,
  search: string,
  tab: string
): Promise<{
  tests: CandidateTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; attempted: number }
}> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc("get_candidate_tests_overview", {
    p_user_id: userId,
    p_institute_id: instituteId || null,
    p_now: now,
    p_search: search.trim() || null,
    p_tab: tab || "all",
    p_page: page,
    p_size: size,
  })

  if (error || !data) {
    console.error("Error executing get_candidate_tests_overview RPC:", error)
    return {
      tests: [],
      count: 0,
      tabCounts: { all: 0, live: 0, upcoming: 0, past: 0, attempted: 0 },
    }
  }

  const tabCounts = {
    all: data.tab_counts?.all ?? 0,
    live: data.tab_counts?.live ?? 0,
    upcoming: data.tab_counts?.upcoming ?? 0,
    past: data.tab_counts?.past ?? 0,
    attempted: data.tab_counts?.attempted ?? 0,
  }

  const tests: CandidateTest[] = (data.tests ?? []).map((t: any): CandidateTest => {
    const rawAttempt = t.attempt
    let attempt: CandidateTestAttempt | undefined
    if (rawAttempt) {
      attempt = {
        status: rawAttempt.status as "in_progress" | "submitted",
        submitted_at: rawAttempt.submitted_at ?? undefined,
        score: rawAttempt.score != null ? Number(rawAttempt.score) : undefined,
        total_marks: rawAttempt.total_marks != null ? Number(rawAttempt.total_marks) : undefined,
        percentage: rawAttempt.percentage != null ? Number(rawAttempt.percentage) : undefined,
      }
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      time_limit_seconds: t.time_limit_seconds != null ? Number(t.time_limit_seconds) : undefined,
      available_from: t.available_from ?? undefined,
      available_until: t.available_until ?? undefined,
      derived_status: deriveStatus(
        "published",
        t.available_from,
        t.available_until,
        new Date(now)
      ) as CandidateTest["derived_status"],
      results_available: t.results_available ?? false,
      marks_available: t.marks_available ?? true,
      attempt,
      creator: (t.creator_name || t.creator_email || t.creator_avatar_path)
        ? {
            full_name: t.creator_name ?? null,
            email: t.creator_email ?? null,
            avatar_url: buildOptimizedStorageUrl("avatars", t.creator_avatar_path, {
              width: 64,
              height: 64,
              quality: 80,
              format: "webp",
            }),
          }
        : undefined,
    }
  })

  return { tests, count: data.total_count ?? 0, tabCounts }
}

// ─── Institute Data Fetcher (High Performance Single-Pass RPC) ───────────────

async function fetchInstituteTests(
  instituteId: string,
  now: string,
  page: number,
  size: number,
  search: string,
  tab: string,
  options?: InstituteFilterOptions
): Promise<{
  tests: InstituteTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc("get_institute_tests_overview", {
    p_institute_id: instituteId || null,
    p_now: now,
    p_search: search.trim() || null,
    p_tab: tab || "all",
    p_sort: options?.sort || "default",
    p_duration: options?.duration || "all",
    p_questions: options?.questions || "all",
    p_results: options?.results || "all",
    p_marks: options?.marks || "all",
    p_attempts: options?.attempts || "all",
    p_author: options?.author || "all",
    p_user_id: options?.userId || null,
    p_page: page,
    p_size: size,
  })

  if (error || !data) {
    console.error("Error executing get_institute_tests_overview RPC:", error)
    return {
      tests: [],
      count: 0,
      tabCounts: { all: 0, live: 0, upcoming: 0, past: 0, drafts: 0 },
    }
  }

  const tabCounts = {
    all: data.tab_counts?.all ?? 0,
    drafts: data.tab_counts?.drafts ?? 0,
    live: data.tab_counts?.live ?? 0,
    upcoming: data.tab_counts?.upcoming ?? 0,
    past: data.tab_counts?.past ?? 0,
  }

  const tests: InstituteTest[] = (data.tests ?? []).map((t: any): InstituteTest => ({
    id: t.id ?? "",
    title: t.title ?? "Untitled",
    description: t.description ?? undefined,
    time_limit_seconds: t.time_limit_seconds != null ? Number(t.time_limit_seconds) : undefined,
    available_from: t.available_from ?? undefined,
    available_until: t.available_until ?? undefined,
    derived_status: deriveStatus(
      t.status ?? "draft",
      t.available_from ?? null,
      t.available_until ?? null,
      new Date(now)
    ),
    status: (t.status as "draft" | "published") ?? "draft",
    results_available: t.results_available ?? false,
    marks_available: t.marks_available ?? true,
    question_count: t.question_count != null ? Number(t.question_count) : 0,
    attempt_count: t.attempt_count != null ? Number(t.attempt_count) : 0,
    avg_score_pct: t.avg_score_pct != null ? Number(t.avg_score_pct) : null,
    total_marks: t.total_marks != null ? Number(t.total_marks) : null,
    submitted_attempts: t.submitted_attempts != null ? Number(t.submitted_attempts) : null,
    created_by: t.created_by ?? null,
    creator: (t.creator_name || t.creator_email || t.creator_avatar_path)
      ? {
          full_name: t.creator_name ?? null,
          email: t.creator_email ?? null,
          avatar_url: buildOptimizedStorageUrl("avatars", t.creator_avatar_path, {
            width: 64,
            height: 64,
            quality: 80,
            format: "webp",
          }),
        }
      : undefined,
  }))

  return { tests, count: data.total_count ?? 0, tabCounts }
}
