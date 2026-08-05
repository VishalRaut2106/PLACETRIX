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
      "A new version of Placetrix was deployed while you were using the app. " +
      "Refresh the page to reconnect. Your data is safe.",
    action: {
      label: "Refresh Now",
      onClick: () => window.location.reload(),
    },
  })
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
  const msg = (err as any)?.message || fallbackMessage
  toast.error(msg)
}
