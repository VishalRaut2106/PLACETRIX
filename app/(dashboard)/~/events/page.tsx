// /* eslint-disable @typescript-eslint/no-explicit-any */
// // app/~/events/page.tsx

// import { createClient } from "@/lib/supabase/server"
// import { getUserProfile } from "@/lib/supabase/profile"
// import { CandidateEventsClient } from "@/app/(dashboard)/~/events/CandidateEventsClient"
// import { UnderDevelopment } from "@/components/under-development"
// import { deriveStatus, type CandidateEvent } from "./_types"

// export const metadata = {
//   title: "Events",
//   description: "Campus & Training Events",
// }

// // ─── Candidate Data Fetching ─────────────────────────────────────────────────
// async function fetchCandidateEvents(
//   userId: string,
//   now: string,
//   page: number,
//   size: number,
//   search: string,
//   tab: string
// ): Promise<{
//   events: CandidateEvent[]
//   count: number
//   tabCounts: { all: number; live: number; upcoming: number; past: number }
// }> {
//   const supabase = await createClient()

//   // 1. Resolve candidate's institute
//   const { data: candidateProfile } = await supabase
//     .from("candidate_profiles")
//     .select("institute_id")
//     .eq("profile_id", userId)
//     .maybeSingle()

//   if (!candidateProfile?.institute_id) {
//     return { events: [], count: 0, tabCounts: { all: 0, live: 0, upcoming: 0, past: 0 } }
//   }

//   const searchFilter = (q: any) => {
//     if (search.trim()) {
//       const s = search.trim()
//       return q.or(`title.ilike.%${s}%,description.ilike.%${s}%,speaker.ilike.%${s}%`)
//     }
//     return q
//   }

//   // 2. Tab Counters parallel queries
//   const allCountQuery = searchFilter(
//     supabase
//       .from("events")
//       .select("id", { count: "exact", head: true })
//       .eq("status", "published")
//       .eq("institute_id", candidateProfile.institute_id)
//   )

//   const liveCountQuery = searchFilter(
//     supabase
//       .from("events")
//       .select("id", { count: "exact", head: true })
//       .eq("status", "published")
//       .eq("institute_id", candidateProfile.institute_id)
//       .lte("start_time", now)
//       .gt("end_time", now)
//   )

//   const upcomingCountQuery = searchFilter(
//     supabase
//       .from("events")
//       .select("id", { count: "exact", head: true })
//       .eq("status", "published")
//       .eq("institute_id", candidateProfile.institute_id)
//       .gt("start_time", now)
//   )

//   const pastCountQuery = searchFilter(
//     supabase
//       .from("events")
//       .select("id", { count: "exact", head: true })
//       .eq("status", "published")
//       .eq("institute_id", candidateProfile.institute_id)
//       .lt("end_time", now)
//   )

//   const [allRes, liveRes, upcomingRes, pastRes] = await Promise.all([
//     allCountQuery,
//     liveCountQuery,
//     upcomingCountQuery,
//     pastCountQuery,
//   ])

//   const tabCounts = {
//     all: allRes.count ?? 0,
//     live: liveRes.count ?? 0,
//     upcoming: upcomingRes.count ?? 0,
//     past: pastRes.count ?? 0,
//   }

//   // 3. Paginated Main Query
//   const activeTab = ["all", "live", "upcoming", "past"].includes(tab) ? tab : "all"

//   let query = supabase
//     .from("events")
//     .select(
//       `
//       id, title, description, speaker, start_time, end_time, venue, meeting_link, event_type,
//       event_registrations!left (registered_at)
//     `,
//       { count: "exact" }
//     )
//     .eq("status", "published")
//     .eq("institute_id", candidateProfile.institute_id)
//     .eq("event_registrations.student_id", userId)

//   if (activeTab === "live") {
//     query = query.lte("start_time", now).gt("end_time", now)
//   } else if (activeTab === "upcoming") {
//     query = query.gt("start_time", now)
//   } else if (activeTab === "past") {
//     query = query.lt("end_time", now)
//   }

//   query = searchFilter(query)

//   // Order criteria matching active status timeline layouts
//   if (activeTab === "live" || activeTab === "upcoming") {
//     query = query.order("start_time", { ascending: true })
//   } else {
//     query = query.order("start_time", { ascending: false })
//   }

//   const from = (page - 1) * size
//   const to = page * size - 1
//   const { data: rawEvents, count, error } = await query.range(from, to)

//   if (error) {
//     console.error("Error fetching events:", error)
//     return { events: [], count: 0, tabCounts }
//   }

//   const events = (rawEvents ?? []).map((e: any): CandidateEvent => {
//     const registration = e.event_registrations?.[0]
//     return {
//       id: e.id,
//       title: e.title,
//       description: e.description ?? undefined,
//       speaker: e.speaker ?? undefined,
//       start_time: e.start_time,
//       end_time: e.end_time,
//       venue: e.venue ?? undefined,
//       meeting_link: e.meeting_link ?? undefined,
//       event_type: e.event_type ?? "workshop",
//       is_registered: !!registration,
//       registered_at: registration?.registered_at ?? undefined,
//       derived_status: deriveStatus(e.start_time, e.end_time, new Date(now)),
//     }
//   })

//   return { events, count: count ?? 0, tabCounts }
// }

// export default async function EventsPage(props: {
//   searchParams: Promise<SearchParams>
// }) {
//   const profile = await getUserProfile()
//   if (!profile) return null

//   const params = await props.searchParams
//   const page = Math.max(1, parseInt(params.page || "1", 10))
//   const size = Math.max(1, parseInt(params.size || "10", 10))
//   const search = params.search || ""
//   const tab = params.tab || ""

//   const nowStr = new Date().toISOString()

//   if (profile.account_type === "candidate") {
//     const { events, count, tabCounts } = await fetchCandidateEvents(
//       profile.id,
//       nowStr,
//       page,
//       size,
//       search,
//       tab
//     )
//     return (
//       <CandidateEventsClient
//         events={events}
//         serverNow={nowStr}
//         initialPage={page}
//         initialPageSize={size}
//         initialSearch={search}
//         initialTab={tab || "all"}
//         totalCount={count}
//         tabCounts={tabCounts}
//       />
//     )
//   }

//   // Fallback profile hooks for Institute if you expand it later
//   return <UnderDevelopment />
// }

// interface SearchParams {
//   page?: string
//   size?: string
//   search?: string
//   tab?: string
// }




//remove this when working on actual code.
import { UnderDevelopment } from "@/components/under-development";

export default function EventsPage() {
  return <UnderDevelopment />;
}