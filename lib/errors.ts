/**
 * lib/errors.ts
 *
 * Shared utilities for detecting and handling deployment-related server action
 * errors. When Firebase App Hosting (or any host) deploys a new Next.js build
 * while users have the old JS bundle loaded, server action IDs change. Calling
 * any server action with a stale ID produces a recognisable error — this module
 * gives every part of the app a consistent way to detect and surface it.
 */

import { toast } from "sonner"

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Returns true when `err` looks like a Next.js "server action not found" error
 * caused by a new deployment invalidating the client's cached action IDs.
 */
export function isDeploymentError(err: unknown): boolean {
  const msg = ((err as any)?.message ?? "").toLowerCase()
  const digest = ((err as any)?.digest ?? "").toLowerCase()
  return (
    msg.includes("server action not found") ||
    msg.includes("action not found") ||
    (msg.includes("unexpected") && msg.includes("response")) ||
    (msg.includes("unexpected") && msg.includes("end of json")) ||
    digest.includes("action_not_found")
  )
}

// ─── User-facing handler ──────────────────────────────────────────────────────

/**
 * Shows a persistent deployment-error toast with a "Refresh Page" action.
 * Call this from any catch block when `isDeploymentError(err)` is true.
 */
export function showDeploymentErrorToast() {
  toast.warning("App updated — please refresh", {
    id: "deployment-error",           // deduplicate: only one toast shown
    duration: Infinity,               // stays until the user acts
    description:
      "A new version of PlaceTrix was deployed while you were using the app. " +
      "Refresh the page to reconnect. Your data is safe.",
    action: {
      label: "Refresh Now",
      onClick: () => window.location.reload(),
    },
  })
}

// ─── Error Sanitizer ──────────────────────────────────────────────────────────

/**
 * Known Postgres / PostgREST error codes mapped to user-friendly text.
 */
const PG_ERROR_MAP: Record<string, string> = {
  "23505": "This record already exists. Please refresh and try again.",
  "23503": "This item is referenced by other data and cannot be changed.",
  "23502": "A required field is missing. Please fill in all required fields.",
  "23514": "The value you entered is not valid. Please check and try again.",
  "42501": "You don't have permission to perform this action.",
  "42P01": "The request could not be processed. Please try again.",
  "P0001": "The operation was rejected by the server. Please try again.",
  "PGRST": "The request couldn't be processed. Please try again.",
}

/**
 * Patterns in raw error messages that indicate a network / timeout issue.
 */
const NETWORK_PATTERNS = [
  { test: /fetch failed|networkerror|net::err_/i,          msg: "Connection error. Please check your internet and try again." },
  { test: /timeout|timed?\s*out|gateway.*(?:time|502|504)/i, msg: "The server is taking too long. Please try again in a moment." },
  { test: /rate.?limit|too many|429|quota/i,               msg: "Too many requests. Please wait a moment and try again." },
  { test: /503|service unavailable|overloaded/i,           msg: "The server is temporarily unavailable. Please try again shortly." },
]

/**
 * Regex patterns that indicate the error message contains sensitive internals.
 * If any of these match, the message is replaced with the fallback.
 */
const SENSITIVE_PATTERNS = [
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,  // raw UUIDs
  /\b(?:pg_|test_|logiclab_|profiles?|cohorts?|institute_)\w+/i,           // table / column names
  /\bviolates?\s+(?:unique|foreign|check|not-null)\s+constraint\b/i,       // constraint messages
  /\b(?:at\s+Object\.|at\s+async\s|Error:\s)/,                             // stack traces
  /\bpassword|secret|token|api[_-]?key|connection\s*string/i,              // credentials
  /\brpc\s*\(|\.rpc\(|function\s+\w+\(.*\)\s+does not exist/i,             // RPC internals
]

/**
 * Transforms a raw error into a clean, user-friendly message.
 *
 * Priority order:
 *   1. Known Postgres error code → mapped message
 *   2. Recognised network / timeout pattern → mapped message
 *   3. If the raw message looks safe (no sensitive patterns) → raw message
 *   4. Fallback → defaultMsg
 *
 * Safe for both server-side (actions throwing) and client-side (toast) usage.
 */
export function getFriendlyErrorMessage(
  err: unknown,
  defaultMsg: string
): string {
  const raw = (err as any)?.message ?? ""
  const code: string = (err as any)?.code ?? ""

  // 1. Match by Postgres error code
  if (code) {
    for (const [pgCode, friendly] of Object.entries(PG_ERROR_MAP)) {
      if (code === pgCode || code.startsWith(pgCode)) return friendly
    }
  }

  // Also check if the code is embedded in the message (some Supabase errors)
  for (const [pgCode, friendly] of Object.entries(PG_ERROR_MAP)) {
    if (raw.includes(pgCode)) return friendly
  }

  // 2. Match network / timeout patterns
  for (const { test, msg } of NETWORK_PATTERNS) {
    if (test.test(raw)) return msg
  }

  // 3. If message is non-empty and doesn't contain sensitive internals, use it
  if (raw && !SENSITIVE_PATTERNS.some((re) => re.test(raw))) {
    return raw
  }

  // 4. Fallback
  return defaultMsg
}


// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Drop-in replacement for a catch block body.
 *
 * Usage:
 *   } catch (err: any) {
 *     handleServerActionError(err, "Failed to save profile.")
 *   }
 */
export function handleServerActionError(
  err: unknown,
  fallbackMessage: string
): void {
  if (isDeploymentError(err)) {
    showDeploymentErrorToast()
    return
  }
  toast.error(getFriendlyErrorMessage(err, fallbackMessage))
}
