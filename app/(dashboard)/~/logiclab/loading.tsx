// app/(dashboard)/~/logiclab/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function LogicLabLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">LogicLab</h1>
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md shrink-0" />
          <Skeleton className="h-8 w-32 rounded-md shrink-0" />
        </div>
      </div>

      {/* ── Dashboard Grid: Tags & Stats ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Tag Filter Pills */}
        <Card className="border-border/70 bg-card p-3 h-full flex flex-col justify-between">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-md" style={{ width: `${(i % 3) * 20 + 60}px` }} />
            ))}
          </div>
          <div className="flex justify-end mt-2 pt-2 border-t border-border/60">
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </Card>

        {/* Stats & Activity Grid */}
        <Card className="p-3 md:p-4 border-border/40 shadow-sm bg-card/40 relative overflow-hidden w-full h-full flex flex-col justify-center min-h-[140px]">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-8 sm:gap-12 md:gap-16 w-full">
            {/* 1. The Rings */}
            <div className="flex items-center gap-4 shrink-0">
              <Skeleton className="h-[80px] w-[80px] rounded-full shrink-0" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>

            <div className="w-px h-16 bg-border/50 hidden lg:block shrink-0" />

            {/* 2. The Streak */}
            <div className="flex flex-col gap-2.5 shrink-0 min-w-[90px]">
              <div className="flex flex-col gap-1 text-center sm:text-left items-center sm:items-start">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-8 w-20 mt-1" />
              </div>
              <Skeleton className="h-7 w-full rounded-md mt-1" />
            </div>

            <div className="w-px h-16 bg-border/50 hidden xl:block shrink-0" />

            {/* 3. The Activity Graph */}
            <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-[80px] w-full sm:w-[200px]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Problems Table Card */}
      <Card className="border-border/70 overflow-hidden p-0">
        {/* Search + Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 py-2.5 bg-muted/40 border-b border-border/60">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-full sm:w-[130px] rounded-md shrink-0" />
          <Skeleton className="h-9 w-full sm:w-[130px] rounded-md shrink-0" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:px-4 sm:py-3 gap-3 bg-card">
              <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center gap-2 w-full">
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:shrink-0">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
