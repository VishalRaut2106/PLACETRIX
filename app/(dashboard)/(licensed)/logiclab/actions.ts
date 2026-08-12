"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_cache } from "next/cache"
import { Problem } from "./_types"

// Cache LogicLab global problems list for 1 hour
export const getCachedGlobalProblemsList = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient()
    
    const { data: problems } = await adminSupabase
      .from("logiclab_problems")
      .select("id, number, title, difficulty, created_at")
      .order("number", { ascending: true })

    return (problems as any[]) || []
  },
  ["global-problems-list-cache-v1"],
  { revalidate: 3600, tags: ["global-problems"] }
)

export async function getIdeProblemList(userId: string) {
  const supabase = (await createServerClient()) as any
  const { data: problems, error } = await supabase.rpc('get_ide_problem_list', { p_user_id: userId })
  
  if (error || !problems) {
    console.error("Error fetching IDE problem list via RPC:", error)
    return []
  }
  return problems
}

// Fetch single problem details, testcases and past submissions for SPA transition
export async function getProblemDataSPA(problemId: string, userId: string) {
  const supabase = (await createServerClient()) as any

  const { data: problem, error } = await supabase
    .from("logiclab_problems")
    .select("*")
    .eq("id", problemId)
    .maybeSingle()

  if (error || !problem) return null

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
      explanation: tc.explanation || "",
    }))

  const totalTestCases = parsedTestCases.length

  const { data: submissions } = await supabase
    .from("logiclab_problem_submissions")
    .select("id, status, language_id, runtime, memory, passed_count, total_count, created_at")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)

  const allProblems = await getCachedGlobalProblemsList()
  const currentIndex = allProblems.findIndex((p: any) => p.id === problemId)
  
  let prevProblemId = null
  let nextProblemId = null
  
  if (currentIndex > 0) {
    prevProblemId = (allProblems[currentIndex - 1] as any).id
  }
  if (currentIndex >= 0 && currentIndex < allProblems.length - 1) {
    nextProblemId = (allProblems[currentIndex + 1] as any).id
  }

  return {
    problem,
    sampleTestCases,
    totalTestCases,
    submissions: submissions || [],
    prevProblemId,
    nextProblemId
  }
}

// Cache daily challenge POTD metadata for 1 min
export const getCachedPotd = unstable_cache(
  async (todayStr: string) => {
    const adminSupabase = createAdminClient()
    const { data } = await (adminSupabase as any)
      .from("logiclab_daily_challenges")
      .select("id, problem_id, logiclab_problems ( id, title, difficulty )")
      .eq("date", todayStr)
      .maybeSingle()
    return data
  },
  ["daily-potd-cache"],
  { revalidate: 60, tags: ["potd"] }
)

// (Removed getCachedGlobalProblems as pagination is now natively handled by Postgres RPC)

