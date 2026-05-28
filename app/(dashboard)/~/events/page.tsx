// app/~/events/page.tsx

import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateEventsClient } from "./CandidateEventsClient"
import { InstituteEventsClient } from "./InstituteEventsClient"
import { UnderDevelopment } from "@/components/under-development"
import {
  deriveStatus,
  deriveInstituteEventStatus,
  type CandidateEvent,
  type InstituteEvent,
} from "./_types"

export const metadata = {
  title: "Events",
  description: "Manage and discover events",
}

// ─── Candidate data ───────────────────────────────────────────────────────────

async function fetchCandidateEvents(
  userId: string,
  nowStr: string,
  page: number,
  size: number,
  search: string,
  tab: string
): Promise<{
  events: CandidateEvent[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number }
}> {
  const supabase = (await createClient()) as any

  // 1. Resolve the candidate's institute
  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("institute_id")
    .eq("profile_id", userId)
    .maybeSingle()

  if (!candidateProfile?.institute_id) {
    return { events: [], count: 0, tabCounts: { all: 0, live: 0, upcoming: 0, past: 0 } }
  }

  // 2. Fetch candidate's registrations
  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("event_id, registered_at")
    .eq("candidate_id", userId)

  const registeredEventMap = new Map<string, string>()
  if (registrations) {
    registrations.forEach((r: any) => registeredEventMap.set(r.event_id, r.registered_at))
  }

  const searchFilter = (q: any) => {
    if (search.trim()) {
      const s = search.trim()
      return q.or(`title.ilike.%${s}%,description.ilike.%${s}%,speaker.ilike.%${s}%`)
    }
    return q
  }

  // 3. Count parallel queries for each tab matching the search term
  const allCountQuery = searchFilter(
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", candidateProfile.institute_id)
  )

  const liveCountQuery = searchFilter(
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", candidateProfile.institute_id)
      .lte("start_time", nowStr)
      .gte("end_time", nowStr)
  )

  const upcomingCountQuery = searchFilter(
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", candidateProfile.institute_id)
      .gt("start_time", nowStr)
  )

  const pastCountQuery = searchFilter(
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", candidateProfile.institute_id)
      .lt("end_time", nowStr)
  )

  const [countAllRes, countLiveRes, countUpcomingRes, countPastRes] = await Promise.all([
    allCountQuery,
    liveCountQuery,
    upcomingCountQuery,
    pastCountQuery,
  ])

  const tabCounts = {
    all: countAllRes.count ?? 0,
    live: countLiveRes.count ?? 0,
    upcoming: countUpcomingRes.count ?? 0,
    past: countPastRes.count ?? 0,
  }

  // 4. Main Paginated query
  const activeTab = ["all", "live", "upcoming", "past"].includes(tab) ? tab : "all"

  let query = supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .eq("institute_id", candidateProfile.institute_id)

  if (activeTab === "live") {
    query = query
      .lte("start_time", nowStr)
      .gte("end_time", nowStr)
  } else if (activeTab === "upcoming") {
    query = query.gt("start_time", nowStr)
  } else if (activeTab === "past") {
    query = query.lt("end_time", nowStr)
  }

  query = searchFilter(query)
  if (activeTab === "live") {
    query = query
      .order("end_time", { ascending: true })
      .order("start_time", { ascending: false })
  } else if (activeTab === "upcoming") {
    query = query
      .order("start_time", { ascending: true })
      .order("end_time", { ascending: true })
  } else if (activeTab === "past") {
    query = query
      .order("end_time", { ascending: false })
      .order("start_time", { ascending: false })
  } else {
    // "all" tab
    query = query
      .order("start_time", { ascending: false })
      .order("title", { ascending: true })
  }

  const from = (page - 1) * size
  const to = page * size - 1

  const { data: rawEvents, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching candidate events:", error)
    return { events: [], count: 0, tabCounts }
  }

  const events = (rawEvents ?? []).map((e: any): CandidateEvent => {
    return {
      id: e.id,
      title: e.title,
      description: e.description ?? null,
      speaker: e.speaker ?? null,
      start_time: e.start_time,
      end_time: e.end_time,
      venue: e.venue ?? null,
      meeting_link: e.meeting_link ?? null,
      event_type: e.event_type,
      is_registered: registeredEventMap.has(e.id),
      registered_at: registeredEventMap.get(e.id) ?? null,
      derived_status: deriveStatus(
        e.start_time,
        e.end_time,
        new Date(nowStr)
      ),
    }
  })

  return { events, count: count ?? 0, tabCounts }
}

