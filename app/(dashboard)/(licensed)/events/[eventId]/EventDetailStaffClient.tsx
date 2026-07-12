"use client"

import { useState, useMemo, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  Search,
  X,
  QrCode,
  CheckCircle2,
  Hourglass,
  XCircle,
  Loader2,
  ScanLine,
  FileSpreadsheet,
  Edit3,
  Trash2,
  ChevronRight,
  MoreHorizontal,
  Info,
  Image as ImageIcon,
  Mic,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { buildStorageUrl } from "@/lib/storage"
import { markAttendanceAction, deleteEventAction, concludeEventAction } from "../actions"
import type { EventTicket, EventStatus, TicketStatus, AttendanceStatus, EventAgendaItem } from "../types"
import { ExportEventAttendeesModal } from "./ExportEventAttendeesModal"
import { QRCheckInScanner } from "./QRCheckInScanner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function formatTimeOnly(dtStr: string): string {
  try {
    return new Date(dtStr).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return ""
  }
}

function getInitials(name: string) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

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
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ─── Manual Check-in Dialog ──────────────────────────────────────────────────

function ManualCheckInDialog({ onCheckIn }: { onCheckIn: (ticketId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [ticketId, setTicketId] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!ticketId.trim()) {
      toast.error("Please enter a ticket ID.")
      return
    }
    startTransition(async () => {
      try {
        await markAttendanceAction(ticketId.trim())
        toast.success("Attendee checked in successfully!")
        onCheckIn(ticketId.trim())
        setTicketId("")
        setOpen(false)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5 h-10 rounded-xl text-xs font-semibold">
          <ScanLine className="h-4 w-4" />
          Manual Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manual Check-in</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80">
            Enter the ticket ID from the QR code to check in an attendee.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Ticket ID (UUID)"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 rounded-xl"
          />
          <Button onClick={handleSubmit} disabled={isPending} className="rounded-xl">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Ticket Status Badge ──────────────────────────────────────────────────────

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case "Confirmed":
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
          Confirmed
        </Badge>
      )
    case "Waitlisted":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide">
          Waitlisted
        </Badge>
      )
    case "Cancelled":
      return (
        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wide">
          Cancelled
        </Badge>
      )
  }
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  if (status === "Present") {
    return (
      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
        Present
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">
      Pending
    </Badge>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBarWidget({
  stats,
  activeFilter,
  setFilter
}: {
  stats: { confirmed: number; waitlisted: number; present: number; cancelled: number }
  activeFilter: string
  setFilter: (f: any) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button
        onClick={() => setFilter("confirmed")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          activeFilter === "confirmed" ? "border-primary bg-primary/5 shadow-2xs" : "hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
          <span className="text-xs font-medium">Confirmed Seats</span>
        </div>
        <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">{stats.confirmed}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Approved RSVP attendees</p>
      </button>

      <button
        onClick={() => setFilter("waitlisted")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          activeFilter === "waitlisted" ? "border-primary bg-primary/5 shadow-2xs" : "hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Hourglass className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
          <span className="text-xs font-medium">Waitlisted Queue</span>
        </div>
        <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{stats.waitlisted}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Waiting in queue</p>
      </button>

      <button
        onClick={() => setFilter("present")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          activeFilter === "present" ? "border-primary bg-primary/5 shadow-2xs" : "hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs font-medium">Checked In</span>
        </div>
        <p className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-500">{stats.present}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Scanned or manually checked in</p>
      </button>

      <button
        onClick={() => setFilter("all")}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          activeFilter === "all" ? "border-primary bg-primary/5 shadow-2xs" : "hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-medium">Cancelled RSVPs</span>
        </div>
        <p className="text-2xl font-bold tabular-nums text-red-500">{stats.cancelled}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Withdrawn candidate slots</p>
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  event: {
    id: string
    title: string
    description: string | null
    date: string
    venue: string
    capacity: number
    status: EventStatus
    duration_minutes: number
    event_banner: string | null
    speaker_name: string | null
  }
  agenda: EventAgendaItem[]
  tickets: EventTicket[]
}

export function EventDetailStaffClient({ event, agenda, tickets: initialTickets }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "confirmed" | "waitlisted" | "present">("all")
  const [isPending, startTransition] = useTransition()
  const isPast = new Date(event.date) < new Date()

  const onCheckIn = () => router.refresh()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteEventAction(event.id)
        toast.success("Event deleted successfully.")
        router.push("/events")
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleConclude = () => {
    startTransition(async () => {
      try {
        await concludeEventAction(event.id)
        toast.success("Event concluded.")
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const stats = useMemo(() => {
    const confirmed = initialTickets.filter((t) => t.status === "Confirmed").length
    const waitlisted = initialTickets.filter((t) => t.status === "Waitlisted").length
    const present = initialTickets.filter((t) => t.attendance_status === "Present").length
    const cancelled = initialTickets.filter((t) => t.status === "Cancelled").length
    return { confirmed, waitlisted, present, cancelled }
  }, [initialTickets])

  const filteredTickets = useMemo(() => {
    let items = initialTickets

    // If cancelled is showing under stat click, we show all cancelled as well
    if (filter === "confirmed") items = items.filter((t) => t.status === "Confirmed")
    else if (filter === "waitlisted") items = items.filter((t) => t.status === "Waitlisted")
    else if (filter === "present") items = items.filter((t) => t.attendance_status === "Present")
    // Note: by default "all" shows non-cancelled tickets. But if cancelled count is clicked, let's keep all
    else items = items.filter((t) => t.status !== "Cancelled")

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (t) =>
          t.candidate_name?.toLowerCase().includes(q) ||
          t.candidate_email?.toLowerCase().includes(q) ||
          t.candidate_course?.toLowerCase().includes(q)
      )
    }

    return items
  }, [initialTickets, filter, search])


  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      {/* Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 self-start hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground break-words leading-tight">
                {event.title}
              </h1>
              <Badge variant={event.status === "Published" ? "default" : "secondary"} className="text-xs">
                {event.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground mt-1">
              <span>
                {event.speaker_name && (
                  <span className="font-semibold text-foreground mr-1.5">by {event.speaker_name} ·</span>
                )}
                Campus Event · <span className="font-semibold text-foreground">{event.venue}</span>
              </span>
              {event.event_banner && (
                <>
                  <span className="text-muted-foreground/45">•</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer bg-primary/5 px-2.5 py-0.5 rounded-md border border-primary/10">
                        <ImageIcon className="h-3.5 w-3.5" /> View Banner
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl p-3 md:p-4 border overflow-hidden rounded-2xl bg-card" showCloseButton={false}>
                      <div className="relative">
                        <img
                          src={buildStorageUrl("event-banners", event.event_banner) || ""}
                          alt="Event Banner"
                          className="w-full h-auto max-h-[85vh] object-contain rounded-xl md:rounded-2xl"
                        />
                        <DialogClose asChild>
                          <Button className="absolute top-4 right-4 h-8 w-8 rounded-full bg-foreground text-background hover:bg-foreground/80 shadow-md flex items-center justify-center p-0 cursor-pointer">
                            <X className="h-4 w-4" />
                          </Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 sm:w-auto h-9 rounded-xl font-semibold shadow-2xs"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            {(event.status === "Draft" || event.status === "Published") && (
              <DropdownMenuItem onClick={() => router.push(`/events/${event.id}/edit`)} disabled={isPending} className="rounded-lg">
                <Edit3 className="mr-2 h-3.5 w-3.5" />
                Edit Event
              </DropdownMenuItem>
            )}

            {event.status === "Published" && !isPast && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="relative flex w-full select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 text-left">
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                    Conclude Event
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conclude this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the event as concluded. No new RSVPs will be accepted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConclude} disabled={isPending} className="cursor-pointer rounded-xl">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Conclude
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <DropdownMenuSeparator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="relative flex w-full select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden transition-colors hover:bg-destructive hover:text-destructive-foreground data-disabled:pointer-events-none data-disabled:opacity-50 text-left text-destructive font-semibold">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Event
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All candidate tickets will also be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer rounded-xl"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Bar */}
      <StatsBarWidget stats={stats} activeFilter={filter} setFilter={setFilter} />

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1 border">
            {[
              { value: "overview", label: "Overview", icon: <Info className="h-3.5 w-3.5" />, count: null },
              { value: "attendees", label: "Attendees List", icon: <Users className="h-3.5 w-3.5" />, count: initialTickets.length }
            ].map(({ value, label, icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground"
              >
                {icon}
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    activeTab === value
                      ? "bg-foreground text-background"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="m-0 space-y-6">

          {/* Event Overview Card */}
          <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
            <CardContent className="p-4">
              <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Event Overview
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetaItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Date & Time"
                  value={formatDateTime(event.date)}
                />
                <MetaItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Venue"
                  value={event.venue}
                />
                <MetaItem
                  icon={<Users className="h-4 w-4" />}
                  label="Capacity"
                  value={`${event.capacity} seats`}
                />
                <MetaItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Duration"
                  value={`${event.duration_minutes} minutes`}
                />
                {event.speaker_name && (
                  <MetaItem
                    icon={<Mic className="h-4 w-4" />}
                    label="Guest Speaker"
                    value={event.speaker_name}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
          {event.description && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="overflow-hidden break-words whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Agenda Card */}
          {agenda && agenda.length > 0 && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-5">
                <p className="pb-2.5 border-b mb-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event Agenda
                </p>
                <div className="relative pl-6 md:pl-8 border-l border-primary/20 space-y-6">
                  {agenda.map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      {/* Timeline Dot Marker with glow */}
                      <div className="absolute -left-[31px] md:-left-[39px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background ring-4 ring-primary/10 transition-all duration-300 group-hover:scale-110" />

                      <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                        {/* Time Badge */}
                        <div className="shrink-0 flex items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary font-mono bg-primary/5 dark:bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shadow-2xs">
                            <Clock className="h-3 w-3" />
                            {formatTimeOnly(item.start_time)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-foreground leading-snug">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Attendees */}
        <TabsContent value="attendees" className="m-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <QRCheckInScanner onCheckIn={onCheckIn} />
              <ManualCheckInDialog onCheckIn={onCheckIn} />
              {filteredTickets.length > 0 && (
                <ExportEventAttendeesModal tickets={filteredTickets} eventName={event.title} />
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search attendees..."
                className="pl-9 h-10 text-sm rounded-xl focus-visible:ring-primary/20"
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
          </div>

          {filteredTickets.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed bg-card/50 rounded-2xl">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h4 className="font-bold text-lg text-foreground">No attendees found</h4>
              <p className="text-sm text-muted-foreground/80 mt-1.5 max-w-sm mx-auto">
                {initialTickets.length === 0
                  ? "No candidate has registered for this event yet."
                  : "No registered attendees match the current search or filters."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-xl bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-muted-foreground pl-6">Candidate</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Course / Branch</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-center">Passout Year</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-center">RSVP Status</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-center">Attendance</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <AttendeeRow key={ticket.id} ticket={ticket} onCheckIn={onCheckIn} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredTickets.map((ticket) => (
                  <AttendeeCard key={ticket.id} ticket={ticket} onCheckIn={onCheckIn} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Attendee Row (Desktop) ──────────────────────────────────────────────────

function AttendeeRow({
  ticket,
  onCheckIn,
}: {
  ticket: EventTicket
  onCheckIn: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleCheckIn = () => {
    startTransition(async () => {
      try {
        await markAttendanceAction(ticket.id)
        toast.success(`${ticket.candidate_name} checked in!`)
        onCheckIn()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <TableRow className="hover:bg-muted/10">
      <TableCell className="pl-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary border font-bold text-xs shadow-2xs">
            {getInitials(ticket.candidate_name || "Unknown")}
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">{ticket.candidate_name}</div>
            <div className="text-muted-foreground text-[10px] mt-0.5 font-medium">{ticket.candidate_email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm font-semibold text-foreground">{ticket.candidate_course ?? "—"}</TableCell>
      <TableCell className="text-center text-sm font-medium text-foreground">{ticket.candidate_passout_year ?? "—"}</TableCell>
      <TableCell className="text-center"><TicketStatusBadge status={ticket.status} /></TableCell>
      <TableCell className="text-center"><AttendanceBadge status={ticket.attendance_status} /></TableCell>
      <TableCell className="text-right pr-6">
        {ticket.status === "Confirmed" && ticket.attendance_status !== "Present" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckIn}
            disabled={isPending}
            className="text-[11px] font-semibold h-8 gap-1 rounded-lg border-border/80 hover:bg-muted/50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            Check In
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

// ─── Attendee Card (Mobile) ───────────────────────────────────────────────────

function AttendeeCard({
  ticket,
  onCheckIn,
}: {
  ticket: EventTicket
  onCheckIn: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleCheckIn = () => {
    startTransition(async () => {
      try {
        await markAttendanceAction(ticket.id)
        toast.success(`${ticket.candidate_name} checked in!`)
        onCheckIn()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Card className="rounded-2xl border bg-card p-5 space-y-4 shadow-2xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary border font-bold text-xs shadow-2xs">
            {getInitials(ticket.candidate_name || "Unknown")}
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">{ticket.candidate_name}</h4>
            <p className="text-muted-foreground text-[10px] mt-0.5 font-medium">{ticket.candidate_email}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <TicketStatusBadge status={ticket.status} />
          <AttendanceBadge status={ticket.attendance_status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y py-3 text-xs">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Course / Branch</p>
          <p className="font-semibold text-foreground mt-0.5">{ticket.candidate_course ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Passout Year</p>
          <p className="font-semibold text-foreground mt-0.5">{ticket.candidate_passout_year ?? "—"}</p>
        </div>
      </div>

      {ticket.status === "Confirmed" && ticket.attendance_status !== "Present" && (
        <div className="pt-1">
          <Button
            size="sm"
            onClick={handleCheckIn}
            disabled={isPending}
            className="w-full h-9 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            Check In Attendee
          </Button>
        </div>
      )}
    </Card>
  )
}
