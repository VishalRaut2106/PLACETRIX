/**
 * In-memory sliding-window rate limiter.
 *
 * Uses a Map of <key → timestamps[]> to track requests within a rolling
 * window. This works correctly for a single-process Node.js server (local dev
 * + single-instance production). For multi-instance deployments, swap this
 * out for an Upstash Redis-backed implementation.
 *
 * Usage:
 *   const { success, remaining } = rateLimit("submit", userId, 10, 60_000)
 *   if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
 */

interface RateLimitEntry {
  timestamps: number[]
}

// Module-level store — persists across requests in the same process
const store = new Map<string, RateLimitEntry>()

/**
 * Check and record a rate-limit hit.
 *
 * @param namespace   A string to namespace the limit, e.g. "submit", "run"
 * @param identifier  A unique user identifier (user_id or IP)
 * @param limit       Maximum number of requests allowed in the window
 * @param windowMs    Rolling window size in milliseconds (default 60 000 = 1 min)
 * @returns           { success: boolean, remaining: number, resetInMs: number }
 */
export function rateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowMs: number = 60_000
): { success: boolean; remaining: number; resetInMs: number } {
  const key = `${namespace}:${identifier}`
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Evict timestamps outside the rolling window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= limit) {
    // Oldest timestamp in window determines when the window resets
    const resetInMs = entry.timestamps[0] + windowMs - now
    return { success: false, remaining: 0, resetInMs: Math.max(0, resetInMs) }
  }

  entry.timestamps.push(now)
  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    resetInMs: windowMs,
  }
}

/**
 * Periodically clean up expired entries to prevent unbounded memory growth.
 * Call once at module initialisation (runs every 5 minutes).
 */
let _cleanupScheduled = false
function scheduleCleanup() {
  if (_cleanupScheduled) return
  _cleanupScheduled = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      // If all timestamps are old, drop the entry entirely
      if (entry.timestamps.every((t) => t < now - 5 * 60_000)) {
        store.delete(key)
      }
    }
  }, 5 * 60_000)
}
scheduleCleanup()
