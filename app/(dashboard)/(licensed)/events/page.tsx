import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { EventsStaffClient } from "./EventsStaffClient"
import { EventsCandidateClient } from "./EventsCandidateClient"
import type { EventListItem, CandidateEventListItem } from "./types"

export const metadata = {
  title: "Events",
  description: "Campus Events & Activities",
}

export default async function EventsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const supabase = await createClient()

  // ─── Staff / Institute view ──────────────────────────────────────────────
  if (profile.account_type !== "institute_candidate") {
    const { data: events, error } = await (supabase as any)
      .from("events")
      .select(`
        *,
        event_tickets(id, status, attendance_status)
      `)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching events for staff:", error)
    }

    const formattedEvents: EventListItem[] = (events ?? []).map((event: any) => {
      const tickets = event.event_tickets ?? []
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        venue: event.venue,
        capacity: event.capacity,
        status: event.status,
        targeting_rules: event.targeting_rules ?? { years: [], branches: [] },
        created_at: event.created_at,
        updated_at: event.updated_at,
        tickets_confirmed: tickets.filter((t: any) => t.status === "Confirmed").length,
        tickets_waitlisted: tickets.filter((t: any) => t.status === "Waitlisted").length,
        tickets_present: tickets.filter((t: any) => t.attendance_status === "Present").length,
      }
    })

    return <EventsStaffClient events={formattedEvents} />
  }

  // ─── Candidate view ──────────────────────────────────────────────────────
  const { data: events, error } = await (supabase as any)
    .from("events")
    .select(`
      id, title, description, date, venue, capacity, status, created_at,
      event_tickets(id, status, attendance_status, candidate_id)
    `)
    .eq("status", "Published")
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching events for candidate:", error)
  }

  const formattedEvents: CandidateEventListItem[] = (events ?? []).map((event: any) => {
    const allTickets = event.event_tickets ?? []
    const myTicket = allTickets.find((t: any) => t.candidate_id === profile.id && t.status !== "Cancelled")
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      venue: event.venue,
      capacity: event.capacity,
      status: event.status,
      created_at: event.created_at,
      tickets_confirmed: allTickets.filter((t: any) => t.status === "Confirmed").length,
      my_ticket_id: myTicket?.id ?? null,
      my_ticket_status: myTicket?.status ?? null,
      my_attendance_status: myTicket?.attendance_status ?? null,
    }
  })

  return <EventsCandidateClient events={formattedEvents} />
}
