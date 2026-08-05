import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Timezone-aware Date Formatters ──────────────────────────────────────────
//
// The Supabase client returns UTC ISO 8601 strings (ending in "+00" or "Z").
// `new Date(isoString)` correctly parses these to the UTC moment.
// `Intl.DateTimeFormat(undefined, ...)` auto-detects the browser's locale
// and timezone, so the displayed time is always in the user's local timezone.
//
// For server-side formatting (e.g. emails, PDFs), pass an explicit `timeZone`
// option (e.g. `{ timeZone: "Asia/Kolkata" }`).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a UTC ISO timestamp as date + time in the user's local timezone.
 * Example output (in IST): "5 Aug 2026, 3:10 pm"
 * Example output (in UTC): "5 Aug 2026, 9:40 am"
 */
export function formatDateTime(
  isoString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
      ...options,
    }).format(new Date(isoString))
  } catch {
    return "—"
  }
}

/**
 * Formats a UTC ISO timestamp as date-only in the user's local timezone.
 * Example output (in IST): "5 Aug 2026"
 */
export function formatDate(
  isoString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      ...options,
    }).format(new Date(isoString))
  } catch {
    return "—"
  }
}

/**
 * Formats a DATE-only string (YYYY-MM-DD, no time component) for display.
 * Parses as noon UTC to avoid off-by-one day issues from timezone shifts.
 * Example output: "5 Aug 2026"
 */
export function formatDateOnly(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return "—"
  try {
    // Append T12:00:00Z so the date is noon UTC — stays the same calendar
    // date across all UTC-12 to UTC+14 timezones.
    const iso = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00Z`
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      ...options,
    }).format(new Date(iso))
  } catch {
    return "—"
  }
}

/**
 * Formats a UTC ISO timestamp as time-only in the user's local timezone in 12-hour format.
 * Example output (in IST): "3:10 PM"
 */
export function formatTimeOnly(
  isoString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeStyle: "short",
      hour12: true,
      ...options,
    }).format(new Date(isoString))
  } catch {
    return "—"
  }
}

/**
 * Converts a UTC ISO string from Supabase (e.g. "2024-01-15T04:30:00+00:00")
 * to the "YYYY-MM-DDTHH:mm" format expected by DateTimePicker / <input type="datetime-local">,
 * expressed in the user's LOCAL timezone.
 */
export function toLocalDateTimeInput(isoString?: string | Date | null): string {
  if (!isoString) return ""
  if (isoString instanceof Date) {
    if (isNaN(isoString.getTime())) return ""
    const offsetMs = isoString.getTimezoneOffset() * 60 * 1000
    const localDate = new Date(isoString.getTime() - offsetMs)
    return localDate.toISOString().slice(0, 16)
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoString)) return isoString
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ""
  const offsetMs = d.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(d.getTime() - offsetMs)
  return localDate.toISOString().slice(0, 16)
}

/**
 * Converts a "YYYY-MM-DDTHH:mm" local string or Date object back to a UTC ISO string for DB storage.
 */
export function toUTCISOString(localDT?: string | Date | null): string {
  if (!localDT) return ""
  if (localDT instanceof Date) return isNaN(localDT.getTime()) ? "" : localDT.toISOString()
  const d = new Date(localDT)
  if (isNaN(d.getTime())) return ""
  return d.toISOString()
}

/**
 * Parses a duration string (like "14h 30m", "2 hours", "45 min") into minutes.
 * If the string is already a pure number (or numeric string), it returns it as a number.
 */
export function parseDurationToMinutes(durationStr: string | null | undefined): number {
  if (!durationStr) return 0
  const clean = durationStr.trim().toLowerCase()
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10)
  }
  let totalMinutes = 0
  const hoursMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:h|hour|hours)/)
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60
  }
  const minsMatch = clean.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/)
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1], 10)
  }
  if (totalMinutes === 0) {
    const firstNum = clean.match(/^(\d+)/)
    if (firstNum) return parseInt(firstNum[1], 10)
  }
  return totalMinutes || 0
}

/**
 * Formats a duration (which can be a number of minutes, or a string like "120" or "2h 30m")
 * into a standard readable format: "Xh Ym" or "Xh" or "Ym".
 */
export function formatDuration(duration: string | number | null | undefined): string {
  if (duration === null || duration === undefined) return ""
  const mins = typeof duration === "number" ? duration : parseDurationToMinutes(duration)
  if (mins <= 0 || isNaN(mins)) return ""
  
  const h = Math.floor(mins / 60)
  const m = mins % 60
  
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`
  } else if (h > 0) {
    return `${h}h`
  } else {
    return `${m}m`
  }
}

