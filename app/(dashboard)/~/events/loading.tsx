// app/(dashboard)/~/events/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

// ─── Event Card Skeleton ─────────────────────────────────────────────────────
//
// Mirrors the real <EventCard>:
//   <Card>
//     <CardHeader/CardContent flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5>
//       left: Title, Badges (Status, Type), Description, Chips (Speaker, Date, Venue/Online)
//       right: Status (Happening now, registration status) & View details button

function EventCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 gap-4">
      
      {/* Left: Title, Badges, Description, Chips */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-5 w-1/3 min-w-[120px]" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          <Skeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Right: Status & Action Button */}
      <div className="flex flex-col gap-3 border-t md:border-t-0 pt-3 md:pt-0 md:min-w-[220px] md:items-end w-full md:w-auto shrink-0">
        <div className="h-4 flex md:justify-end items-center">
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-full md:w-24 rounded-md md:self-end" />
      </div>

    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────

export default function EventsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Events</h1>
          <div className="h-5 flex items-center">
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
        {/* Institute "Create Event" button */}
        <Skeleton className="h-8 w-28 rounded-md shrink-0" />
      </div>

      {/* ── Search (left) + Tab Bar (right) ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search input skeleton */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-9 pr-9 cursor-default pointer-events-none"
            readOnly
          />
        </div>

        {/* Tab pills skeleton */}
        <div className="overflow-x-auto shrink-0">
          <div className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-muted p-1">
            <Skeleton className="h-7 w-[48px] rounded-md shrink-0" />
            <Skeleton className="h-7 w-[52px] rounded-md shrink-0" />
            <Skeleton className="h-7 w-[80px] rounded-md shrink-0" />
            <Skeleton className="h-7 w-[52px] rounded-md shrink-0" />
            <Skeleton className="h-7 w-[60px] rounded-md shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Card Grid ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>

    </div>
  )
}
