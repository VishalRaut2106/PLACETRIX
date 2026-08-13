"use client"

import * as React from "react"

interface ChangelogDateProps {
  date: string
  createdAt?: string
  className?: string
}

function parseDateSafe(dateStr?: string, createdAtStr?: string): { dt: Date; hasTime: boolean } | null {
  if (createdAtStr) {
    const normalized = createdAtStr.includes(" ") && !createdAtStr.includes("T")
      ? createdAtStr.replace(" ", "T")
      : createdAtStr
    const dt = new Date(normalized)
    if (!isNaN(dt.getTime())) return { dt, hasTime: true }
  }

  if (dateStr) {
    const normalized = dateStr.includes(" ") && !dateStr.includes("T")
      ? dateStr.replace(" ", "T")
      : dateStr
    const dt = new Date(normalized)
    if (!isNaN(dt.getTime())) {
      const hasTime = dateStr.includes(":") || (createdAtStr?.includes(":") ?? false)
      return { dt, hasTime }
    }
    const parts = dateStr.split("-").map(Number)
    if (parts.length === 3) {
      return { dt: new Date(parts[0], parts[1] - 1, parts[2]), hasTime: false }
    }
  }

  return null
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 0) return "just now"
  if (diffSec < 45) return "just now"

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export function ChangelogDate({
  date,
  createdAt,
  className = "text-xs text-muted-foreground",
}: ChangelogDateProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Static fallback for SSR to avoid hydration mismatch
  const renderFallback = () => {
    try {
      const parsed = parseDateSafe(date, createdAt)
      if (!parsed) return date
      return parsed.dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return date
    }
  }

  if (!mounted) {
    return (
      <span className={className} suppressHydrationWarning>
        {renderFallback()}
      </span>
    )
  }

  try {
    const parsed = parseDateSafe(date, createdAt)
    if (!parsed) {
      return <span className={className}>{date}</span>
    }

    const { dt, hasTime } = parsed
    const relativeTime = getRelativeTime(dt)

    const formattedDate = dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const fullLocalString = dt.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: hasTime ? "long" : undefined,
    })

    if (hasTime) {
      const formattedTime = dt.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })

      return (
        <time
          dateTime={dt.toISOString()}
          title={fullLocalString}
          className={className}
        >
          <span>{formattedDate} • {formattedTime}</span>
          <span className="ml-1.5 font-medium text-foreground/80">({relativeTime})</span>
        </time>
      )
    }

    return (
      <time
        dateTime={dt.toISOString()}
        title={fullLocalString}
        className={className}
      >
        <span>{formattedDate}</span>
        <span className="ml-1.5 font-medium text-foreground/80">({relativeTime})</span>
      </time>
    )
  } catch {
    return <span className={className}>{date}</span>
  }
}
