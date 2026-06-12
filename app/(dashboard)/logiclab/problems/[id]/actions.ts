"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"

const getCachedGlobalProblemsList = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: problems } = await adminSupabase
      .from("coding_problems")
      .select("id, title, difficulty, created_at")
      .order("created_at", { ascending: true })

    return problems || []
  },
  ["global-problems-list-cache-v1"],
  { revalidate: 3600 } // Cache for 1 hour
)

export async function getIdeProblemList(userId: string) {
  // 1. Fetch cached problems (0ms, no database load)
  const problems = await getCachedGlobalProblemsList()
  
  // 2. Fetch live user solved status
  const supabase = (await createServerClient()) as any
  const { data: solvedData } = await supabase
    .from("coding_submissions")
    .select("problem_id")
    .eq("user_id", userId)
    .eq("status", "Accepted")
    
  const solvedSet = new Set(solvedData?.map((s: any) => s.problem_id) || [])
  
  // 3. Merge and return lightweight array
  return problems.map((p: any, idx: number) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    number: idx + 1,
    isSolved: solvedSet.has(p.id)
  }))
}
