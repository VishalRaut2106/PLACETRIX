import { Skeleton } from "@/components/ui/skeleton"

export default function TestsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:py-8 md:px-8 pb-24 sm:pb-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 hidden sm:block" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24 shrink-0" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 rounded" />
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
