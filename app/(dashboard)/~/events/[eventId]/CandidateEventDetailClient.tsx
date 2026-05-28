"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/events/[eventId]/CandidateEventDetailClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { type ReactNode, useState, useTransition, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  CalendarClock,
  MapPin,
  Video,
  User,
  ExternalLink,
  CheckCircle2,
  Loader2,
  PartyPopper,
  CalendarX,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CandidateEventDetail } from "../_types"
import { formatDateTime, deriveStatus } from "../_types"
import { registerForEventAction, unregisterFromEventAction } from "./actions"


// ─── Meta Item ────────────────────────────────────────────────────────────────

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  event: CandidateEventDetail
  serverNow: string
}

export function CandidateEventDetailClient({ event, serverNow }: Props) {
  const [isRegistered, setIsRegistered] = useState(event.is_registered)
  const [isPending, startTransition] = useTransition()

  // ── Server Time Sync ───────────────────────────────────────────────────────
  const serverTimeOffset = useMemo(() => {
    return new Date(serverNow).getTime() - Date.now()
  }, [serverNow])

  const getNowOnServer = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset)
  }, [serverTimeOffset])

  const now = getNowOnServer()
  const status = deriveStatus(event.start_time, event.end_time, now)
  const isLive = status === "live"
  const isPast = status === "past"
  const isUpcoming = status === "upcoming"

  const handleRegister = () => {
    startTransition(async () => {
      await registerForEventAction(event.id)
      setIsRegistered(true)
    })
  }

  const handleUnregister = () => {
    startTransition(async () => {
      await unregisterFromEventAction(event.id)
      setIsRegistered(false)
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {event.institute_name && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 border shadow-sm bg-muted">
              {event.institute_logo_url && (
                <AvatarImage
                  src={event.institute_logo_url}
                  alt={event.institute_name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="text-[10px] font-bold text-muted-foreground">
                {event.institute_name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {event.institute_name}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
              {event.title}
            </h1>
            {isLive && (
              <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Now
              </Badge>
            )}
            {isUpcoming && (
              <Badge className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5">
                <CalendarClock className="h-3 w-3" />
                Upcoming
              </Badge>
            )}
            {isPast && (
              <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                Ended
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
              {event.event_type}
            </Badge>
          </div>
          {event.description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Meta grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {event.speaker && (
          <MetaItem
            icon={<User className="h-3.5 w-3.5" />}
            label="Speaker"
            value={event.speaker}
          />
        )}
        <MetaItem
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Starts"
          value={formatDateTime(event.start_time)}
        />
        <MetaItem
          icon={<CalendarX className="h-3.5 w-3.5" />}
          label="Ends"
          value={formatDateTime(event.end_time)}
        />
        {event.venue && (
          <MetaItem
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Venue"
            value={event.venue}
          />
        )}
        {!event.venue && event.meeting_link && (
          <MetaItem
            icon={<Video className="h-3.5 w-3.5" />}
            label="Mode"
            value="Online Event"
          />
        )}
      </div>

      {/* ── Registration / Action Area ───────────────────────────────── */}
      {isPast ? (
        <div className="space-y-2.5 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <CalendarX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="text-sm font-medium">Event Ended</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>This event concluded on {formatDateTime(event.end_time)}.</p>
          </div>
        </div>
      ) : (
        <Card className="rounded-xl overflow-hidden border py-0">
          <CardContent className="p-5 space-y-4">
            {isRegistered ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    You are registered for this event
                  </span>
                </div>
                {event.registered_at && (
                  <p className="text-xs text-muted-foreground">
                    Registered on {formatDateTime(event.registered_at)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {isLive && event.meeting_link && (
                    <Button asChild size="sm">
                      <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Join Event
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnregister}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Withdraw Registration
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Register for this event</p>
                  <p className="text-xs text-muted-foreground">
                    {isUpcoming
                      ? "Secure your spot before the event starts."
                      : "The event is happening now — register and join!"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRegister}
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PartyPopper className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Register Now
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
