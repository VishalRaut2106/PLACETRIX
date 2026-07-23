"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/CandidateTestsClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  BookOpen,
  Search,
  X,
  Loader2,
  SlidersHorizontal,
  ExternalLink,
  Copy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CandidateTest, DerivedCandidateStatus } from "./_types"
import { deriveStatus } from "./_types"
import { getCandidateTestsAction } from "./actions"


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all" | "live" | "upcoming" | "past"

interface TabConfig {
  value: Tab
  label: string
  icon: React.ReactNode
  count: number
}


// ─── Utils ────────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function formatDateTime(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}


// ─── Status Badge ─────────────────────────────────────────────────────────────
function TestStatusBadge({ test }: { test: CandidateTest }) {
  const isSubmitted = test.attempt?.status === "submitted"
  const isInProgress = test.attempt?.status === "in_progress"

  if (isSubmitted && test.attempt) {
    const hasScore = test.results_available && test.attempt.percentage != null
    const label = hasScore
      ? `Submitted: ${test.attempt.score}/${test.attempt.total_marks} (${(test.attempt.percentage ?? 0).toFixed(1)}%)`
      : "Submitted"
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 />
        {label}
      </Badge>
    )
  }

  if (isInProgress) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock />
        In progress
      </Badge>
    )
  }

  if (test.derived_status === "live") {
    return (
      <Badge variant="success" className="gap-1">
        <PlayCircle />
        Live
      </Badge>
    )
  }

  if (test.derived_status === "upcoming") {
    return (
      <Badge variant="info" className="gap-1">
        <CalendarClock />
        Upcoming
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <AlertCircle />
      Ended
    </Badge>
  )
}

