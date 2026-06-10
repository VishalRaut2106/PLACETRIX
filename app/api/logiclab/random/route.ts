import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: allProblems, error: allErr } = await supabase
      .from("coding_problems")
      .select("id")

    if (allErr || !allProblems || allProblems.length === 0) {
      return NextResponse.json({ success: false, error: "No problems available." }, { status: 404 })
    }

    const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)]

    return NextResponse.json({ success: true, id: randomProblem.id })
  } catch (error: any) {
    console.error("Random Problem Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
