"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/events/EventsStaffClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  Calendar,
  Plus,
  Search,
  X,
  Users,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  PenLine,
  Trash2,
  BarChart2,
  FileText,
  Loader2,
  QrCode,
  UserCheck,
  CalendarCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createEventAction, updateEventAction, deleteEventAction, concludeEventAction } from "./actions"
import type { EventListItem, EventFormData, EventStatus, EventTargetingRules } from "./types"


// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "all" | "published" | "draft" | "concluded"

const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "Electronics & Telecom",
  "Mechanical",
  "Civil",
  "Electrical",
  "Chemical",
  "Other",
]

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}


// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ events }: { events: EventListItem[] }) {
  const stats = useMemo(() => {
    const total = events.length
    const published = events.filter((e) => e.status === "Published").length
    const totalAttendees = events.reduce((sum, e) => sum + e.tickets_confirmed, 0)
    const totalPresent = events.reduce((sum, e) => sum + e.tickets_present, 0)
    return { total, published, totalAttendees, totalPresent }
  }, [events])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-300">
      {[
        {
          icon: <Calendar className="h-3.5 w-3.5 text-primary" />,
          value: stats.total,
          label: "Total Events",
          accent: "border-primary/15",
        },
        {
          icon: <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
          value: stats.published,
          label: "Published",
          accent: "border-emerald-500/15",
        },
        {
          icon: <Users className="h-3.5 w-3.5 text-indigo-500" />,
          value: stats.totalAttendees,
          label: "Total RSVPs",
          accent: "border-indigo-500/15",
        },
        {
          icon: <UserCheck className="h-3.5 w-3.5 text-amber-500" />,
          value: stats.totalPresent,
          label: "Checked In",
          accent: "border-amber-500/15",
        },
      ].map((stat) => (
        <Card key={stat.label} className={cn("border", stat.accent)}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {stat.icon}
              {stat.label}
            </div>
            <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EventStatus }) {
  switch (status) {
    case "Published":
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px]">
          <Eye className="mr-1 h-3 w-3" /> Published
        </Badge>
      )
    case "Draft":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px]">
          <FileText className="mr-1 h-3 w-3" /> Draft
        </Badge>
      )
    case "Concluded":
      return (
        <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400 text-[11px]">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Concluded
        </Badge>
      )
  }
}


// ─── Event Form Dialog ────────────────────────────────────────────────────────

