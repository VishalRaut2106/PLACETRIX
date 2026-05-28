"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/events/[eventId]/InstituteEventDetailClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { type ReactNode, useState, useTransition, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  CalendarClock,
  MapPin,
  Video,
  User,
  Users,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CalendarX,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { InstituteEventDetail } from "../_types"
import { formatDateTime, deriveInstituteEventStatus } from "../_types"


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
  eventId: string
  event: InstituteEventDetail
  serverNow: string
  onTogglePublish: () => Promise<void>
  onDeleteEvent: () => Promise<void>
}

export function InstituteEventDetailClient({
  eventId,
  event,
  serverNow,
  onTogglePublish,
  onDeleteEvent,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Server Time Sync ───────────────────────────────────────────────────────
  const serverTimeOffset = useMemo(() => {
    return new Date(serverNow).getTime() - Date.now()
  }, [serverNow])

  const getNowOnServer = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset)
  }, [serverTimeOffset])

  const now = getNowOnServer()
  const status = deriveInstituteEventStatus(event.status, event.start_time, event.end_time, now)
  const isPublished = event.status === "published"
  const isDraft = event.status === "draft"

  const handleTogglePublish = () => {
    startTransition(async () => {
      await onTogglePublish()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await onDeleteEvent()
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
              {event.title}
            </h1>
            {status === "live" && (
              <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
                Live
              </Badge>
            )}
            {status === "upcoming" && (
              <Badge className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5">
                Upcoming
              </Badge>
            )}
            {status === "past" && (
              <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5">
                Ended
              </Badge>
            )}
            {status === "draft" && (
              <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5 border-dashed">
                Draft
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

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/~/events/${eventId}/edit`)}
            className="gap-1.5"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePublish}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPublished ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{event.title}&quot; and all registrations.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ── Meta grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <MetaItem
          icon={<Users className="h-3.5 w-3.5" />}
          label="Registrations"
          value={`${event.registrations.length} candidate${event.registrations.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* ── Meeting Link ────────────────────────────────────────────── */}
      {event.meeting_link && (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-3.5">
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Meeting Link
            </p>
            <a
              href={event.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 text-sm font-medium text-primary hover:underline truncate block"
            >
              {event.meeting_link}
            </a>
          </div>
        </div>
      )}

      {/* ── Registrations Table ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Registrations</h2>
        {event.registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No registrations yet</p>
            <p className="text-xs text-muted-foreground/80">
              Candidates will appear here once they register
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden border p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Registered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.registrations.map((reg, i) => (
                  <TableRow key={reg.id}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground font-medium w-10">
                      {i + 1}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {reg.candidate_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reg.candidate_email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(reg.registered_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
