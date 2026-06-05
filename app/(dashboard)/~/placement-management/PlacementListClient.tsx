"use client"

import { useState, useEffect, useTransition, useRef, useCallback, useEffectEvent } from "react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  MoreHorizontal,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Pencil,
  Building2,
  IndianRupee,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { upsertPlacementInfo } from "./actions"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"


export interface PlacementRecord {
  profile_id: string
  display_name: string
  course_name: string | null
  passout_year: number | null
  company_name: string | null
  ctc: number | null
  profile_image_path: string | null
}

type SortColumn = "name" | "course" | "passout" | "company" | "ctc"

interface Props {
  records: PlacementRecord[]
  totalCount: number
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialPlacedFilter: "all" | "placed" | "not_placed"
  initialPassoutYear: string
  initialCourse: string
  initialSortCol: SortColumn
  initialSortDir: "asc" | "desc"
  availableYears: number[]
  availableCourses: string[]
}


function SortableHead<T extends string>({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  className,
}: {
  label: string
  col: T
  sortCol: T
  sortDir: "asc" | "desc"
  onSort: (col: T) => void
  className?: string
}) {
  return (
    <TableHead
      className={cn(
        "text-xs font-semibold select-none cursor-pointer hover:bg-muted/60 transition-colors",
        className
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortCol === col ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : (
            <ArrowDown className="size-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-30 hover:opacity-100 transition-opacity" />
        )}
      </div>
    </TableHead>
  )
}


// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: PlacementRecord | null
  onSaved: () => void
}

