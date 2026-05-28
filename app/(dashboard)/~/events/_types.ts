/* eslint-disable @typescript-eslint/no-explicit-any */
// app/~/events/_types.ts

export type DerivedCandidateEventStatus = "live" | "upcoming" | "past"
export type DerivedInstituteEventStatus = "draft" | "live" | "upcoming" | "past"
export type EventType = "workshop" | "hackathon" | "webinar" | "bootcamp"

// ─── List-page types ──────────────────────────────────────────────────────────

export interface CandidateEvent {
    id: string
    title: string
    description?: string | null
    speaker?: string | null
    start_time: string
    end_time: string
    venue?: string | null
    meeting_link?: string | null
    event_type: string
    is_registered: boolean
    registered_at?: string | null
    derived_status: DerivedCandidateEventStatus
    current_derived_status?: DerivedCandidateEventStatus
}

export interface InstituteEvent {
    id: string
    title: string
    description?: string | null
    speaker?: string | null
    start_time: string
    end_time: string
    venue?: string | null
    meeting_link?: string | null
    event_type: string
    status: "draft" | "published"
    registration_count: number
    derived_status: DerivedInstituteEventStatus
    current_derived_status?: DerivedInstituteEventStatus
}

// ─── Detail-page types ────────────────────────────────────────────────────────

export interface CandidateEventDetail {
    id: string
    title: string
    description: string | null
    speaker: string | null
    start_time: string
    end_time: string
    venue: string | null
    meeting_link: string | null
    event_type: string
    institute_name: string | null
    institute_logo_url: string | null
    is_registered: boolean
    registered_at: string | null
}

export interface InstituteEventDetail {
    id: string
    title: string
    description: string | null
    speaker: string | null
    start_time: string
    end_time: string
    venue: string | null
    meeting_link: string | null
    event_type: string
    status: "draft" | "published"
    institute_name: string | null
    registrations: EventRegistrationRow[]
}

export interface EventRegistrationRow {
    id: string
    candidate_id: string
    candidate_name: string | null
    candidate_email: string | null
    registered_at: string
}

// ─── Editor types ─────────────────────────────────────────────────────────────

export interface EventSettingsForm {
    title: string
    description: string
    speaker: string
    start_time: string
    end_time: string
    venue: string
    meeting_link: string
    event_type: EventType | ""
}

export interface InitialEventData {
    settings: EventSettingsForm
    status: "draft" | "published"
}

// ─── Utils ────────────────────────────────────────────────────────────────────

export function formatDateTime(dt?: string | null): string {
    if (!dt) return "—"
    return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

export function deriveStatus(startTime: string, endTime: string, now: Date): DerivedCandidateEventStatus {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const current = now.getTime()

    if (current < start) return "upcoming"
    if (current >= start && current <= end) return "live"
    return "past"
}

export function deriveInstituteEventStatus(dbStatus: string, startTime: string, endTime: string, nowOverride?: Date): DerivedInstituteEventStatus {
    if (dbStatus === "draft") return "draft"

    const now = nowOverride ?? new Date()
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const current = now.getTime()

    if (current < start) return "upcoming"
    if (current >= start && current <= end) return "live"
    return "past"
}