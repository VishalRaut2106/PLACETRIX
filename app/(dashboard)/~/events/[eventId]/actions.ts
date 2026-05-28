"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/events/[eventId]/actions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { EventSettingsForm, InitialEventData } from "../_types"


// ─── Guard helpers ────────────────────────────────────────────────────────────

async function requireAuth(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) throw new Error("Not authenticated")
  return user.sub as string
}

async function assertEventOwner(eventId: string): Promise<string> {
  const userSub = await requireAuth()
  const supabase = (await createClient()) as any

  const { data: event, error } = await supabase
    .from("events")
    .select("institute_id")
    .eq("id", eventId)
    .single()

  if (error || !event) throw new Error("Event not found")
  if (event.institute_id !== userSub) throw new Error("Forbidden")

  return userSub
}


// ─── Load Event (for the editor) ──────────────────────────────────────────────

export async function loadEventAction(
  eventId: string,
  userId: string
): Promise<InitialEventData | null> {
  const authUserId = await requireAuth()
  if (authUserId !== userId) throw new Error("Unauthorized")
  const supabase = (await createClient()) as any

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("institute_id", userId)
    .single()

  if (!event) return null

  return {
    settings: {
      title: event.title ?? "",
      description: event.description ?? "",
      speaker: event.speaker ?? "",
      start_time: event.start_time ?? "",
      end_time: event.end_time ?? "",
      venue: event.venue ?? "",
      meeting_link: event.meeting_link ?? "",
      event_type: event.event_type ?? "",
    },
    status: event.status as "draft" | "published",
  }
}


// ─── Save Event (draft or published) ──────────────────────────────────────────

export async function saveEventAction(
  eventId: string,
  settings: EventSettingsForm,
  status: "draft" | "published"
): Promise<string> {
  const userSub = await requireAuth()
  const supabase = (await createClient()) as any

  const payload = {
    title: settings.title.trim(),
    description: settings.description.trim() || null,
    speaker: settings.speaker.trim() || null,
    start_time: settings.start_time || null,
    end_time: settings.end_time || null,
    venue: settings.venue.trim() || null,
    meeting_link: settings.meeting_link.trim() || null,
    event_type: settings.event_type || "workshop",
    status,
    institute_id: userSub,
    updated_at: new Date().toISOString(),
  }

  if (eventId === "new") {
    // Insert new event
    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single()

    if (error) throw new Error("Failed to create event: " + error.message)
    revalidatePath("/~/events")
    return data.id as string
  } else {
    // Update existing event
    await assertEventOwner(eventId)
    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", eventId)

    if (error) throw new Error("Failed to update event: " + error.message)
    revalidatePath("/~/events")
    revalidatePath(`/~/events/${eventId}`)
    return eventId
  }
}


// ─── Publish Event ────────────────────────────────────────────────────────────

export async function publishEventAction(
  eventId: string,
  settings: EventSettingsForm
): Promise<void> {
  if (!settings.title.trim()) throw new Error("Title is required.")
  if (!settings.start_time) throw new Error("Start time is required.")
  if (!settings.end_time) throw new Error("End time is required.")
  if (!settings.event_type) throw new Error("Event type is required.")

  await saveEventAction(eventId, settings, "published")
  revalidatePath("/~/events")
  redirect(`/~/events/${eventId}`)
}


// ─── Toggle Publish ───────────────────────────────────────────────────────────

export async function togglePublishAction(eventId: string): Promise<void> {
  await assertEventOwner(eventId)
  const supabase = (await createClient()) as any

  const { data: current } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single()

  const next = current?.status === "published" ? "draft" : "published"

  const { error } = await supabase
    .from("events")
    .update({ status: next })
    .eq("id", eventId)

  if (error) throw new Error("Failed to update status: " + error.message)
  revalidatePath(`/~/events/${eventId}`)
  revalidatePath("/~/events")
}


// ─── Delete Event ─────────────────────────────────────────────────────────────

export async function deleteEventAction(eventId: string): Promise<void> {
  await assertEventOwner(eventId)
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)

  if (error) throw new Error("Failed to delete event: " + error.message)

  revalidatePath("/~/events")
  redirect("/~/events")
}


// ─── Candidate Registration ──────────────────────────────────────────────────

export async function registerForEventAction(eventId: string): Promise<void> {
  const userSub = await requireAuth()
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from("event_registrations")
    .insert({
      event_id: eventId,
      candidate_id: userSub,
    })

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation — already registered
      return
    }
    throw new Error("Failed to register: " + error.message)
  }

  revalidatePath(`/~/events/${eventId}`)
  revalidatePath("/~/events")
}


export async function unregisterFromEventAction(eventId: string): Promise<void> {
  const userSub = await requireAuth()
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("candidate_id", userSub)

  if (error) throw new Error("Failed to unregister: " + error.message)

  revalidatePath(`/~/events/${eventId}`)
  revalidatePath("/~/events")
}