function EventFormDialog({
  mode,
  event,
  trigger,
  onSuccess,
}: {
  mode: "create" | "edit"
  event?: EventListItem
  trigger: React.ReactNode
  onSuccess?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<EventFormData>({
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: event?.date ? new Date(event.date).toISOString().slice(0, 16) : "",
    venue: event?.venue ?? "",
    capacity: event?.capacity ?? 100,
    status: event?.status ?? "Draft",
    targeting_rules: event?.targeting_rules ?? { years: [], branches: [] },
  })

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.date || !formData.venue.trim()) {
      toast.error("Please fill in Title, Date, and Venue.")
      return
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createEventAction(formData)
          toast.success("Event created successfully!")
        } else if (event) {
          await updateEventAction(event.id, formData)
          toast.success("Event updated successfully!")
        }
        setOpen(false)
        onSuccess?.()
      } catch (err: any) {
        toast.error(err.message || "Something went wrong.")
      }
    })
  }

  const toggleYear = (year: number) => {
    setFormData((prev) => ({
      ...prev,
      targeting_rules: {
        ...prev.targeting_rules,
        years: prev.targeting_rules.years.includes(year)
          ? prev.targeting_rules.years.filter((y) => y !== year)
          : [...prev.targeting_rules.years, year],
      },
    }))
  }

  const toggleBranch = (branch: string) => {
    setFormData((prev) => ({
      ...prev,
      targeting_rules: {
        ...prev.targeting_rules,
        branches: prev.targeting_rules.branches.includes(branch)
          ? prev.targeting_rules.branches.filter((b) => b !== branch)
          : [...prev.targeting_rules.branches, branch],
      },
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Event" : "Edit Event"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fill in the details to create a new campus event."
              : "Update the event details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="event-title">Title *</Label>
            <Input
              id="event-title"
              placeholder="e.g. Campus Placement Drive 2026"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="Brief description of the event..."
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Date & Venue */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-date">Date & Time *</Label>
              <Input
                id="event-date"
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-venue">Venue *</Label>
              <Input
                id="event-venue"
                placeholder="e.g. Auditorium Hall A"
                value={formData.venue}
                onChange={(e) => setFormData((p) => ({ ...p, venue: e.target.value }))}
              />
            </div>
          </div>

          {/* Capacity & Status */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-capacity">Capacity</Label>
              <Input
                id="event-capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, capacity: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData((p) => ({ ...p, status: v as EventStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Targeting Rules */}
          <div className="grid gap-3 border rounded-lg p-4 bg-muted/30">
            <div>
              <Label className="text-sm font-medium">Targeted Visibility</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leave empty to show to all candidates. Select specific years/branches to restrict visibility.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Passout Years</Label>
              <div className="flex flex-wrap gap-1.5">
                {YEARS.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md border transition-colors",
                      formData.targeting_rules.years.includes(year)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Branches</Label>
              <div className="flex flex-wrap gap-1.5">
                {BRANCHES.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => toggleBranch(branch)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md border transition-colors",
                      formData.targeting_rules.branches.includes(branch)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent"
                    )}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create Event" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onRefresh,
}: {
  event: EventListItem
  onRefresh: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isPast = new Date(event.date) < new Date()
  const spotsLeft = Math.max(0, event.capacity - event.tickets_confirmed)

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteEventAction(event.id)
        toast.success("Event deleted.")
        onRefresh()
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
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={event.status} />
              {event.tickets_waitlisted > 0 && (
                <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400 text-[11px]">
                  {event.tickets_waitlisted} waitlisted
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base leading-tight truncate">{event.title}</h3>
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
            {event.tickets_confirmed}/{event.capacity} confirmed
          </span>
          <span className="flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" />
            {event.tickets_present} present
          </span>
        </div>

        {/* Capacity Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>{spotsLeft} spots left</span>
            <span>{Math.round((event.tickets_confirmed / event.capacity) * 100)}% filled</span>
          </div>
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
          {event.status === "Published" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/events/${event.id}`)}
              className="text-xs"
            >
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              Manage & Scan
            </Button>
          )}

          <EventFormDialog
            mode="edit"
            event={event}
            trigger={
              <Button size="sm" variant="ghost" className="text-xs">
                <PenLine className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            }
            onSuccess={onRefresh}
          />

          {event.status === "Published" && !isPast && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-xs text-amber-600">
                  <CalendarCheck className="mr-1.5 h-3.5 w-3.5" /> Conclude
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conclude this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the event as concluded. No new RSVPs will be accepted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConclude} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Conclude
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-xs text-destructive ml-auto">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All tickets and Q&A data will also be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function EventsStaffClient({ events: initialEvents }: { events: EventListItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("all")

  const onRefresh = () => router.refresh()

  const filtered = useMemo(() => {
    let items = initialEvents

    // Tab filter
    if (activeTab === "published") items = items.filter((e) => e.status === "Published")
    else if (activeTab === "draft") items = items.filter((e) => e.status === "Draft")
    else if (activeTab === "concluded") items = items.filter((e) => e.status === "Concluded")

    // Search filter
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
  }, [initialEvents, activeTab, search])

  const tabCounts = useMemo(() => ({
    all: initialEvents.length,
    published: initialEvents.filter((e) => e.status === "Published").length,
    draft: initialEvents.filter((e) => e.status === "Draft").length,
    concluded: initialEvents.filter((e) => e.status === "Concluded").length,
  }), [initialEvents])

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and track campus events.
          </p>
        </div>
        <EventFormDialog
          mode="create"
          trigger={
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          }
          onSuccess={onRefresh}
        />
      </div>

      {/* Stats */}
      <StatsBar events={initialEvents} />

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">
              All ({tabCounts.all})
            </TabsTrigger>
            <TabsTrigger value="published" className="text-xs">
              Published ({tabCounts.published})
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">
              Drafts ({tabCounts.draft})
            </TabsTrigger>
            <TabsTrigger value="concluded" className="text-xs">
              Concluded ({tabCounts.concluded})
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
      </div>

      {/* Event Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No events found</p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            {search ? "Try a different search term." : "Create your first event to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}
