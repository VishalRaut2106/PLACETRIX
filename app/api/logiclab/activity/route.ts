import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"

function toLocalYYYYMMDD(date: Date) {
  return date.toISOString().split("T")[0]
}

export async function GET() {
  try {
    const profile = await getUserProfile()
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = (await createClient()) as any

    const { data: userSubmissions, error } = await supabase
      .from("coding_submissions")
      .select("status, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true })

    if (error) throw error

    const uniqueDatesWithStatus = new Map<string, { solved: boolean; attempted: boolean; count: number }>()

    for (const sub of userSubmissions ?? []) {
      if (!sub.created_at) continue
      const localDate = new Date(sub.created_at)
      const dateStr = toLocalYYYYMMDD(localDate)
      const isAccepted = sub.status === "Accepted"
      
      const existing = uniqueDatesWithStatus.get(dateStr) || { solved: false, attempted: false, count: 0 }
      existing.count++
      if (isAccepted) {
        existing.solved = true
      } else {
        existing.attempted = true
      }
      uniqueDatesWithStatus.set(dateStr, existing)
    }

    const sortedDates = Array.from(uniqueDatesWithStatus.keys()).sort((a, b) => b.localeCompare(a))
    
    let currentStreak = 0
    let maxStreak = 0
    
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    
    const yesterday = new Date(today)
    yesterday.setUTCDate(today.getUTCDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    const hasActiveStreak = uniqueDatesWithStatus.has(todayStr) || uniqueDatesWithStatus.has(yesterdayStr)

    if (sortedDates.length > 0) {
      const ascDates = [...sortedDates].reverse()
      let prevDate: Date | null = null
      let tempStreak = 0
      
      for (const dStr of ascDates) {
        const currentDate = new Date(dStr)
        if (!prevDate) {
          tempStreak = 1
        } else {
          const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime())
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays <= 1) {
            tempStreak++
          } else {
            if (tempStreak > maxStreak) maxStreak = tempStreak
            tempStreak = 1
          }
        }
        prevDate = currentDate
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak

      if (hasActiveStreak) {
        const checkDate = uniqueDatesWithStatus.has(todayStr) ? new Date(today) : new Date(yesterday)
        let checkStr = checkDate.toISOString().split("T")[0]
        
        while (uniqueDatesWithStatus.has(checkStr)) {
          currentStreak++
          checkDate.setUTCDate(checkDate.getUTCDate() - 1)
          checkStr = checkDate.toISOString().split("T")[0]
        }
      }
    }

    if (currentStreak > maxStreak) maxStreak = currentStreak
    const streakStats = { currentStreak, maxStreak }

    const activityCalendar: any[] = []
    const daysToGenerate = 182 // 26 weeks * 7 days
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const activity = uniqueDatesWithStatus.get(dateStr)
      activityCalendar.push({
        date: dateStr,
        count: activity?.count || 0,
        status: activity?.solved ? "solved" : activity?.attempted ? "attempted" : "none",
        dayOfWeek: d.getUTCDay()
      })
    }

    return NextResponse.json({ success: true, streakStats, activityCalendar })

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
