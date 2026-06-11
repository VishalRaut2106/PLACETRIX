import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LogicLabLoading() {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[180px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Search & Difficulty (Left) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
          <Skeleton className="h-10 w-full sm:w-[160px] rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        </div>
        {/* Tabs (Right) */}
        <Skeleton className="h-10 w-full xl:w-[320px] rounded-xl" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-muted/10 h-10">
              <TableRow className="hover:bg-transparent border-b-border/60">
                <TableHead className="w-[80px] pl-6"><Skeleton className="h-4 w-10" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="w-[140px]"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="w-[180px]"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="w-[200px]"><Skeleton className="h-4 w-12" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={idx} className="h-12 border-b-border/60 hover:bg-transparent">
                  <TableCell className="pl-6">
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground/30 font-mono w-6 shrink-0">
                        {idx + 1}.
                      </span>
                      <Skeleton className="h-5 w-48" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-14 rounded-md" />
                      <Skeleton className="h-5 w-16 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/5">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}
