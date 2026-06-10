import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  noStore();
  try {
    const today = new Date().toISOString().split("T")[0]

    // 1. Try to fetch today's POTD directly (O(1) lookup)
    const { data: existingPotd } = await supabase
      .from("daily_challenges")
      .select("problem_id, coding_problems ( id, title, difficulty )")
      .eq("date", today)
      .single()

    if (existingPotd) {
      return NextResponse.json({ success: true, potd: existingPotd })
    }

    // 2. If it doesn't exist, trigger the Postgres function to generate it.
    // This pushes the O(1) random selection down to the database level,
    // avoiding the O(N) memory leak of pulling all problems into Node.
    await supabase.rpc("generate_daily_potd")

    // 3. Fetch the newly generated POTD
    const { data: newPotd, error } = await supabase
      .from("daily_challenges")
      .select("problem_id, coding_problems ( id, title, difficulty )")
      .eq("date", today)
      .single()

    if (error || !newPotd) {
      return NextResponse.json({ success: false, error: "Failed to generate POTD." }, { status: 500 })
    }

    return NextResponse.json({ success: true, potd: newPotd })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
