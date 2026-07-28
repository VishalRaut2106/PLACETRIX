import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attemptId, type, count, timestamp } = body

    if (!attemptId || !type) {
      return NextResponse.json({ ok: false, error: "Missing parameters" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    await (supabase as any).rpc("record_attempt_violation", {
      p_attempt_id: attemptId,
      p_type: type,
      p_count: count ?? 1,
      p_timestamp: timestamp ?? new Date().toISOString()
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 })
  }
}
