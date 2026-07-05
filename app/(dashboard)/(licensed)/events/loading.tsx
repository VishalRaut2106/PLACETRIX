import { DashboardPageLayout } from "@/components/ui/loading-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function EventsLoading() {
  return (
    <DashboardPageLayout title="Events" descWidth="w-60">
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
    </DashboardPageLayout>
  )
}