function TestCard({ test }: { test: CandidateTest }) {
  const isSubmitted = test.attempt?.status === "submitted"
  const isInProgress = test.attempt?.status === "in_progress"

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/tests/${test.id}`
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card className="p-0 gap-0 overflow-hidden hover:bg-muted/50 transition-colors">
          <Link href={`tests/${test.id}`} className="block">
            <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4">
              <CardTitle className="font-semibold truncate">
                {test.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-muted-foreground/80">
                {test.description ?? "No description provided"}
              </CardDescription>
              <CardAction>
                <TestStatusBadge test={test} />
              </CardAction>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  {test.time_limit_seconds ? formatDuration(test.time_limit_seconds) : "Untimed"}
                </span>

                {test.derived_status === "upcoming" && test.available_from && (
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    Starts: {formatDateTime(test.available_from)}
                  </span>
                )}

                {test.derived_status === "live" &&
                  (test.available_until ? (
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      Ends: {formatDateTime(test.available_until)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      No deadline
                    </span>
                  ))}

                {test.derived_status === "past" && test.available_until && (
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    Ended: {formatDateTime(test.available_until)}
                  </span>
                )}
              </div>
            </CardContent>
          </Link>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem asChild>
          <Link href={`tests/${test.id}`}>
            <ExternalLink />
            Open Details
          </Link>
        </ContextMenuItem>

        {isInProgress && (
          <ContextMenuItem asChild>
            <Link href={`tests/${test.id}`}>
              <Clock />
              Resume Test
            </Link>
          </ContextMenuItem>
        )}

        {isSubmitted && (
          <ContextMenuItem asChild>
            <Link href={`tests/${test.id}`}>
              <FileText />
              View Results
            </Link>
          </ContextMenuItem>
        )}

        {!isSubmitted && !isInProgress && test.derived_status === "live" && (
          <ContextMenuItem asChild>
            <Link href={`tests/${test.id}`}>
              <PlayCircle />
              Start Test
            </Link>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleCopyLink}>
          <Copy />
          Copy Direct Link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}


// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  const displayLabel = label === "all" ? "" : `${label} `
  return (
    <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpen className="h-5 w-5 text-muted-foreground/60" />
        </EmptyMedia>
        <EmptyTitle>No {displayLabel}tests</EmptyTitle>
        <EmptyDescription>Check back later for new tests</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tests: CandidateTest[]
  serverNow: string
  initialPageSize: number
  initialSearch: string
  initialTab: string
  totalCount: number
  tabCounts: { all: number; live: number; upcoming: number; past: number }
}

export function CandidateTestsClient({
  tests,
  serverNow,
  initialPageSize,
  initialSearch,
  initialTab,
  totalCount,
  tabCounts,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Tracks whether the last URL change was triggered by our own debounce (not external navigation)
  const isOwnUpdateRef = useRef(false)

  // Sync search input ONLY on external navigation (back/forward), skip our own debounce-triggered updates
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Helper to push updated search parameters to the URL
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
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router]
  )

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const activeTab = (initialTab || "all") as Tab

  // ── Server Time Sync ───────────────────────────────────────────────────────
  const serverTimeOffset = useMemo(() => {
    return new Date(serverNow).getTime() - Date.now()
  }, [serverNow])

  const getNowOnServer = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset)
  }, [serverTimeOffset])

  const [now, setNow] = useState(getNowOnServer)

  useEffect(() => {
    const id = setInterval(() => setNow(getNowOnServer()), 10000)
    return () => clearInterval(id)
  }, [getNowOnServer])

  // Infinite scroll states
  const [items, setItems] = useState<CandidateTest[]>(tests)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(tests.length < totalCount)
  const [loadingMore, setLoadingMore] = useState(false)

  // Reset infinite scroll state when tests prop updates (filters or tab changed)
  useEffect(() => {
    setItems(tests)
    setPage(1)
    setHasMore(tests.length < totalCount)
  }, [tests, totalCount])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isPending) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await getCandidateTestsAction({
        page: nextPage,
        size: initialPageSize,
        search: initialSearch,
        tab: activeTab,
        now: serverNow,
      })

      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id))
        const newItems = res.tests.filter((t) => !existingIds.has(t.id))
        return [...prev, ...newItems]
      })
      setPage(nextPage)
      setHasMore((items.length + res.tests.length) < res.count)
    } catch (e) {
      console.error("Error loading more tests:", e)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, isPending, page, initialPageSize, initialSearch, activeTab, serverNow, items.length])

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isPending) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const target = observerTarget.current
    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [loadMore, hasMore, loadingMore, isPending])

  // Dynamically re-derive status on the client with synced server time
  const enrichedTests = useMemo(() => {
    return items.map((t) => ({
      ...t,
      current_derived_status: deriveStatus(
        "published",
        t.available_from,
        t.available_until,
        now
      ) as DerivedCandidateStatus,
    }))
  }, [items, now])

  const tabConfig: TabConfig[] = [
    { value: "all", label: "All", icon: <BookOpen className="h-3.5 w-3.5" />, count: tabCounts.all },
    { value: "live", label: "Live", icon: <PlayCircle className="h-3.5 w-3.5" />, count: tabCounts.live },
    { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="h-3.5 w-3.5" />, count: tabCounts.upcoming },
    { value: "past", label: "Past", icon: <FileText className="h-3.5 w-3.5" />, count: tabCounts.past },
  ]


  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Tests</h1>
        <p className="text-sm text-muted-foreground">
          Browse and attempt your mock tests
        </p>
      </div>

      <div className="space-y-4">

        {/* Search (left) + Filters (right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              {isPending ? (
                <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />
              ) : (
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Search tests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    isOwnUpdateRef.current = true
                    setSearchInput("")
                    updateParams({ search: "" })
                  }}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 shrink-0 h-9">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filters</span>
                  {activeTab !== "all" && (
                    <Badge className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground font-semibold">
                      1
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="px-6 pt-6 pb-2">
                  <SheetTitle>Filter Tests</SheetTitle>
                  <SheetDescription>
                    Filter tests by their current availability status.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-6 py-4 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>
                    <div className="flex flex-col gap-2">
                      {tabConfig.map(({ value, label, icon, count }) => (
                        <button
                          key={value}
                          onClick={() => updateParams({ tab: value })}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border text-left transition-colors",
                            activeTab === value
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {icon}
                            {label}
                          </span>
                          <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-muted">
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeTab !== "all" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            <Badge
              variant="secondary"
              className="gap-1.5 pl-2 pr-1.5 py-1 text-xs hover:bg-secondary/80 font-medium"
            >
              Status: <span className="capitalize font-semibold">{activeTab}</span>
              <button
                onClick={() => updateParams({ tab: "all" })}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateParams({ tab: "all" })}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>
        )}

        <div className="relative">
          {isPending && (
            <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] rounded-lg">
              <div className="sticky top-[40vh] mx-auto flex w-fit flex-col items-center gap-2 rounded-lg border bg-popover px-4 py-3 shadow-md">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs font-medium text-muted-foreground animate-pulse">Loading...</span>
              </div>
            </div>
          )}
          <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
            {totalCount === 0 ? (
              <EmptyState label={activeTab.toLowerCase()} />
            ) : (
              <>
                <div className="flex flex-col gap-3 w-full">
                  {enrichedTests.map((t) => (
                    <TestCard
                      key={t.id}
                      test={{ ...t, derived_status: t.current_derived_status as DerivedCandidateStatus }}
                    />
                  ))}
                </div>

                {/* Scroll Loader Target */}
                <div ref={observerTarget} className="flex justify-center items-center py-6 w-full h-10">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading more...
                    </div>
                  )}
                  {!hasMore && items.length > 0 && (
                    <span className="text-xs text-muted-foreground/70">
                      Showing all {totalCount} tests
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}