// ─── Institute data ───────────────────────────────────────────────────────────

async function fetchInstituteEvents(
  userId: string,
  nowStr: string,
  page: number,
  size: number,
  search: string,
  tab: string
): Promise<{
  events: InstituteEvent[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}> {
  const supabase = (await createClient()) as any

  const searchFilter = (q: any) => {
    if (search.trim()) {
      const s = search.trim()
      return q.or(`title.ilike.%${s}%,description.ilike.%${s}%,speaker.ilike.%${s}%`)
    }
    return q
  }

  // 1. Count parallel queries for each tab matching the search term
  const [countAllRes, countDraftsRes, countLiveRes, countUpcomingRes, countPastRes] = await Promise.all([
    searchFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("institute_id", userId)),
    searchFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "draft")),
    searchFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "published").lte("start_time", nowStr).gte("end_time", nowStr)),
    searchFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "published").gt("start_time", nowStr)),
    searchFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "published").lt("end_time", nowStr)),
  ])

  const tabCounts = {
    all: countAllRes.count ?? 0,
    drafts: countDraftsRes.count ?? 0,
    live: countLiveRes.count ?? 0,
    upcoming: countUpcomingRes.count ?? 0,
    past: countPastRes.count ?? 0,
  }

  // 2. Main Paginated query
  let query = supabase
    .from("events")
    .select("*, event_registrations(count)", { count: "exact" })
    .eq("institute_id", userId)

  const activeTab = ["all", "live", "upcoming", "past", "drafts"].includes(tab) ? tab : "all"

  if (activeTab === "drafts") {
    query = query.eq("status", "draft")
  } else if (activeTab === "live") {
    query = query
      .eq("status", "published")
      .lte("start_time", nowStr)
      .gte("end_time", nowStr)
  } else if (activeTab === "upcoming") {
    query = query.eq("status", "published").gt("start_time", nowStr)
  } else if (activeTab === "past") {
    query = query.eq("status", "published").lt("end_time", nowStr)
  }

  query = searchFilter(query)
  if (activeTab === "all") {
    query = query
      .order("start_time", { ascending: false })
      .order("title", { ascending: true })
  } else if (activeTab === "drafts") {
    query = query.order("title", { ascending: true })
  } else if (activeTab === "live") {
    query = query
      .order("end_time", { ascending: true })
      .order("start_time", { ascending: false })
  } else if (activeTab === "upcoming") {
    query = query
      .order("start_time", { ascending: true })
      .order("end_time", { ascending: true })
  } else if (activeTab === "past") {
    query = query
      .order("end_time", { ascending: false })
      .order("start_time", { ascending: false })
  }

  const from = (page - 1) * size
  const to = page * size - 1

  const { data: rawEvents, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching institute events:", error)
    return { events: [], count: 0, tabCounts }
  }

  const events = (rawEvents ?? []).map((e: any): InstituteEvent => {
    // Supabase returns count as an array of objects e.g. [{count: 5}]
    const regCount = e.event_registrations?.[0]?.count ?? 0
    
    return {
      id: e.id,
      title: e.title,
      description: e.description ?? null,
      speaker: e.speaker ?? null,
      start_time: e.start_time,
      end_time: e.end_time,
      venue: e.venue ?? null,
      meeting_link: e.meeting_link ?? null,
      event_type: e.event_type,
      status: e.status as "draft" | "published",
      registration_count: regCount,
      derived_status: deriveInstituteEventStatus(
        e.status,
        e.start_time,
        e.end_time,
        new Date(nowStr)
      )
    }
  })

  return { events, count: count ?? 0, tabCounts }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SearchParams {
  page?: string
  size?: string
  search?: string
  tab?: string
}

export default async function EventsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile) return null

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const tab = params.tab || ""

  const nowStr = new Date().toISOString()

  if (profile.account_type === "candidate") {
    const { events, count, tabCounts } = await fetchCandidateEvents(
      profile.id,
      nowStr,
      page,
      size,
      search,
      tab
    )
    return (
      <CandidateEventsClient
        events={events}
        serverNow={nowStr}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        totalCount={count}
        tabCounts={tabCounts}
      />
    )
  }

  if (profile.account_type === "institute") {
    const { events, count, tabCounts } = await fetchInstituteEvents(
      profile.id,
      nowStr,
      page,
      size,
      search,
      tab
    )
    return (
      <InstituteEventsClient
        events={events}
        serverNow={nowStr}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        totalCount={count}
        tabCounts={tabCounts}
      />
    )
  }

  // Recruiter, admin, etc. — feature not yet available
  return <UnderDevelopment />
}
