"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  X,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createEventAction, updateEventAction } from "../../actions"
import type { EventFormData, EventStatus } from "../../types"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import { CohortSelector } from "@/app/(dashboard)/(licensed)/cohorts/CohortsClient"
import type { CohortOption } from "@/app/(dashboard)/(licensed)/cohorts/types"

interface Props {
  eventId?: string
  initialData?: EventFormData
  cohortOptions?: CohortOption[]
}

// Ensure the local input parses from a UTC string as exactly IST (+05:30)
const toISTDatetimeString = (isoStr?: string) => {
  if (!isoStr) return ""
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return ""
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(d)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "00"
    
    const year = getPart("year")
    const month = getPart("month")
    const day = getPart("day")
    let hour = getPart("hour")
    if (hour === "24") hour = "00"
    const minute = getPart("minute")
    
    return `${year}-${month}-${day}T${hour}:${minute}`
  } catch {
    return ""
  }
}

const toUTCISOFromIST = (istLocalStr: string) => {
  if (!istLocalStr) return ""
  try {
    const cleanStr = istLocalStr.replace(/Z|[+-]\d{2}:\d{2}$/, "")
    const [datePart, timePart] = cleanStr.split("T")
    if (!datePart || !timePart) return new Date(istLocalStr).toISOString()
    const [year, month, day] = datePart.split("-").map(Number)
    const [hours, minutes] = timePart.split(":").map(Number)
    const utcMs = Date.UTC(year, month - 1, day, hours - 5, minutes - 30)
    return new Date(utcMs).toISOString()
  } catch {
    return new Date(istLocalStr).toISOString()
  }
}

const addMinutesToISTString = (istStr: string, mins: number) => {
  if (!istStr) return ""
  try {
    const cleanStr = istStr.replace(/Z|[+-]\d{2}:\d{2}$/, "")
    const [datePart, timePart] = cleanStr.split("T")
    if (!datePart || !timePart) return ""
    const [year, month, day] = datePart.split("-").map(Number)
    const [hours, minutes] = timePart.split(":").map(Number)
    const d = new Date(year, month - 1, day, hours, minutes + mins)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ""
  }
}

