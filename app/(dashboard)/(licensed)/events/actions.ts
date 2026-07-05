"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import type { EventFormData, TicketStatus } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireStaff() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (!["institute", "admin"].includes(profile.account_type)) {
    throw new Error("Unauthorized: Only institute staff can perform this action.")
  }
  return profile
}

async function requireCandidate() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (profile.account_type !== "candidate") {
    throw new Error("Only candidates can perform this action.")
  }
  return profile
}

// ─── Staff Actions ────────────────────────────────────────────────────────────

export async function createEventAction(data: EventFormData) {
  const profile = await requireStaff()
  const supabase = await createClient()

  const { data: event, error } = await (supabase as any)
    .from("events")
    .insert({
      institute_id: profile.institute_id,
      title: data.title,
      description: data.description || null,
      date: data.date,
      venue: data.venue,
      capacity: data.capacity,
      status: data.status,
      targeting_rules: data.targeting_rules,
    })
    .select("id")
    .maybeSingle()

  if (error || !event) {
    console.error("Error creating event:", error)
    throw new Error(error?.message || "Failed to create event.")
  }

  revalidatePath("/events")
  return { success: true, eventId: event.id }
}

export async function updateEventAction(eventId: string, data: EventFormData) {
  await requireStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("events")
    .update({
      title: data.title,
      description: data.description || null,
      date: data.date,
      venue: data.venue,
      capacity: data.capacity,
      status: data.status,
      targeting_rules: data.targeting_rules,
    })
    .eq("id", eventId)

  if (error) {
    console.error("Error updating event:", error)
    throw new Error(error.message || "Failed to update event.")
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function deleteEventAction(eventId: string) {
  await requireStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("events")
    .delete()
    .eq("id", eventId)

  if (error) {
    console.error("Error deleting event:", error)
    throw new Error(error.message || "Failed to delete event.")
  }

  revalidatePath("/events")
  return { success: true }
}

export async function concludeEventAction(eventId: string) {
  await requireStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("events")
    .update({ status: "Concluded" })
    .eq("id", eventId)

  if (error) {
    console.error("Error concluding event:", error)
    throw new Error(error.message || "Failed to conclude event.")
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function markAttendanceAction(ticketId: string) {
  await requireStaff()
  const supabase = await createClient()

  // Check if ticket exists and is confirmed
  const { data: ticket, error: fetchError } = await (supabase as any)
    .from("event_tickets")
    .select("id, status, attendance_status, candidate_id")
    .eq("id", ticketId)
    .maybeSingle()

  if (fetchError || !ticket) {
    throw new Error("Ticket not found.")
  }

  if (ticket.status !== "Confirmed") {
    throw new Error("Only confirmed tickets can be checked in.")
  }

  if (ticket.attendance_status === "Present") {
    throw new Error("This attendee has already been checked in.")
  }

  const { error } = await (supabase as any)
    .from("event_tickets")
    .update({ attendance_status: "Present" })
    .eq("id", ticketId)

  if (error) {
    console.error("Error marking attendance:", error)
    throw new Error(error.message || "Failed to mark attendance.")
  }

  revalidatePath("/events")
  return { success: true, candidateId: ticket.candidate_id }
}

// ─── Candidate Actions ────────────────────────────────────────────────────────

export async function rsvpEventAction(eventId: string) {
  const profile = await requireCandidate()
  const supabase = await createClient()

  // Check current capacity
  const { count: confirmedCount } = await (supabase as any)
    .from("event_tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "Confirmed")

  const { data: event } = await (supabase as any)
    .from("events")
    .select("capacity")
    .eq("id", eventId)
    .maybeSingle()

  if (!event) throw new Error("Event not found.")

  const ticketStatus: TicketStatus = (confirmedCount ?? 0) >= event.capacity ? "Waitlisted" : "Confirmed"

  const { error } = await (supabase as any)
    .from("event_tickets")
    .insert({
      event_id: eventId,
      candidate_id: profile.id,
      status: ticketStatus,
    })

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already RSVP'd for this event.")
    }
    console.error("Error creating RSVP:", error)
    throw new Error(error.message || "Failed to RSVP.")
  }

  revalidatePath("/events")
  return { success: true, status: ticketStatus }
}

export async function cancelRsvpAction(eventId: string) {
  const profile = await requireCandidate()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("event_tickets")
    .update({ status: "Cancelled" })
    .eq("event_id", eventId)
    .eq("candidate_id", profile.id)

  if (error) {
    console.error("Error cancelling RSVP:", error)
    throw new Error(error.message || "Failed to cancel RSVP.")
  }

  revalidatePath("/events")
  return { success: true }
}
