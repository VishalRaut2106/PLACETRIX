import { Skeleton } from "@/components/ui/skeleton"
import { FolderOpen } from "lucide-react"

export default function TestsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:py-8 md:px-8 pb-24 sm:pb-8 w-full">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-40 mb-1" />
          <Skeleton className="h-4 w-72 mt-1" />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      </div>

      {/* Folders Grid Skeleton */}
      <div className="space-y-4 mb-8 mt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <FolderOpen className="size-5 text-primary/40" /> All Folders
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl border border-border/60 bg-card" />
          ))}
        </div>
      </div>
    </div>
  )
}
