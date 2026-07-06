import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { EventDetailStaffClient } from "./EventDetailStaffClient"
import { EventDetailCandidateClient } from "./EventDetailCandidateClient"

interface Params {
  eventId: string
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: event } = await (supabase as any)
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle()

  return {
    title: event?.title ?? "Event Details",
    description: "Event details and management",
  }
}

export default async function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const supabase = await createClient()

  // Fetch event
  const { data: event, error: eventError } = await (supabase as any)
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    redirect("/events")
  }

  // ─── Staff View ────────────────────────────────────────────────────────────
  if (profile.account_type !== "institute_candidate") {
    // Fetch tickets with candidate info
    const { data: tickets } = await (supabase as any)
      .from("event_tickets")
      .select(`
        id, status, attendance_status, candidate_id, created_at,
        profile:profiles!candidate_id(display_name, email),
        candidate:candidate_profiles!candidate_id(course_name, passout_year)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })

    const formattedTickets = (tickets ?? []).map((t: any) => ({
      id: t.id,
      event_id: eventId,
      candidate_id: t.candidate_id,
      status: t.status,
      attendance_status: t.attendance_status,
      created_at: t.created_at,
      candidate_name: t.profile?.display_name ?? "Unknown",
      candidate_email: t.profile?.email ?? "",
      candidate_course: t.candidate?.course_name ?? null,
      candidate_passout_year: t.candidate?.passout_year ?? null,
    }))

    return (
      <EventDetailStaffClient
        event={{
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          venue: event.venue,
          capacity: event.capacity,
          status: event.status,
        }}
        tickets={formattedTickets}
      />
    )
  }

  // ─── Candidate View ────────────────────────────────────────────────────────
  const { data: myTicket } = await (supabase as any)
    .from("event_tickets")
    .select("id, status, attendance_status")
    .eq("event_id", eventId)
    .eq("candidate_id", profile.id)
    .neq("status", "Cancelled")
    .maybeSingle()

  return (
    <EventDetailCandidateClient
      event={{
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        venue: event.venue,
        capacity: event.capacity,
        status: event.status,
      }}
      ticket={myTicket ? {
        id: myTicket.id,
        status: myTicket.status,
        attendance_status: myTicket.attendance_status,
      } : null}
      candidateName={profile.display_name}
    />
  )
}