export function CreateEventClient({ eventId, initialData, cohortOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>(
    initialData?.cohort_ids ?? []
  )

  const initialStartDate = initialData?.date ? toISTDatetimeString(initialData.date) : ""
  const initialEndDate = initialData?.end_date 
    ? toISTDatetimeString(initialData.end_date)
    : initialStartDate 
      ? addMinutesToISTString(initialStartDate, initialData?.duration_minutes ?? 120)
      : ""

  const [endDate, setEndDate] = useState<string>(initialEndDate)

  const [formData, setFormData] = useState<EventFormData>(
    initialData
      ? {
          ...initialData,
          date: initialStartDate,
          end_date: initialData.end_date ? toISTDatetimeString(initialData.end_date) : null,
          speaker_name: initialData.speaker_name || "",
        }
      : {
          title: "",
          description: "",
          date: "",
          end_date: null,
          venue: "",
          capacity: 100,
          status: "Draft",
          duration_minutes: 120,
          targeting_rules: { years: [], branches: [] },
          speaker_name: "",
        }
  )

  const handleStartDateChange = (newStartDate: string) => {
    setFormData((p) => {
      let duration = p.duration_minutes || 120
      if (newStartDate && endDate) {
        const startMs = new Date(newStartDate).getTime()
        const endMs = new Date(endDate).getTime()
        if (endMs > startMs) {
          duration = Math.max(1, Math.round((endMs - startMs) / 60000))
        } else {
          setEndDate(addMinutesToISTString(newStartDate, duration))
        }
      } else if (newStartDate && !endDate) {
        setEndDate(addMinutesToISTString(newStartDate, duration))
      }
      return { ...p, date: newStartDate, duration_minutes: duration }
    })
  }

  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate)
    if (formData.date && newEndDate) {
      const startMs = new Date(formData.date).getTime()
      const endMs = new Date(newEndDate).getTime()
      if (endMs > startMs) {
        const duration = Math.max(1, Math.round((endMs - startMs) / 60000))
        setFormData((p) => ({ ...p, duration_minutes: duration }))
      }
    }
  }

  // Banner State
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(
    (initialData as any)?.event_banner
      ? buildStorageUrl("event-banners", (initialData as any).event_banner)
      : null
  )
  const [imageOrientation, setImageOrientation] = useState<"landscape" | "portrait" | null>(null)

  useEffect(() => {
    if ((initialData as any)?.event_banner) {
      const img = new Image()
      img.src = buildStorageUrl("event-banners", (initialData as any).event_banner) || ""
      img.onload = () => {
        setImageOrientation(img.width >= img.height ? "landscape" : "portrait")
      }
    }
  }, [initialData])

  const handleSave = (status: EventStatus) => {
    if (!formData.title.trim()) {
      toast.error("Please enter a Title.")
      return
    }
    if (!formData.date) {
      toast.error("Please select a Start Date & Time.")
      return
    }
    if (!endDate) {
      toast.error("Please select an End Date & Time.")
      return
    }
    if (new Date(endDate).getTime() <= new Date(formData.date).getTime()) {
      toast.error("End Date & Time must be after Start Date & Time.")
      return
    }
    if (!formData.venue.trim()) {
      toast.error("Please enter a Venue.")
      return
    }

    let utcIsoDate = ""
    let utcIsoEndDate = ""
    try {
      utcIsoDate = toUTCISOFromIST(formData.date)
      utcIsoEndDate = toUTCISOFromIST(endDate)
    } catch {
      toast.error("Invalid Date format.")
      return
    }

    startTransition(async () => {
      try {
        let finalBannerPath = (initialData as any)?.event_banner || null

        // 1. Upload Banner Image if selected
        if (bannerFile) {
          const supabaseClient = createClient()
          const fileExt = bannerFile.name.split(".").pop()
          const fileName = `${crypto.randomUUID()}.${fileExt}`
          const filePath = `banners/${fileName}`

          const { error: uploadError } = await supabaseClient.storage
            .from("event-banners")
            .upload(filePath, bannerFile)

          if (uploadError) throw uploadError
          finalBannerPath = filePath

          // Delete old banner if it existed
          if ((initialData as any)?.event_banner) {
            await supabaseClient.storage
              .from("event-banners")
              .remove([(initialData as any).event_banner])
          }
        } else if (!bannerPreviewUrl && (initialData as any)?.event_banner) {
          // Banner was removed
          const supabaseClient = createClient()
          await supabaseClient.storage
            .from("event-banners")
            .remove([(initialData as any).event_banner])
          finalBannerPath = null
        }

        const payload: EventFormData = {
          ...formData,
          date: utcIsoDate,
          end_date: utcIsoEndDate,
          status,
          event_banner: finalBannerPath,
          speaker_name: formData.speaker_name || null,
          cohort_ids: selectedCohortIds,
        }
        // Remove agenda if it previously existed
        delete payload.agenda

        if (eventId) {
          await updateEventAction(eventId, payload)
          toast.success("Event updated successfully!")
          router.push(`/events/${eventId}`)
        } else {
          await createEventAction(payload)
          toast.success("Event created successfully!")
          router.push("/events")
        }
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to save event.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div className="flex items-center gap-3">
          <Link href={eventId ? `/events/${eventId}` : "/events"}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-cirka tracking-tight">
              {eventId ? "Edit Event" : "Create New Event"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fill in the details below to schedule an event for your institution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleSave("Draft")}
            className="rounded-xl text-xs font-semibold"
          >
            Save as Draft
          </Button>
          <Button
            disabled={isPending}
            onClick={() => handleSave("Published")}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {eventId ? "Update Event" : "Publish Event"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Event Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Campus Placement Drive 2026"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="speaker_name">Speaker Name (Optional)</Label>
                <Input
                  id="speaker_name"
                  placeholder="e.g. Dr. Jane Doe (Tech Director at Acme Corp)"
                  value={formData.speaker_name || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, speaker_name: e.target.value }))}
                />
              </div>
              
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Start Date & Time (IST) *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">End Date & Time (IST) *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Calculated Duration *</Label>
                  <div className="relative">
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={formData.duration_minutes}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value) || 120
                        setFormData((p) => ({ ...p, duration_minutes: mins }))
                        if (formData.date) {
                          setEndDate(addMinutesToISTString(formData.date, mins))
                        }
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                      min
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  placeholder="e.g. Seminar Hall 3 / Placement Cell Library"
                  value={formData.venue}
                  onChange={(e) => setFormData((p) => ({ ...p, venue: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description & Schedule</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed description of the event details, guest speakers, or guidelines..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>

          {/* Event Banner */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Event Banner
              </h3>
              <div className="flex flex-col gap-4">
                {bannerPreviewUrl ? (
                  <div className="space-y-2 w-full">
                    <div className={cn(
                      "relative rounded-lg overflow-hidden border bg-muted flex items-center justify-center",
                      imageOrientation === "landscape" ? "aspect-video w-full" : "aspect-[3/4] max-w-sm mx-auto"
                    )}>
                      <img
                        src={bannerPreviewUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setBannerFile(null)
                          setBannerPreviewUrl(null)
                          setImageOrientation(null)
                        }}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 w-full bg-muted/10 hover:bg-muted/20 transition-all">
                    <Upload className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground">Upload Event Banner (Landscape, Portrait, or Square)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setBannerFile(file)
                          const previewUrl = URL.createObjectURL(file)
                          setBannerPreviewUrl(previewUrl)
                          const img = new Image()
                          img.src = previewUrl
                          img.onload = () => {
                            setImageOrientation(img.width >= img.height ? "landscape" : "portrait")
                          }
                        }
                      }}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className="mt-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Select File
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Audience, Capacity & Cohorts */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90">
                Audience &amp; Capacity
              </h3>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Seating Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      capacity: parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>

              {/* Cohort Targeting */}
              <div className="grid gap-3 pt-2">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Cohorts *
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                    Select which cohorts can see this event.
                  </p>
                </div>
                <CohortSelector
                  selectedCohortIds={selectedCohortIds}
                  onChange={setSelectedCohortIds}
                  cohorts={cohortOptions}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