function EditPlacementDialog({ open, onOpenChange, record, onSaved }: EditDialogProps) {
  const [companyName, setCompanyName] = useState("")
  const [ctc, setCtc] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) {
      setCompanyName(record.company_name ?? "")
      setCtc(record.ctc != null ? String(record.ctc) : "")
    }
  }, [record])

  const handleSave = async () => {
    if (!record) return
    const ctcNum = ctc.trim() === "" ? null : parseFloat(ctc)
    if (ctc.trim() !== "" && (isNaN(ctcNum!) || ctcNum! < 0)) {
      toast.error("Please enter a valid CTC value (e.g. 12.5)")
      return
    }
    try {
      setSaving(true)
      await upsertPlacementInfo({
        candidateUuid: record.profile_id,
        companyName: companyName.trim() || null,
        ctc: ctcNum,
      })
      toast.success("Placement info updated")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Placement Info</DialogTitle>
          <DialogDescription>
            Update placement details for{" "}
            <span className="font-medium text-foreground">{record?.display_name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pm-company">Company Name</Label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="pm-company"
                className="pl-9"
                placeholder="e.g. Google, Infosys…"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pm-ctc">CTC (LPA)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="pm-ctc"
                type="number"
                min={0}
                step={0.5}
                className="pl-9"
                placeholder="e.g. 12.5"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                disabled={saving}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Enter the CTC in Lakhs Per Annum (LPA).</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ─── Main Client Component ────────────────────────────────────────────────────

export function PlacementListClient({
  records,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
  initialPlacedFilter,
  initialPassoutYear,
  initialCourse,
  initialSortCol,
  initialSortDir,
  availableYears,
  availableCourses,
}: Props) {
  const { push } = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const isOwnUpdateRef = useRef(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<PlacementRecord | null>(null)

  // Sync search input on external navigation
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === "" || val === null) {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      startTransition(() => {
        push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, push]
  )

  const onDebouncedSearch = useEffectEvent(() => {
    isOwnUpdateRef.current = true
    updateParams({ search: searchInput, page: 1 })
  })

  useEffect(() => {
    if (searchInput === initialSearch) return
    const timer = setTimeout(onDebouncedSearch, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch])

  const handlePlacedFilterChange = (val: "all" | "placed" | "not_placed") => {
    updateParams({ placed: val, page: 1 })
  }

  const handlePassoutYearChange = (val: string) => {
    updateParams({ year: val === "all" ? "" : val, page: 1 })
  }

  const handleCourseChange = (val: string) => {
    updateParams({ course: val === "all" ? "" : val, page: 1 })
  }

  const handlePageSizeChange = (val: string) => {
    updateParams({ size: val, page: 1 })
  }

  const handleSort = (col: SortColumn) => {
    let nextDir: "asc" | "desc" = "desc"
    let nextCol = col
    if (initialSortCol === col) {
      if (initialSortDir === "asc") {
        nextDir = "desc"
      } else {
        nextCol = "name"
        nextDir = "asc"
      }
    } else {
      nextDir = col === "name" || col === "course" || col === "company" ? "asc" : "desc"
    }
    updateParams({ sortBy: nextCol, sortOrder: nextDir, page: 1 })
  }

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  const openEdit = (record: PlacementRecord) => {
    setEditRecord(record)
    setEditOpen(true)
  }

  const formatCtc = (ctc: number | null) => {
    if (ctc == null) return "—"
    return `₹${ctc.toFixed(1)} LPA`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          {isPending ? (
            <Loader2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search students…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                isOwnUpdateRef.current = true
                setSearchInput("")
                updateParams({ search: "", page: 1 })
              }}
              className="absolute right-2.5 top-2.5 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Placed / Not Placed */}
          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            {(["all", "placed", "not_placed"] as const).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => handlePlacedFilterChange(f)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-sm transition-all",
                  initialPlacedFilter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "All" : f === "placed" ? "Placed" : "Not Placed"}
              </button>
            ))}
          </div>

          {/* Passout Year */}
          <Select
            value={initialPassoutYear || "all"}
            onValueChange={handlePassoutYearChange}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Passout Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Course */}
          <Select
            value={initialCourse || "all"}
            onValueChange={handleCourseChange}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Courses</SelectItem>
              {availableCourses.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className={cn("flex flex-col gap-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border bg-card overflow-hidden">
          <Table className="table-fixed w-full min-w-[760px]">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[22%]" />
              <col className="w-[10%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[6%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <SortableHead label="Student" col="name" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Course" col="course" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Passout" col="passout" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Company" col="company" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="CTC" col="ctc" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <TableHead className="text-right text-xs font-semibold select-none pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length > 0 ? (
                records.map((record) => (
                  <TableRow key={record.profile_id}>
                    {/* Student */}
                    <TableCell className="overflow-hidden">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={record.profile_image_path || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {record.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{record.display_name}</span>
                      </div>
                    </TableCell>

                    {/* Course */}
                    <TableCell className="text-sm truncate overflow-hidden">
                      {record.course_name || "—"}
                    </TableCell>

                    {/* Passout */}
                    <TableCell className="text-sm truncate overflow-hidden">
                      {record.passout_year || "—"}
                    </TableCell>

                    {/* Company */}
                    <TableCell className="truncate overflow-hidden">
                      {record.company_name ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{record.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* CTC */}
                    <TableCell className="truncate overflow-hidden">
                      <span className={cn("text-sm font-medium", record.ctc != null && "text-emerald-600 dark:text-emerald-400")}>
                        {formatCtc(record.ctc)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right shrink-0 pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => openEdit(record)}
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit Placement Info
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        {records.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {records.map((record) => (
              <div key={record.profile_id} className="rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={record.profile_image_path || undefined} />
                      <AvatarFallback className="text-xs">
                        {record.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold truncate">{record.display_name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {record.course_name || "No course"} · {record.passout_year || "—"}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(record)}>
                        <Pencil className="size-4 mr-2" />
                        Edit Placement Info
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                  <div className="min-w-0">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Company</span>
                    <span className="font-medium text-foreground truncate block mt-0.5">
                      {record.company_name || "—"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">CTC</span>
                    <span className={cn("font-medium block mt-0.5", record.ctc != null ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                      {formatCtc(record.ctc)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="md:hidden rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
            No students found.
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium">{Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}</span>
              {" "}to{" "}
              <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span>
              {" "}of{" "}
              <span className="font-medium">{totalCount}</span> students
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={initialPageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue placeholder={initialPageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: 1 })}
                  disabled={activePage === 1}
                >
                  <ChevronsLeft className="size-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: Math.max(1, activePage - 1) })}
                  disabled={activePage === 1}
                >
                  <ChevronLeft className="size-4" />
                  <span className="sr-only">Previous page</span>
                </Button>

                <div className="flex items-center justify-center text-xs font-medium min-w-[80px]">
                  Page {activePage} of {totalPages}
                </div>

                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                  disabled={activePage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="size-4" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: totalPages })}
                  disabled={activePage === totalPages || totalPages === 0}
                >
                  <ChevronsRight className="size-4" />
                  <span className="sr-only">Last page</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Dialog ────────────────────────────────────────── */}
      <EditPlacementDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        record={editRecord}
        onSaved={() => {
          // router.refresh() is triggered automatically via revalidatePath in the action
        }}
      />
    </div>
  )
}
