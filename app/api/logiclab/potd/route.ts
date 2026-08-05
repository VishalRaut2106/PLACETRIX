import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"

const supabase = createAdminClient()

export async function GET() {
  noStore();
  try {
    // POTD date is a global UTC calendar key — same for all users worldwide.
    const today = new Date().toISOString().split("T")[0]

    // 1. Try to fetch today's POTD directly (O(1) lookup)
    const { data: existingPotd } = await (supabase as any)
      .from("logiclab_daily_challenges")
      .select("id, problem_id, logiclab_problems ( id, title, difficulty )")
      .eq("date", today)
      .maybeSingle()

    if (existingPotd) {
      return NextResponse.json({ success: true, potd: existingPotd })
    }

    // If it doesn't exist yet, we just return nothing, because the Edge Function handles creation.
    return NextResponse.json({ success: true, potd: null })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
