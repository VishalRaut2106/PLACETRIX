import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserProfile } from "@/lib/supabase/profile"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const supabase = createAdminClient()

export async function GET() {
  try {
    // Require authentication — random endpoint should not be callable by anyone
    const profile = await getUserProfile()
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Lightweight rate limit: 10 random picks per minute (prevents scraping all IDs)
    const rl = rateLimit("random", profile.id, 10, 60_000)
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    const { data: allProblems, error: allErr } = await supabase
      .from("logiclab_problems")
      .select("id")

    if (allErr || !allProblems || allProblems.length === 0) {
      return NextResponse.json({ success: false, error: "No problems available." }, { status: 404 })
    }

    const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)]

    return NextResponse.json({ success: true, id: (randomProblem as any).id })
  } catch (error: any) {
    console.error("Random Problem Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
