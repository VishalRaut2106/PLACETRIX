import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LogicLabLoading() {
  return (
    <div className="flex flex-col gap-8 pb-12 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 rounded" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <Skeleton className="h-10 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-4">
        <Card className="shadow-sm border-border/60 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-border/60 bg-muted/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-16 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
              <Skeleton className="h-10 w-full sm:w-[160px] rounded-lg" />
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/10 h-10">
                <TableRow className="border-b-border/60 hover:bg-transparent">
                  <TableHead className="w-[80px] pl-6"><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="w-[140px]"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="w-[180px]"><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead className="w-[200px]"><Skeleton className="h-4 w-12" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* POTD Skeleton Row */}
                <TableRow className="h-12 border-b-border/60 bg-muted/5">
                  <TableCell className="pl-6">
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-48 rounded" />
                        <Skeleton className="h-4 w-24 rounded-full" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-10 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-14 rounded-md" />
                        <Skeleton className="h-5 w-16 rounded-md" />
                      </div>
                      <Skeleton className="h-3 w-24 rounded" />
                    </div>
                  </TableCell>
                </TableRow>

                {/* Divider */}
                <TableRow className="border-b-4 border-muted/50 hover:bg-transparent h-1">
                  <TableCell colSpan={5} className="p-0"></TableCell>
                </TableRow>

                {/* Normal Rows */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-12 border-b-border/60">
                    <TableCell className="pl-6">
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-6 rounded" />
                        <Skeleton className="h-5 w-64 rounded" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-10 rounded" />
                        <Skeleton className="h-3 w-12 rounded" />
                      </div>
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
        </Card>
      </div>
    </div>
  )
}
