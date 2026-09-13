import { Skeleton } from "@/components/ui/skeleton"
import { Search, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CohortDetailLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="gap-1.5 -ml-3 self-start rounded-xl">
          <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground/50 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Cohorts
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-9 w-64 mb-1" />
          <Skeleton className="h-5 w-[28rem] mt-1" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-9 w-[100px] rounded-md" />
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-stretch gap-4 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input disabled placeholder="Search members..." className="pl-9 pr-9" />
        </div>
      </div>

      {/* Members Table Skeleton */}
      <div className="space-y-4">
        <div className="rounded-md border bg-card overflow-hidden">
          <Table className="table-fixed w-full min-w-[700px]">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[45%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-4">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </TableHead>
                <TableHead className="text-xs font-semibold">Student</TableHead>
                <TableHead className="text-xs font-semibold">Course</TableHead>
                <TableHead className="text-xs font-semibold">Graduation Year</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-6 w-6 ml-auto rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
