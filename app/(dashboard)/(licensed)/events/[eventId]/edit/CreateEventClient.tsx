"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  X,
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
    // Add 5.5 hours to UTC to get IST time representation
    const istTime = d.getTime() + (5.5 * 60 * 60 * 1000)
    const istDate = new Date(istTime)
    
    const pad = (num: number) => String(num).padStart(2, '0')
    const year = istDate.getUTCFullYear()
    const month = pad(istDate.getUTCMonth() + 1)
    const day = pad(istDate.getUTCDate())
    const hours = pad(istDate.getUTCHours())
    const minutes = pad(istDate.getUTCMinutes())
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
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

  const [formData, setFormData] = useState<EventFormData>(
    initialData
      ? {
          ...initialData,
          date: toISTDatetimeString(initialData.date),
          speaker_name: initialData.speaker_name || "",
        }
      : {
          title: "",
          description: "",
          date: "",
          venue: "",
          capacity: 100,
          status: "Draft",
          duration_minutes: 120,
          targeting_rules: { years: [], branches: [] },
          speaker_name: "",
        }
  )

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
      toast.error("Please select a Date and Time.")
      return
    }
    if (!formData.venue.trim()) {
      toast.error("Please enter a Venue.")
      return
    }

    // Convert IST local datetime string to UTC ISO string before saving
    let utcIsoDate = ""
    try {
      // Appending +05:30 forces standard parsing to treat the string as IST
      utcIsoDate = new Date(`${formData.date}+05:30`).toISOString()
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
            <p className="text-xs text-muted-foreground">
              Define schedules, capacities, and target cohorts for campus drives or sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={eventId ? `/events/${eventId}` : "/events"}>
            <Button variant="outline" size="sm" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave("Draft")}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleSave("Published")}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Publish Event
          </Button>
        </div>
      </div>

      {/* Form Panel */}
      <div className="grid lg:grid-cols-3 gap-6 w-full items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* General Details & Schedule */}
          <Card>
            <CardContent className="p-5 space-y-5">
              <h3 className="font-semibold text-sm border-b pb-2 text-foreground/90">
                General Details & Schedule
              </h3>
              
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
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Start Date & Time (IST) *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (Minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        duration_minutes: parseInt(e.target.value) || 120,
                      }))
                    }
                  />
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
