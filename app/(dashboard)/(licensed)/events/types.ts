// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/events/types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type EventStatus = "Draft" | "Published" | "Concluded"
export type TicketStatus = "Confirmed" | "Waitlisted" | "Cancelled"
export type AttendanceStatus = "Pending" | "Present"

export interface EventTargetingRules {
  years: number[]
  branches: string[]
}

export interface EventListItem {
  id: string
  title: string
  description: string | null
  date: string
  venue: string
  capacity: number
  status: EventStatus
  targeting_rules: EventTargetingRules
  created_at: string
  updated_at: string
  // Computed
  tickets_confirmed: number
  tickets_waitlisted: number
  tickets_present: number
}

export interface EventTicket {
  id: string
  event_id: string
  candidate_id: string
  status: TicketStatus
  attendance_status: AttendanceStatus
  created_at: string
  // Joined
  candidate_name?: string
  candidate_email?: string
  candidate_course?: string | null
  candidate_passout_year?: number | null
}

export interface CandidateEventListItem {
  id: string
  title: string
  description: string | null
  date: string
  venue: string
  capacity: number
  status: EventStatus
  created_at: string
  tickets_confirmed: number
  // Candidate's own ticket info
  my_ticket_id: string | null
  my_ticket_status: TicketStatus | null
  my_attendance_status: AttendanceStatus | null
}

export interface EventFormData {
  title: string
  description: string
  date: string
  venue: string
  capacity: number
  status: EventStatus
  targeting_rules: EventTargetingRules
}
