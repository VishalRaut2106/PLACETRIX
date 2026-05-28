// app/~/events/[eventId]/page.tsx

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateEventDetailClient } from "./CandidateEventDetailClient"
import { InstituteEventDetailClient } from "./InstituteEventDetailClient"
import {
  togglePublishAction,
  deleteEventAction,
} from "./actions"
import type {
  CandidateEventDetail,
  InstituteEventDetail,
  EventRegistrationRow,
} from "../_types"


// ─── Candidate data ───────────────────────────────────────────────────────────

async function fetchCandidateView(
  eventId: string,
  userId: string
): Promise<CandidateEventDetail> {
  const supabase = (await createClient()) as any

  // 1. Resolve the candidate's institute
  const [profileRes, eventRes, regRes] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select("institute_id")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("events")
      .select("*, institute:institute_profiles(institute_name, logo_path)")
      .eq("id", eventId)
      .eq("status", "published")
      .single(),
    supabase
      .from("event_registrations")
      .select("registered_at")
      .eq("event_id", eventId)
      .eq("candidate_id", userId)
      .maybeSingle(),
  ])

  const candidateProfile = profileRes.data
  const raw = eventRes.data

  if (!candidateProfile?.institute_id || !raw || raw.institute_id !== candidateProfile.institute_id) {
    notFound()
  }

  const logoPath = (raw.institute as any)?.logo_path ?? null
  const instituteLogoUrl = logoPath
    ? supabase.storage.from("avatars").getPublicUrl(logoPath).data.publicUrl
    : null

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    speaker: raw.speaker ?? null,
    start_time: raw.start_time,
    end_time: raw.end_time,
    venue: raw.venue ?? null,
    meeting_link: raw.meeting_link ?? null,
    event_type: raw.event_type,
    institute_name: (raw.institute as any)?.institute_name ?? null,
    institute_logo_url: instituteLogoUrl,
    is_registered: !!regRes.data,
    registered_at: regRes.data?.registered_at ?? null,
  }
}


// ─── Institute data ───────────────────────────────────────────────────────────

async function fetchInstituteView(
  eventId: string,
  userId: string
): Promise<InstituteEventDetail> {
  const supabase = (await createClient()) as any

  const [eventRes, regsRes] = await Promise.all([
    supabase
      .from("events")
      .select("*, institute:institute_profiles(institute_name)")
      .eq("id", eventId)
      .eq("institute_id", userId)
      .single(),
    supabase
      .from("event_registrations")
      .select("id, candidate_id, registered_at, candidate:profiles(full_name, email)")
      .eq("event_id", eventId)
      .order("registered_at", { ascending: false }),
  ])

  const raw = eventRes.data
  if (!raw) notFound()

  const registrations: EventRegistrationRow[] = (regsRes.data ?? []).map((r: any) => ({
    id: r.id,
    candidate_id: r.candidate_id,
    candidate_name: r.candidate?.full_name ?? null,
    candidate_email: r.candidate?.email ?? null,
    registered_at: r.registered_at,
  }))

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    speaker: raw.speaker ?? null,
    start_time: raw.start_time,
    end_time: raw.end_time,
    venue: raw.venue ?? null,
    meeting_link: raw.meeting_link ?? null,
    event_type: raw.event_type,
    status: raw.status as "draft" | "published",
    institute_name: (raw.institute as any)?.institute_name ?? null,
    registrations,
  }
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  // Redirect "new" to events list
  if (eventId === "new") redirect("/~/events")

  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const serverNow = new Date().toISOString()

  if (profile.account_type === "candidate") {
    const event = await fetchCandidateView(eventId, profile.id)
    return <CandidateEventDetailClient event={event} serverNow={serverNow} />
  }

  if (profile.account_type === "institute") {
    const event = await fetchInstituteView(eventId, profile.id)
    return (
      <InstituteEventDetailClient
        eventId={eventId}
        event={event}
        serverNow={serverNow}
        onTogglePublish={togglePublishAction.bind(null, eventId)}
        onDeleteEvent={deleteEventAction.bind(null, eventId)}
      />
    )
  }

  // Recruiter / admin / other — not supported
  redirect("/~/events")
}
