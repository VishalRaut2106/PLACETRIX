import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LogicLabAdminLoading() {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <div className="bg-muted/50 p-1 rounded-xl shrink-0 flex gap-1">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* 2-Column Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leaderboard Table */}
        <div className="lg:col-span-8">
          <Card className="border-border/60 shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-border/40 bg-muted/10">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4 w-72 rounded max-w-full" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md shrink-0" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Search & Export Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Skeleton className="h-10 w-full max-w-md rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg shrink-0" />
              </div>

              {/* Leaderboard Table Grid */}
              <div className="border border-border/60 rounded-lg overflow-hidden">
                <Table className="text-sm">
                  <TableHeader className="bg-muted/10 h-10">
                    <TableRow className="border-b-border/60 hover:bg-transparent">
                      <TableHead className="w-16"><Skeleton className="h-4 w-6 mx-auto" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                      <TableHead className="w-24 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
                      <TableHead className="w-24 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
                      <TableHead className="w-24 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
                      <TableHead className="w-36 text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-b-border/60 h-14">
                        <TableCell className="text-center font-mono"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40 rounded" />
                            <Skeleton className="h-3 w-56 rounded" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-10 rounded-full mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-4 w-8 rounded mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-4 w-8 rounded mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full mx-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Submission Feed */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border/60 shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-border/40 bg-muted/10">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-52 rounded" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="border border-border/60 rounded-lg p-3 bg-muted/5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border border-border/40 rounded-lg p-3.5 flex items-start justify-between gap-3 bg-card">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-10 rounded" />
                      </div>
                      <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
