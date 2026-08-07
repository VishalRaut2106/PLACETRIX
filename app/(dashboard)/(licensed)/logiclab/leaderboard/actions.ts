"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"

export interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  username: string
  avatar_path: string | null
  logiclab_points: number
  logiclab_solved_count: number
  current_streak?: number
  rank?: number
  difficulty_breakdown?: { easy: number, medium: number, hard: number }
  course_name?: string
  passout_year?: number
  latest_badge?: {
    id: string
    name: string
    icon_name: string
  } | null
}

const PAGE_SIZE = 50

export async function getLeaderboardAction(instituteId: string, page: number = 1): Promise<{ data: LeaderboardEntry[], totalCount: number }> {
  const supabase = (await createServerClient()) as any
  
  // Calculate offset
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, count, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, avatar_path, logiclab_points, logiclab_solved_count, current_streak", { count: "exact" })
    .eq("institute_id", instituteId)
    .neq("id", "a69f3a2d-0016-44e9-8b4c-4dd60c55cd49") // Hide test account
    .gt("logiclab_points", 0) // Only users with a score
    .order("logiclab_points", { ascending: false })
    .order("logiclab_solved_count", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error fetching leaderboard:", error)
    return { data: [], totalCount: 0 }
  }

  // 1. Calculate basic rank and parse avatars
  const rankedData = (data || []).map((user: any, index: number) => {
    let finalAvatar = user.avatar_path
    if (finalAvatar && !finalAvatar.startsWith('http')) {
      finalAvatar = supabase.storage.from('avatars').getPublicUrl(finalAvatar).data.publicUrl
    }
    
    return {
      ...user,
      avatar_path: finalAvatar,
      rank: from + index + 1,
      difficulty_breakdown: { easy: 0, medium: 0, hard: 0 }
    }
  })

  // 2. Fetch difficulty breakdown in bulk for these users
  const userIds = rankedData.map((u: any) => u.id)
  if (userIds.length > 0) {
    const { data: solvedData } = await supabase
      .from('logiclab_user_solved_problems')
      .select('user_id, logiclab_problems!inner(difficulty)')
      .in('user_id', userIds)
      
    if (solvedData) {
      // Tally them up
      const tallies: Record<string, { easy: number, medium: number, hard: number }> = {}
      for (const row of solvedData) {
        if (!tallies[row.user_id]) tallies[row.user_id] = { easy: 0, medium: 0, hard: 0 }
        const diff = row.logiclab_problems?.difficulty
        if (diff === 'Easy') tallies[row.user_id].easy++
        if (diff === 'Medium') tallies[row.user_id].medium++
        if (diff === 'Hard') tallies[row.user_id].hard++
      }
      
      // Attach to ranked data
      for (const user of rankedData) {
        if (tallies[user.id]) {
          user.difficulty_breakdown = tallies[user.id]
        }
      }
    }
    
    // 3. Fetch academic details (course and year) in bulk
    const { data: academicData } = await supabase
      .from('candidate_academic_details')
      .select('profile_id, passout_year, course:institute_courses(course_name)')
      .in('profile_id', userIds)
      
    if (academicData) {
      const academicMap: Record<string, { course_name?: string, passout_year?: number }> = {}
      for (const row of academicData) {
        academicMap[row.profile_id] = {
          course_name: row.course?.course_name,
          passout_year: row.passout_year
        }
      }
      
      for (const user of rankedData) {
        if (academicMap[user.id]) {
          user.course_name = academicMap[user.id].course_name
          user.passout_year = academicMap[user.id].passout_year
        }
      }
    }

    // 4. Fetch latest earned badge for these users
    const { data: userBadgesData } = await supabase
      .from('user_badges')
      .select('user_id, earned_at, logiclab_badges(id, name, icon_name)')
      .in('user_id', userIds)
      .order('earned_at', { ascending: false })

    if (userBadgesData) {
      const latestBadgeMap: Record<string, { id: string; name: string; icon_name: string }> = {}
      for (const row of userBadgesData) {
        if (!latestBadgeMap[row.user_id] && row.logiclab_badges) {
          const badgeObj = Array.isArray(row.logiclab_badges) ? row.logiclab_badges[0] : row.logiclab_badges
          if (badgeObj && badgeObj.name) {
            latestBadgeMap[row.user_id] = {
              id: badgeObj.id,
              name: badgeObj.name,
              icon_name: badgeObj.icon_name,
            }
          }
        }
      }

      for (const user of rankedData) {
        user.latest_badge = latestBadgeMap[user.id] || null
      }
    }
  }

  return { data: rankedData, totalCount: count || 0 }
}

export async function getCurrentUserRankAction(instituteId: string, userId: string, userPoints: number): Promise<number | null> {
  const supabase = (await createServerClient()) as any
  
  // A simple way to find rank is counting how many users in the same institute have a strictly higher score,
  // or same score but higher solved count.
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institute_id", instituteId)
    .neq("id", "a69f3a2d-0016-44e9-8b4c-4dd60c55cd49") // Hide test account
    .gt("logiclab_points", userPoints)

  if (error) {
    console.error("Error fetching user rank:", error)
    return null
  }
  
  return (count || 0) + 1
}
