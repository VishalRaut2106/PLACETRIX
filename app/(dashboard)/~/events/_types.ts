// /* eslint-disable @typescript-eslint/no-explicit-any */
// // app/~/events/_types.ts

// export type DerivedEventStatus = "live" | "upcoming" | "past"
// export type EventType = "workshop" | "hackathon" | "webinar" | "bootcamp"

// export interface CandidateEvent {
//   id: string
//   title: string
//   description?: string | null
//   speaker?: string | null
//   start_time: string
//   end_time: string
//   venue?: string | null
//   meeting_link?: string | null
//   event_type: string
//   is_registered: boolean
//   registered_at?: string | null
//   derived_status: any
// }
// export function deriveStatus(startTime: string, endTime: string, now: Date): DerivedEventStatus {
//   const start = new Date(startTime).getTime()
//   const end = new Date(endTime).getTime()
//   const current = now.getTime()

//   if (current < start) return "upcoming"
//   if (current >= start && current <= end) return "live"
//   return "past"
// }