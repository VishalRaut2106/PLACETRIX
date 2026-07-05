"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/events/EventsCandidateClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Calendar,
  Search,
  X,
  Users,
  MapPin,
  Clock,
  Ticket,
  CheckCircle2,
  XCircle,
  Hourglass,
  Loader2,
  QrCode,
  CalendarPlus,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { rsvpEventAction, cancelRsvpAction } from "./actions"
import type { CandidateEventListItem, TicketStatus } from "./types"


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function generateICS(event: CandidateEventListItem): string {
  const startDate = new Date(event.date)
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Default 2h duration

  const toICSDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlaceTrix//Events//EN",
    "BEGIN:VEVENT",
    `DTSTART:${toICSDate(startDate)}`,
    `DTEND:${toICSDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.venue}`,
    `DESCRIPTION:${event.description || "Campus event on PlaceTrix"}`,
    `UID:${event.id}@placetrix.app`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

function downloadICS(event: CandidateEventListItem) {
  const ics = generateICS(event)
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`
  a.click()
  URL.revokeObjectURL(url)
}


// ─── Ticket Status Badge ──────────────────────────────────────────────────────

function TicketBadge({ status }: { status: TicketStatus | null }) {
  if (!status) return null
  switch (status) {
    case "Confirmed":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
        </Badge>
      )
    case "Waitlisted":
      return (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px]">
          <Hourglass className="mr-1 h-3 w-3" /> Waitlisted
        </Badge>
      )
    case "Cancelled":
      return (
        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-[11px]">
          <XCircle className="mr-1 h-3 w-3" /> Cancelled
        </Badge>
      )
  }
}


// ─── Event Card ───────────────────────────────────────────────────────────────

function CandidateEventCard({
  event,
  onRefresh,
}: {
  event: CandidateEventListItem
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const isPast = new Date(event.date) < new Date()
  const spotsLeft = Math.max(0, event.capacity - event.tickets_confirmed)
  const hasTicket = event.my_ticket_status !== null && event.my_ticket_status !== "Cancelled"

  const handleRSVP = () => {
    startTransition(async () => {
      try {
        const result = await rsvpEventAction(event.id)
        if (result.status === "Waitlisted") {
          toast.info("Event is at capacity. You've been added to the waitlist.")
        } else {
          toast.success("RSVP confirmed! Check your ticket below.")
        }
        onRefresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelRsvpAction(event.id)
        toast.success("RSVP cancelled.")
        onRefresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <TicketBadge status={event.my_ticket_status} />
              {isPast && (
                <Badge variant="outline" className="text-[11px] text-muted-foreground">
                  Past Event
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base leading-tight">{event.title}</h3>
            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{event.description}</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDateTime(event.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.venue}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
          </span>
        </div>

        {/* Capacity Bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                spotsLeft === 0
                  ? "bg-red-500"
                  : event.tickets_confirmed / event.capacity > 0.7
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(100, (event.tickets_confirmed / event.capacity) * 100)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hasTicket && !isPast && (
            <Button size="sm" onClick={handleRSVP} disabled={isPending} className="gap-1.5 text-xs">
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ticket className="h-3.5 w-3.5" />
              )}
              RSVP
            </Button>
          )}

          {hasTicket && (
            <>
              <Link href={`/events/${event.id}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <QrCode className="h-3.5 w-3.5" />
                  View Ticket
                </Button>
              </Link>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadICS(event)}
                className="gap-1.5 text-xs"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Add to Calendar
              </Button>

              <Link href={`/events/${event.id}#qa`}>
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Q&A
                </Button>
              </Link>
            </>
          )}

          {hasTicket && !isPast && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-xs text-destructive ml-auto">
                  Cancel RSVP
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your RSVP?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will lose your spot. If the event is full, you'll need to rejoin the waitlist.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep My Spot</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel RSVP
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function EventsCandidateClient({ events: initialEvents }: { events: CandidateEventListItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const onRefresh = () => router.refresh()

  const now = new Date()

  const { upcoming, past, myEvents } = useMemo(() => {
    const upcoming = initialEvents.filter((e) => new Date(e.date) >= now)
    const past = initialEvents.filter((e) => new Date(e.date) < now)
    const myEvents = initialEvents.filter(
      (e) => e.my_ticket_status !== null && e.my_ticket_status !== "Cancelled"
    )
    return { upcoming, past, myEvents }
  }, [initialEvents])

  const [activeView, setActiveView] = useState<"upcoming" | "my" | "past">("upcoming")

  const filtered = useMemo(() => {
    let items =
      activeView === "upcoming" ? upcoming : activeView === "my" ? myEvents : past

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false)
      )
    }

    return items
  }, [activeView, upcoming, myEvents, past, search])

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Discover campus events, RSVP, and get your QR tickets.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveView("upcoming")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            activeView === "upcoming"
              ? "border-primary bg-primary/5 shadow-sm"
              : "hover:border-primary/30 hover:bg-accent/50"
          )}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Upcoming
          </div>
          <p className="text-lg font-semibold tabular-nums">{upcoming.length}</p>
        </button>
        <button
          onClick={() => setActiveView("my")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            activeView === "my"
              ? "border-primary bg-primary/5 shadow-sm"
              : "hover:border-primary/30 hover:bg-accent/50"
          )}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Ticket className="h-3.5 w-3.5 text-emerald-500" />
            My Tickets
          </div>
          <p className="text-lg font-semibold tabular-nums">{myEvents.length}</p>
        </button>
        <button
          onClick={() => setActiveView("past")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            activeView === "past"
              ? "border-primary bg-primary/5 shadow-sm"
              : "hover:border-primary/30 hover:bg-accent/50"
          )}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Past
          </div>
          <p className="text-lg font-semibold tabular-nums">{past.length}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="pl-9 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Event Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No events found</p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            {search
              ? "Try a different search term."
              : activeView === "my"
                ? "You haven't RSVP'd to any events yet."
                : "No events available right now."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((event) => (
            <CandidateEventCard key={event.id} event={event} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}
