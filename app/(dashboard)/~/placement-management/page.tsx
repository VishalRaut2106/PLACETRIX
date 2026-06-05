import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { PlacementListClient, PlacementRecord } from "./PlacementListClient"

export const metadata = {
  title: "Placement Management | PlaceTrix",
  description: "View and manage student placement records for your institution.",
}

interface SearchParams {
  page?: string
  size?: string
  search?: string
  placed?: string
  year?: string
  course?: string
  sortBy?: string
  sortOrder?: string
}

export default async function PlacementManagementPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute") {
    redirect("/~/home")
  }

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const placedFilter = (params.placed as "all" | "placed" | "not_placed") || "all"
  const passoutYear = params.year || ""
  const courseFilter = params.course || ""
  const sortBy = params.sortBy || "name"
  const sortOrder = params.sortOrder || "asc"

  const supabase = await createClient()

  // ── Fetch available filter options (years + courses for this institute) ──
  const { data: filterOptions } = await (supabase as any)
    .from("candidate_profiles")
    .select("passout_year, course_name")
    .eq("institute_id", profile.id)
    .not("passout_year", "is", null)

  const availableYears: number[] = Array.from(
    new Set<number>((filterOptions || []).map((r: any) => r.passout_year).filter(Boolean))
  ).sort((a, b) => b - a)

  const availableCourses: string[] = Array.from(
    new Set<string>(
      (filterOptions || []).map((r: any) => r.course_name).filter(Boolean)
    )
  ).sort()

  // ── Build query against candidate_profiles ────────────────────────────
  // We do NOT embed pt_mt_info here — PostgREST embedding via FK can silently
  // return empty arrays when RLS on the embedded table is evaluated separately.
  // Instead we fetch pt_mt_info in a second query and merge in code.
  let query = (supabase as any)
    .from("candidate_profiles")
    .select(
      `
      profile_id,
      course_name,
      passout_year,
      profile_image_path,
      profiles!inner (
        display_name
      )
    `,
      { count: "exact" }
    )
    .eq("institute_id", profile.id)

  // ── Placed filter ──────────────────────────────────────────────────────
  if (placedFilter === "placed") {
    const { data: placedIds } = await (supabase as any)
      .from("pt_mt_info")
      .select("candidate_uuid")
      .not("company_name", "is", null)

    const ids = (placedIds || []).map((r: any) => r.candidate_uuid)
    if (ids.length === 0) {
      query = query.eq("profile_id", "00000000-0000-0000-0000-000000000000")
    } else {
      query = query.in("profile_id", ids)
    }
  } else if (placedFilter === "not_placed") {
    const { data: placedIds } = await (supabase as any)
      .from("pt_mt_info")
      .select("candidate_uuid")
      .not("company_name", "is", null)

    const ids = (placedIds || []).map((r: any) => r.candidate_uuid)
    if (ids.length > 0) {
      query = query.not("profile_id", "in", `(${ids.join(",")})`)
    }
  }

  // ── Passout year filter ────────────────────────────────────────────────
  if (passoutYear) {
    query = query.eq("passout_year", parseInt(passoutYear, 10))
  }

  // ── Course filter ──────────────────────────────────────────────────────
  if (courseFilter) {
    query = query.eq("course_name", courseFilter)
  }

  // ── Search ─────────────────────────────────────────────────────────────
  if (search.trim()) {
    const s = search.trim()
    const { data: matchedProfiles } = await (supabase as any)
      .from("profiles")
      .select("id")
      .ilike("display_name", `%${s}%`)

    const matchedIds = (matchedProfiles || []).map((p: any) => p.id)
    if (matchedIds.length === 0) {
      query = query.eq("profile_id", "00000000-0000-0000-0000-000000000000")
    } else {
      query = query.in("profile_id", matchedIds)
    }
  }

  // ── Sorting ────────────────────────────────────────────────────────────
  const ascending = sortOrder === "asc"
  switch (sortBy) {
    case "name":
      query = query.order("profiles(display_name)", { ascending })
      break
    case "course":
      query = query.order("course_name", { ascending })
      break
    case "passout":
      query = query.order("passout_year", { ascending })
      break
    // company / ctc: sorted in code after merge
    default:
      query = query.order("profiles(display_name)", { ascending: true })
      break
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  const from = (page - 1) * size
  const to = page * size - 1

  const { data: rawData, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching placement records:", error)
  }

  // ── Fetch pt_mt_info separately for the returned profile IDs ───────────
  const profileIds: string[] = (rawData || []).map((r: any) => r.profile_id)

  const ptMap = new Map<string, { company_name: string | null; ctc: number | null }>()

  if (profileIds.length > 0) {
    const { data: ptData, error: ptError } = await (supabase as any)
      .from("pt_mt_info")
      .select("candidate_uuid, company_name, ctc")
      .in("candidate_uuid", profileIds)

    if (ptError) {
      console.error("Error fetching pt_mt_info:", ptError)
    }

    for (const row of ptData || []) {
      ptMap.set(row.candidate_uuid, {
        company_name: row.company_name ?? null,
        ctc: row.ctc ?? null,
      })
    }
  }

  // ── Merge ──────────────────────────────────────────────────────────────
  let records: PlacementRecord[] = (rawData || []).map((r: any) => {
    const pt = ptMap.get(r.profile_id)
    return {
      profile_id: r.profile_id,
      display_name: r.profiles?.display_name ?? "Unknown",
      course_name: r.course_name,
      passout_year: r.passout_year,
      company_name: pt?.company_name ?? null,
      ctc: pt?.ctc ?? null,
      profile_image_path: r.profile_image_path
        ? supabase.storage.from("avatars").getPublicUrl(r.profile_image_path).data.publicUrl
        : null,
    }
  })

  // ── Sort company/ctc in code after merge ───────────────────────────────
  if (sortBy === "company") {
    records = records.sort((a, b) => {
      const av = a.company_name ?? ""
      const bv = b.company_name ?? ""
      return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  } else if (sortBy === "ctc") {
    records = records.sort((a, b) => {
      const av = a.ctc ?? -Infinity
      const bv = b.ctc ?? -Infinity
      return ascending ? av - bv : bv - av
    })
  }


  const placedCount = records.filter((r) => r.company_name).length

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          Placement Management
        </h1>
        <p className="text-sm text-muted-foreground">
          {count ?? 0} student{count === 1 ? "" : "s"} registered
          {placedFilter === "all" && count && count > 0
            ? ` · ${placedCount} placed on this page`
            : ""}
          .
        </p>
      </div>

      <PlacementListClient
        records={records}
        totalCount={count ?? 0}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialPlacedFilter={placedFilter}
        initialPassoutYear={passoutYear}
        initialCourse={courseFilter}
        initialSortCol={sortBy as any}
        initialSortDir={sortOrder as "asc" | "desc"}
        availableYears={availableYears}
        availableCourses={availableCourses}
      />
    </div>
  )
}