// Infinite scroll pagination for daily challenges history
export async function fetchDailyChallengesInfinite({
  userId,
  offset = 0,
  limit = 20,
  search = "",
  tab = "all",
  difficulty = "All",
  tag = "All",
  sortBy = "date-desc",
  todayStr,
}: {
  userId: string
  offset?: number
  limit?: number
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
  sortBy?: string
  todayStr: string
}): Promise<{ challenges: any[]; hasMore: boolean }> {
  const supabase = (await createServerClient()) as any

  // Fetch all POTDs (excluding today)
  const { data: historyData, error } = await supabase
    .from("logiclab_daily_challenges")
    .select("id, date, problem_id, logiclab_problems ( id, number, title, difficulty, tags )")
    .neq("date", todayStr)
    .order("date", { ascending: false })

  if (error || !historyData) return { challenges: [], hasMore: false }

  // Fetch user submissions
  const dailyChallengeIds = historyData.map((h: any) => h.id)
  const problemIds = historyData.map((h: any) => h.problem_id)
  const { data: submissions } = await supabase
    .from("logiclab_daily_challenge_submissions")
    .select("daily_challenge_id, status")
    .eq("user_id", userId)
    .in("daily_challenge_id", dailyChallengeIds)

  const solvedMap: Record<string, string> = {}
  for (const sub of submissions ?? []) {
    if (sub.daily_challenge_id) {
      if (!solvedMap[sub.daily_challenge_id] || sub.status === "Accepted") {
        solvedMap[sub.daily_challenge_id] = sub.status
      }
    }
  }

  // Fetch problem stats in bulk
  const { data: statsData } = await supabase
    .from("logiclab_problem_stats")
    .select("problem_id, total_submissions, accepted_submissions")
    .in("problem_id", problemIds)

  const statsMap: Record<string, { total: number; accepted: number }> = {}
  for (const s of statsData ?? []) {
    statsMap[s.problem_id] = {
      total: s.total_submissions || 0,
      accepted: s.accepted_submissions || 0,
    }
  }

  // Enrich
  let enriched = historyData.map((h: any) => {
    const s = statsMap[h.problem_id] || { total: 0, accepted: 0 }
    const acceptanceRate = s.total > 0 ? Math.round((s.accepted / s.total) * 100) : 0
    return {
      id: h.id,
      date: h.date,
      problem_id: h.problem_id,
      number: h.logiclab_problems?.number,
      title: h.logiclab_problems?.title || "Unknown Problem",
      difficulty: (h.logiclab_problems?.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
      tags: (h.logiclab_problems?.tags || []) as string[],
      solved_status: solvedMap[h.id] || null,
      total_submissions: s.total,
      acceptance_rate: acceptanceRate,
    }
  })

  // Apply filters
  if (search) {
    const q = search.toLowerCase()
    enriched = enriched.filter(
      (p: any) =>
        p.title.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
    )
  }
  if (difficulty !== "All") {
    enriched = enriched.filter((p: any) => p.difficulty === difficulty)
  }
  if (tag !== "All") {
    enriched = enriched.filter((p: any) => (p.tags || []).includes(tag))
  }
  if (tab === "solved") enriched = enriched.filter((p: any) => p.solved_status === "Accepted")
  else if (tab === "attempted") enriched = enriched.filter((p: any) => p.solved_status && p.solved_status !== "Accepted")
  else if (tab === "unsolved") enriched = enriched.filter((p: any) => !p.solved_status)

  // Apply sorting
  if (sortBy === "date-desc") {
    enriched.sort((a: any, b: any) => b.date.localeCompare(a.date))
  } else if (sortBy === "date-asc") {
    enriched.sort((a: any, b: any) => a.date.localeCompare(b.date))
  } else if (sortBy === "difficulty-asc") {
    const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 }
    enriched.sort((a: any, b: any) => (rank[a.difficulty] || 0) - (rank[b.difficulty] || 0) || b.date.localeCompare(a.date))
  } else if (sortBy === "difficulty-desc") {
    const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 }
    enriched.sort((a: any, b: any) => (rank[b.difficulty] || 0) - (rank[a.difficulty] || 0) || b.date.localeCompare(a.date))
  } else if (sortBy === "title-asc") {
    enriched.sort((a: any, b: any) => a.title.localeCompare(b.title) || b.date.localeCompare(a.date))
  } else if (sortBy === "title-desc") {
    enriched.sort((a: any, b: any) => b.title.localeCompare(a.title) || b.date.localeCompare(a.date))
  }

  const page = enriched.slice(offset, offset + limit)
  const hasMore = offset + limit < enriched.length

  return { challenges: page, hasMore }
}

