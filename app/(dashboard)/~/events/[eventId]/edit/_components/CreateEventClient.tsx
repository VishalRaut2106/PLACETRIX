"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/events/[eventId]/edit/_components/CreateEventClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent } from "@/components/ui/card"
import {
  Save,
  Send,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import type { EventSettingsForm, InitialEventData, EventType } from "../../../_types"


// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "workshop", label: "Workshop" },
  { value: "hackathon", label: "Hackathon" },
  { value: "webinar", label: "Webinar" },
  { value: "bootcamp", label: "Bootcamp" },
]

function toLocalDatetimeStr(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  // Format: YYYY-MM-DDThh:mm
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  eventId?: string
  initialData?: InitialEventData
  onSaveDraft: (eventId: string, settings: EventSettingsForm, status: "draft" | "published") => Promise<string>
  onPublish: (eventId: string, settings: EventSettingsForm) => Promise<void>
}

export function CreateEventClient({
  eventId,
  initialData,
  onSaveDraft,
  onPublish,
}: Props) {
  const router = useRouter()
  const isNew = !eventId

  const [settings, setSettings] = useState<EventSettingsForm>(() => {
    if (initialData) {
      return {
        ...initialData.settings,
        start_time: toLocalDatetimeStr(initialData.settings.start_time),
        end_time: toLocalDatetimeStr(initialData.settings.end_time),
      }
    }
    return {
      title: "",
      description: "",
      speaker: "",
      start_time: "",
      end_time: "",
      venue: "",
      meeting_link: "",
      event_type: "",
    }
  })

  const [isSaving, startSaveTransition] = useTransition()
  const [isPublishing, startPublishTransition] = useTransition()

  const update = (field: keyof EventSettingsForm, value: string) => {
    setSettings((prev: EventSettingsForm) => ({ ...prev, [field]: value }))
  }

  const handleSaveDraft = () => {
    if (!settings.title.trim()) {
      toast.error("Title is required")
      return
    }

    startSaveTransition(async () => {
      try {
        const id = await onSaveDraft(eventId ?? "new", settings, "draft")
        toast.success(isNew ? "Event created as draft" : "Draft saved")
        if (isNew) {
          router.replace(`/~/events/${id}/edit`)
        }
      } catch (err: any) {
        toast.error(err.message ?? "Failed to save")
      }
    })
  }

  const handlePublish = () => {
    if (!settings.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!settings.start_time) {
      toast.error("Start time is required")
      return
    }
    if (!settings.end_time) {
      toast.error("End time is required")
      return
    }
    if (!settings.event_type) {
      toast.error("Event type is required")
      return
    }

    startPublishTransition(async () => {
      try {
        await onPublish(eventId ?? "new", settings)
        toast.success("Event published!")
      } catch (err: any) {
        toast.error(err.message ?? "Failed to publish")
      }
    })
  }

  const isPending = isSaving || isPublishing

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 max-w-3xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => router.push("/~/events")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-cirka tracking-tight text-foreground">
            {isNew ? "Create Event" : "Edit Event"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew ? "Set up a new event for your candidates." : "Update event details."}
          </p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border py-0">
        <CardContent className="p-5 space-y-5">

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Web Development Workshop"
              value={settings.title}
              onChange={(e) => update("title", e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the event..."
              value={settings.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Event Type + Speaker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Event Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={settings.event_type}
                onValueChange={(v) => update("event_type", v)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="speaker" className="text-xs font-medium">
                Speaker
              </Label>
              <Input
                id="speaker"
                placeholder="e.g. John Doe"
                value={settings.speaker}
                onChange={(e) => update("speaker", e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Start / End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_time" className="text-xs font-medium">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={settings.start_time}
                onChange={(e) => update("start_time", e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time" className="text-xs font-medium">
                End Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={settings.end_time}
                onChange={(e) => update("end_time", e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Venue / Meeting Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="venue" className="text-xs font-medium">
                Venue
              </Label>
              <Input
                id="venue"
                placeholder="e.g. Room 204, Main Hall"
                value={settings.venue}
                onChange={(e) => update("venue", e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting_link" className="text-xs font-medium">
                Meeting Link
              </Label>
              <Input
                id="meeting_link"
                type="url"
                placeholder="https://meet.google.com/..."
                value={settings.meeting_link}
                onChange={(e) => update("meeting_link", e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save as Draft
        </Button>
        <Button
          onClick={handlePublish}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPublishing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Publish Event
        </Button>
      </div>
    </div>
  )
}