// Infinite scroll pagination for problems list
export async function fetchProblemsInfinite({
  userId,
  offset = 0,
  limit = 20,
  search = "",
  tab = "all",
  difficulty = "All",
  tag = "All",
  sortBy = "number-asc",
}: {
  userId: string
  offset?: number
  limit?: number
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
  sortBy?: string
}): Promise<{ problems: any[]; hasMore: boolean; totalCount: number }> {
  const supabase = (await createServerClient()) as any
  const { data, error } = await supabase.rpc('get_paginated_problems', {
    p_user_id: userId || null,
    p_limit: limit,
    p_offset: offset,
    p_search: search,
    p_tab: tab,
    p_difficulty: difficulty,
    p_tag: tag,
    p_sort_by: sortBy
  })

  if (!error && data) {
    const totalCount = data.length > 0 ? Number(data[0].total_count) : 0
    const hasMore = offset + limit < totalCount
    return { problems: data, hasMore, totalCount }
  }

  // Fallback if get_paginated_problems RPC fails or missing DB views
  console.warn("[fetchProblemsInfinite] RPC failed or missing, using fallback query:", error?.message)

  let query = supabase
    .from("logiclab_problems")
    .select("id, number, title, difficulty, tags, created_at")

  if (search) {
    query = query.ilike("title", `%${search}%`)
  }
  if (difficulty && difficulty !== "All") {
    query = query.eq("difficulty", difficulty)
  }
  if (tag && tag !== "All") {
    query = query.contains("tags", [tag])
  }

  query = query.order("number", { ascending: sortBy !== "number-desc" })

  const { data: rawProblems, error: fallErr } = await query

  if (fallErr || !rawProblems) {
    console.error("[fetchProblemsInfinite] Fallback error:", fallErr)
    return { problems: [], hasMore: false, totalCount: 0 }
  }

  let filteredProblems = rawProblems;

  if (tab !== "all" && userId) {
    if (tab === "solved" || tab === "unsolved") {
      const { data: solved } = await supabase.from('logiclab_user_solved_problems').select('problem_id').eq('user_id', userId);
      const solvedIds = new Set(solved?.map((s: any) => s.problem_id) || []);
      
      if (tab === "solved") {
        filteredProblems = filteredProblems.filter((p: any) => solvedIds.has(p.id));
      } else {
        filteredProblems = filteredProblems.filter((p: any) => !solvedIds.has(p.id));
      }
    } else if (tab === "attempted") {
      const { data: submissions } = await supabase.from('logiclab_problem_submissions').select('problem_id').eq('user_id', userId);
      const { data: solved } = await supabase.from('logiclab_user_solved_problems').select('problem_id').eq('user_id', userId);
      
      const attemptedIds = new Set(submissions?.map((s: any) => s.problem_id) || []);
      const solvedIds = new Set(solved?.map((s: any) => s.problem_id) || []);
      
      filteredProblems = filteredProblems.filter((p: any) => attemptedIds.has(p.id) && !solvedIds.has(p.id));
    }
  }

  const paginatedProblems = filteredProblems.slice(offset, offset + limit);
  const finalTotalCount = filteredProblems.length;
  const finalHasMore = offset + limit < finalTotalCount;

  // Fetch user solved status and problem submission stats across all submission tables
  let solvedSet = new Set<string>()
  const statsMap: Record<string, { total: number; accepted: number }> = {}

  if (paginatedProblems.length > 0) {
    const pIds = paginatedProblems.map((p: any) => p.id)
    pIds.forEach((id: string) => {
      statsMap[id] = { total: 0, accepted: 0 }
    })

    const [uSolved, pSubUser, dSubUser, allPSubs, allDSubs] = await Promise.all([
      userId
        ? supabase
            .from("logiclab_user_solved_problems")
            .select("problem_id")
            .eq("user_id", userId)
            .in("problem_id", pIds)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase
            .from("logiclab_problem_submissions")
            .select("problem_id")
            .eq("user_id", userId)
            .eq("status", "Accepted")
            .in("problem_id", pIds)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase
            .from("logiclab_daily_challenge_submissions")
            .select("problem_id")
            .eq("user_id", userId)
            .eq("status", "Accepted")
            .in("problem_id", pIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("logiclab_problem_submissions")
        .select("problem_id, status")
        .in("problem_id", pIds),
      supabase
        .from("logiclab_daily_challenge_submissions")
        .select("problem_id, status")
        .in("problem_id", pIds)
    ])

    if (uSolved.data) uSolved.data.forEach((s: any) => solvedSet.add(s.problem_id))
    if (pSubUser.data) pSubUser.data.forEach((s: any) => solvedSet.add(s.problem_id))
    if (dSubUser.data) dSubUser.data.forEach((s: any) => solvedSet.add(s.problem_id))

    const addStat = (s: any) => {
      if (statsMap[s.problem_id]) {
        statsMap[s.problem_id].total += 1
        if (s.status === "Accepted") {
          statsMap[s.problem_id].accepted += 1
        }
      }
    }
    if (allPSubs.data) allPSubs.data.forEach(addStat)
    if (allDSubs.data) allDSubs.data.forEach(addStat)
  }

  const enriched = paginatedProblems.map((p: any) => {
    const st = statsMap[p.id] || { total: 0, accepted: 0 }
    const acceptanceRate = st.total > 0 ? Math.round((st.accepted / st.total) * 100) : null
    return {
      ...p,
      solved_status: solvedSet.has(p.id) ? "Accepted" : null,
      acceptance_rate: acceptanceRate,
      total_submissions: st.total,
      total_count: finalTotalCount
    }
  })

  return { problems: enriched, hasMore: finalHasMore, totalCount: finalTotalCount }
}

// Cache execution-critical static data to eliminate DB reads on /run and /submit.
// Revalidate after 1 hour or when a problem is updated (tag: problem-exec-{id}).
export async function getCachedProblemExecutionData(problemId: string) {
  return unstable_cache(
    async () => {
      const adminSupabase = createAdminClient() as any
      const { data: problems, error } = await adminSupabase
        .from("logiclab_problems")
        .select("driver_codes, time_limit, memory_limit, test_cases")
        .eq("id", problemId)

      if (error || !problems || !problems.length) {
        return null
      }
      return problems[0]
    },
    [`problem-exec-${problemId}`],
    { revalidate: 3600, tags: [`problem-exec-${problemId}`] }
  )()
}
