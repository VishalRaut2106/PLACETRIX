"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/tests/InstituteTestsClient.tsx
// Clean, minimal test management interface powered by standard shadcn components.
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react"
import { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Plus,
  Eye,
  EyeOff,
  Clock,
  Users,
  ListCheck,
  CalendarClock,
  FlaskConical,
  CheckCircle2,
  PenLine,
  Search,
  X,
  Loader2,
  SlidersHorizontal,
  Copy,
  ExternalLink,
  Award,
  BarChart3,
  RotateCcw,
  ChevronDown,
  Command,
  Mail,
  ShieldCheck,
  User,
  Folder,
  FolderPlus,
  ChevronRight,
  FolderOpen
} from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import type { InstituteTest, DerivedInstituteStatus, TestFolder } from "./_types"
import { deriveStatus } from "./_types"
import { fetchInstituteTestsClient, fetchTestFoldersClient } from "@/lib/supabase/tests-data"
import { Skeleton } from "@/components/ui/skeleton"

export { formatDateTime }


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all" | "live" | "upcoming" | "past" | "drafts"

interface TabConfig {
  value: Tab
  label: string
  count: number
}


// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = React.memo(function StatusBadge({ status }: { status: DerivedInstituteStatus }) {
  switch (status) {
    case "live":
      return <Badge variant="success">Live</Badge>
    case "upcoming":
      return (
        <Badge variant="info" className="gap-1">
          <CalendarClock className="size-3" />
          Upcoming
        </Badge>
      )
    case "past":
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="size-3" />
          Ended
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="warning" className="gap-1">
          <PenLine className="size-3" />
          Draft
        </Badge>
      )
  }
})


const CompactTestCard = React.memo(function CompactTestCard({
  test,
}: {
  test: InstituteTest
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link 
          href={`/tests/${test.id}`}
          className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-border transition-all shadow-sm group w-full"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ListCheck className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                {test.title}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {test.question_count} Qs • {test.attempt_count} Attempts
              </span>
            </div>
          </div>
          <div className="shrink-0 ml-4">
            <StatusBadge status={test.derived_status} />
          </div>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => window.open(`/tests/${test.id}`, "_blank")}>
          <ExternalLink className="size-4 mr-2" />
          Open in New Tab
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <Link href={`/tests/${test.id}/edit`} prefetch={false}>
            <PenLine className="size-4 mr-2" />
            Edit Settings
          </Link>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  instituteId: string
  tests?: InstituteTest[]
  serverNow: string
  initialPageSize: number
  initialSearch: string
  initialTab: string
  initialSort?: string
  initialDuration?: string
  initialQuestions?: string
  initialResults?: string
  initialMarks?: string
  initialAttempts?: string
  initialAuthor?: string
  currentUserId?: string
  totalCount?: number
  tabCounts?: { all: number; live: number; upcoming: number; past: number; drafts: number }
  initialFolderId?: string
  initialFolders?: TestFolder[]
}

export function FolderTestsClient({
  instituteId,
  tests: initialTests,
  serverNow,
  initialPageSize,
  initialSearch,
  initialTab,
  initialSort = "",
  initialDuration = "all",
  initialQuestions = "all",
  initialResults = "all",
  initialMarks = "all",
  initialAttempts = "all",
  initialAuthor = "all",
  currentUserId,
  totalCount: initialTotalCount = 0,
  tabCounts: initialTabCounts = { all: 0, live: 0, upcoming: 0, past: 0, drafts: 0 },
  initialFolderId = "",
  initialFolders = [],
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Tracks whether the last URL change was triggered by our own debounce
  const isOwnUpdateRef = useRef(false)

  const [activeTab, setActiveTab] = useState<Tab>((initialTab || "all") as Tab)
  const [activeSort, setActiveSort] = useState(initialSort || "default")
  const [activeDuration, setActiveDuration] = useState(initialDuration || "all")
  const [activeQuestions, setActiveQuestions] = useState(initialQuestions || "all")
  const [activeResults, setActiveResults] = useState(initialResults || "all")
  const [activeMarks, setActiveMarks] = useState(initialMarks || "all")
  const [activeAttempts, setActiveAttempts] = useState(initialAttempts || "all")
  const [activeAuthor, setActiveAuthor] = useState(initialAuthor || "all")

  // Data states
  const [items, setItems] = useState<InstituteTest[]>(initialTests || [])
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount)
  const [tabCounts, setTabCounts] = useState(initialTabCounts)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialTests ? initialTests.length < initialTotalCount : false)
  const [isLoading, setIsLoading] = useState(!initialTests)
  const [loadingMore, setLoadingMore] = useState(false)

  // This is a dedicated folder view, so we expect exactly one folder to be passed in.
  const currentFolder = initialFolders[0]

  const [isCreateTestDialogOpen, setIsCreateTestDialogOpen] = useState(false)

  // Edit Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFolderName, setEditFolderName] = useState("")
  const [isFolderEditing, setIsFolderEditing] = useState(false)

  const handleEditFolder = async () => {
    if (!currentFolder || !editFolderName.trim()) return
    setIsFolderEditing(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await (supabase as any).from('test_folders').update({
        name: editFolderName.trim()
      }).eq('id', currentFolder.id)
      
      if (error) throw error
      
      setIsEditDialogOpen(false)
      toast.success("Folder renamed successfully")
      // Redirect to the new folder URL
      router.push(`/tests/${encodeURIComponent(editFolderName.trim())}`)
    } catch (e) {
      console.error("Failed to rename folder:", e)
      toast.error("Failed to rename folder")
      setIsFolderEditing(false)
    }
  }

  // Sync search input ONLY on external navigation (back/forward)
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Keyboard shortcut listener: '/' or 'Cmd+K' / 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable

      if (
        (e.key === "/" && !isInput) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Helper to push updated search parameters to the URL without SSR reloads
  const updateUrl = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
      Object.entries(newParams).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === "" ||
          val === null ||
          val === "all" ||
          val === "default"
        ) {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      const queryStr = params.toString()
      const newUrl = queryStr ? `${pathname}?${queryStr}` : pathname
      window.history.replaceState(null, "", newUrl)
    },
    [pathname]
  )

  // Client-side direct DB fetcher via Supabase SDK
  const loadTests = useCallback(
    async (opts?: {
      tab?: Tab
      search?: string
      page?: number
      sort?: string
      duration?: string
      questions?: string
      results?: string
      marks?: string
      attempts?: string
      author?: string
    }) => {
      const targetTab = opts?.tab !== undefined ? opts.tab : activeTab
      const targetSearch = opts?.search !== undefined ? opts.search : searchInput
      const targetPage = opts?.page ?? 1

      if (targetPage === 1) {
        setIsLoading(true)
      }

      try {
        const res = await fetchInstituteTestsClient({
          instituteId,
          now: serverNow,
          page: targetPage,
          size: initialPageSize,
          search: targetSearch,
          tab: targetTab,
          folderId: currentFolder?.id || null,
          options: {
            sort: opts?.sort !== undefined ? opts.sort : activeSort,
            duration: opts?.duration !== undefined ? opts.duration : activeDuration,
            questions: opts?.questions !== undefined ? opts.questions : activeQuestions,
            results: opts?.results !== undefined ? opts.results : activeResults,
            marks: opts?.marks !== undefined ? opts.marks : activeMarks,
            attempts: opts?.attempts !== undefined ? opts.attempts : activeAttempts,
            author: opts?.author !== undefined ? opts.author : activeAuthor,
            userId: currentUserId,
          },
        })

        if (targetPage === 1) {
          setItems(res.tests)
          setPage(1)
          setHasMore(res.tests.length < res.count)
        } else {
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id))
            const newItems = res.tests.filter((t) => !existingIds.has(t.id))
            const updated = [...prev, ...newItems]
            setHasMore(updated.length < res.count)
            return updated
          })
          setPage(targetPage)
        }
        setTotalCount(res.count)
        setTabCounts(res.tabCounts)
      } catch (e) {
        console.error("Error loading institute tests:", e)
        toast.error("Failed to load tests")
      } finally {
        setIsLoading(false)
        setLoadingMore(false)
      }
    },
    [
      instituteId,
      serverNow,
      initialPageSize,
      activeTab,
      searchInput,
      activeSort,
      activeDuration,
      activeQuestions,
      activeResults,
      activeMarks,
      activeAttempts,
      activeAuthor,
      currentUserId,
      currentFolder,
    ]
  )

  // Initial client fetch on mount if tests weren't passed
  const initialMountDone = useRef(false)
  useEffect(() => {
    if (initialMountDone.current) return
    initialMountDone.current = true
    if (!initialTests) {
      loadTests({ tab: (initialTab || "all") as Tab, search: initialSearch, page: 1 })
    }
  }, [initialTests, initialTab, initialSearch, loadTests])

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch && !initialMountDone.current) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateUrl({ search: searchInput })
      loadTests({ search: searchInput, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateUrl, loadTests])

  // Local draft filter states for the Filter Sheet (applied only on "Apply" click)
  const [draftTab, setDraftTab] = useState<Tab>(activeTab)
  const [draftSort, setDraftSort] = useState(activeSort)
  const [draftDuration, setDraftDuration] = useState(activeDuration)
  const [draftQuestions, setDraftQuestions] = useState(activeQuestions)
  const [draftResults, setDraftResults] = useState(activeResults)
  const [draftMarks, setDraftMarks] = useState(activeMarks)
  const [draftAttempts, setDraftAttempts] = useState(activeAttempts)
  const [draftAuthor, setDraftAuthor] = useState(activeAuthor)

  // Sync draft state whenever sheet is opened
  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setDraftTab(activeTab)
      setDraftSort(activeSort)
      setDraftDuration(activeDuration)
      setDraftQuestions(activeQuestions)
      setDraftResults(activeResults)
      setDraftMarks(activeMarks)
      setDraftAttempts(activeAttempts)
      setDraftAuthor(activeAuthor)
    }
    setFilterSheetOpen(open)
  }

  // Count active filters in draft state (for the reset button & apply badge inside sheet)
  const draftFilterCount = useMemo(() => {
    let count = 0
    if (draftTab !== "all") count++
    if (draftSort && draftSort !== "default") count++
    if (draftDuration !== "all") count++
    if (draftQuestions !== "all") count++
    if (draftResults !== "all") count++
    if (draftMarks !== "all") count++
    if (draftAttempts !== "all") count++
    if (draftAuthor !== "all") count++
    return count
  }, [
    draftTab,
    draftSort,
    draftDuration,
    draftQuestions,
    draftResults,
    draftMarks,
    draftAttempts,
    draftAuthor,
  ])

  // Reset draft filters inside sheet to defaults
  const handleResetDraft = () => {
    setDraftTab("all")
    setDraftSort("default")
    setDraftDuration("all")
    setDraftQuestions("all")
    setDraftResults("all")
    setDraftMarks("all")
    setDraftAttempts("all")
    setDraftAuthor("all")
  }

  // Apply draft filters to URL
  const handleApplyFilters = () => {
    setActiveTab(draftTab)
    setActiveSort(draftSort)
    setActiveDuration(draftDuration)
    setActiveQuestions(draftQuestions)
    setActiveResults(draftResults)
    setActiveMarks(draftMarks)
    setActiveAttempts(draftAttempts)
    setActiveAuthor(draftAuthor)

    updateUrl({
      tab: draftTab,
      sort: draftSort,
      duration: draftDuration,
      questions: draftQuestions,
      results: draftResults,
      marks: draftMarks,
      attempts: draftAttempts,
      author: draftAuthor,
    })
    setFilterSheetOpen(false)

    loadTests({
      tab: draftTab,
      sort: draftSort,
      duration: draftDuration,
      questions: draftQuestions,
      results: draftResults,
      marks: draftMarks,
      attempts: draftAttempts,
      author: draftAuthor,
      page: 1,
    })
  }

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeTab !== "all") count++
    if (activeSort && activeSort !== "default") count++
    if (activeDuration !== "all") count++
    if (activeQuestions !== "all") count++
    if (activeResults !== "all") count++
    if (activeMarks !== "all") count++
    if (activeAttempts !== "all") count++
    if (activeAuthor !== "all") count++
    return count
  }, [
    activeTab,
    activeSort,
    activeDuration,
    activeQuestions,
    activeResults,
    activeMarks,
    activeAttempts,
    activeAuthor,
  ])

  // Reset all filters, sorting, and search back to clean defaults
  const handleResetAll = useCallback(() => {
    isOwnUpdateRef.current = true
    setSearchInput("")
    setActiveTab("all")
    setActiveSort("default")
    setActiveDuration("all")
    setActiveQuestions("all")
    setActiveResults("all")
    setActiveMarks("all")
    setActiveAttempts("all")
    setActiveAuthor("all")

    updateUrl({
      search: "",
      tab: "all",
      sort: "default",
      duration: "all",
      questions: "all",
      results: "all",
      marks: "all",
      attempts: "all",
      author: "all",
    })
    loadTests({
      tab: "all",
      search: "",
      sort: "default",
      duration: "all",
      questions: "all",
      results: "all",
      marks: "all",
      attempts: "all",
      author: "all",
      page: 1,
    })
  }, [updateUrl, loadTests])

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

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isLoading) return
    setLoadingMore(true)
    await loadTests({ page: page + 1 })
  }, [loadingMore, hasMore, isLoading, page, loadTests])

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isLoading) {
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
  }, [loadMore, hasMore, loadingMore, isLoading])

  // Dynamically re-derive status on the client with synced server time
  // Re-uses object references if status hasn't changed to maximize React.memo effectiveness
  const enrichedTests = useMemo(() => {
    return items.map((t) => {
      const newStatus = deriveStatus(
        t.status,
        t.available_from,
        t.available_until,
        now
      ) as DerivedInstituteStatus
      if (t.derived_status === newStatus) return t
      return { ...t, derived_status: newStatus }
    })
  }, [items, now])

  const tabConfig: TabConfig[] = [
    {
      value: "all",
      label: "All",
      count: tabCounts.all,
    },
    {
      value: "live",
      label: "Live",
      count: tabCounts.live,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: tabCounts.upcoming,
    },
    {
      value: "past",
      label: "Ended",
      count: tabCounts.past,
    },
    {
      value: "drafts",
      label: "Drafts",
      count: tabCounts.drafts,
    },
  ]

  const sortOptions = [
    { value: "default", label: "Default (Status Recommended)" },
    { value: "created_desc", label: "Newest Created" },
    { value: "created_asc", label: "Oldest Created" },
    { value: "title_asc", label: "Title (A → Z)" },
    { value: "title_desc", label: "Title (Z → A)" },
    { value: "questions_desc", label: "Most Questions" },
    { value: "questions_asc", label: "Fewest Questions" },
    { value: "attempts_desc", label: "Most Submissions" },
    { value: "attempts_asc", label: "Fewest Submissions" },
    { value: "duration_desc", label: "Longest Duration" },
    { value: "duration_asc", label: "Shortest Duration" },
    { value: "deadline_asc", label: "Ending Soonest" },
    { value: "deadline_desc", label: "Ending Latest" },
  ]

  const authorOptions = [
    { value: "all", label: "All Creators" },
    { value: "me", label: "Created by Me" },
    { value: "others", label: "Other Staff" },
  ]

  const durationOptions = [
    { value: "all", label: "All" },
    { value: "untimed", label: "Untimed" },
    { value: "under_30", label: "< 30m" },
    { value: "30_60", label: "30–60m" },
    { value: "over_60", label: "> 60m" },
  ]

  const questionsOptions = [
    { value: "all", label: "All" },
    { value: "has_questions", label: "Has Questions (≥ 1)" },
    { value: "no_questions", label: "Empty (0 Qs)" },
  ]

  const visibilityOptions = [
    { value: "all", label: "All" },
    { value: "visible", label: "Visible" },
    { value: "hidden", label: "Hidden" },
  ]

  const attemptsOptions = [
    { value: "all", label: "All" },
    { value: "has_attempts", label: "With Attempts" },
    { value: "no_attempts", label: "No Attempts" },
  ]

  const activeSortLabel = useMemo(() => {
    const match = sortOptions.find((o) => o.value === activeSort)
    return match && match.value !== "default" ? match.label : null
  }, [activeSort, sortOptions])

  const handleCreate = () => {
    router.push(`/tests/new/edit?folderId=${currentFolder?.id}`)
  }



  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:py-8 md:px-8 pb-24 sm:pb-8 max-w-full overflow-x-hidden">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Tests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage, schedule, and review assessment tests for your institute.
          </p>
        </div>
        <Button onClick={handleCreate} className="hidden sm:inline-flex gap-2 shrink-0">
          <Plus className="size-4" />
          <span>Create Test</span>
        </Button>
      </div>

      {/* ── Controls Toolbar ── */}
      <div className="space-y-4">

        {/* Search Bar + Filter Trigger */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <InputGroup className="flex-1 min-w-0">
            <InputGroupAddon align="inline-start">
              {isLoading ? (
                <Loader2 className="size-4 text-primary animate-spin" />
              ) : (
                <Search className="size-4 text-muted-foreground" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              placeholder="Search tests by title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="min-w-0"
            />
            <InputGroupAddon align="inline-end">
              {searchInput ? (
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    isOwnUpdateRef.current = true
                    setSearchInput("")
                    updateUrl({ search: "" })
                    loadTests({ search: "", page: 1 })
                  }}
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </InputGroupButton>
              ) : (
                <Kbd className="hidden sm:inline-flex items-center gap-0.5 text-[11px] px-1.5 h-5 border border-border/80 bg-muted/80 font-medium">
                  <Command className="size-3" />
                  <span>K</span>
                </Kbd>
              )}
            </InputGroupAddon>
          </InputGroup>

          {/* Filter Sheet Trigger */}
          <Sheet open={filterSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0 px-2.5 sm:px-3">
                <SlidersHorizontal className="size-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-semibold">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
              <SheetHeader className="p-5 sm:p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-base font-semibold">Filters & Sorting</SheetTitle>
                    {draftFilterCount > 0 && (
                      <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px] font-semibold">
                        {draftFilterCount} active
                      </Badge>
                    )}
                  </div>
                  {draftFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleResetDraft}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                <SheetDescription className="text-xs">
                  Refine test catalog and customize list ordering.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

                {/* 1. Sort Order Dropdown */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sort By
                  </Label>
                  <Select value={draftSort} onValueChange={setDraftSort}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Recommended</SelectLabel>
                        <SelectItem value="default">Default (Status Recommended)</SelectItem>
                        <SelectItem value="created_desc">Newest Created</SelectItem>
                        <SelectItem value="created_asc">Oldest Created</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Alphabetical</SelectLabel>
                        <SelectItem value="title_asc">Title (A → Z)</SelectItem>
                        <SelectItem value="title_desc">Title (Z → A)</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Questions & Duration</SelectLabel>
                        <SelectItem value="questions_desc">Most Questions</SelectItem>
                        <SelectItem value="questions_asc">Fewest Questions</SelectItem>
                        <SelectItem value="duration_desc">Longest Duration</SelectItem>
                        <SelectItem value="duration_asc">Shortest Duration</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Submissions & Deadlines</SelectLabel>
                        <SelectItem value="attempts_desc">Most Submissions</SelectItem>
                        <SelectItem value="attempts_asc">Fewest Submissions</SelectItem>
                        <SelectItem value="deadline_asc">Ending Soonest</SelectItem>
                        <SelectItem value="deadline_desc">Ending Latest</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 2. Test Status Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Test Status
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {tabConfig.map(({ value, label, count }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftTab === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftTab(value)}
                        className="h-8 justify-between px-2.5 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                        <Badge
                          variant={draftTab === value ? "secondary" : "outline"}
                          className="ml-1 h-4 px-1 text-[10px] font-medium shrink-0"
                        >
                          {count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 3. Author Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Author / Created By
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {authorOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftAuthor === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftAuthor(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 4. Duration Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Duration / Time Limit
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {durationOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftDuration === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftDuration(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 5. Questions Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Questions Content
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {questionsOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftQuestions === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftQuestions(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 6. Submissions Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Candidate Submissions
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {attemptsOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftAttempts === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftAttempts(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 7. Visibility Settings */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Visibility Settings
                  </Label>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Results Visibility</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {visibilityOptions.map(({ value, label }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={draftResults === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDraftResults(value)}
                          className="h-7 justify-center px-2 text-xs font-normal"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Marks Visibility</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {visibilityOptions.map(({ value, label }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={draftMarks === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDraftMarks(value)}
                          className="h-7 justify-center px-2 text-xs font-normal"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              <SheetFooter className="p-4 border-t flex flex-row items-center justify-between gap-2 bg-muted/20 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draftFilterCount === 0}
                  onClick={handleResetDraft}
                  className="h-8 text-xs font-normal"
                >
                  Reset All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyFilters}
                  className="h-8 text-xs font-medium gap-1.5 px-4"
                >
                  <span>Apply Filters</span>
                  {draftFilterCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 text-[10px] font-semibold bg-primary-foreground/20 text-primary-foreground"
                    >
                      {draftFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filter Badges Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Active filters:</span>

            {/* Status */}
            {activeTab !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Status: <span className="font-medium capitalize">{activeTab}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all")
                    updateUrl({ tab: "all" })
                    loadTests({ tab: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove status filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Author */}
            {activeAuthor !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Author:{" "}
                <span className="font-medium">
                  {authorOptions.find((a) => a.value === activeAuthor)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAuthor("all")
                    updateUrl({ author: "all" })
                    loadTests({ author: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove author filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Sort */}
            {activeSort !== "default" && activeSortLabel && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Sort: <span className="font-medium">{activeSortLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSort("default")
                    updateUrl({ sort: "default" })
                    loadTests({ sort: "default", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove sort filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Duration */}
            {activeDuration !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Duration:{" "}
                <span className="font-medium">
                  {durationOptions.find((d) => d.value === activeDuration)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDuration("all")
                    updateUrl({ duration: "all" })
                    loadTests({ duration: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove duration filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Questions */}
            {activeQuestions !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Questions:{" "}
                <span className="font-medium">
                  {questionsOptions.find((q) => q.value === activeQuestions)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestions("all")
                    updateUrl({ questions: "all" })
                    loadTests({ questions: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove questions filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Results */}
            {activeResults !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Results: <span className="font-medium capitalize">{activeResults}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveResults("all")
                    updateUrl({ results: "all" })
                    loadTests({ results: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove results filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Marks */}
            {activeMarks !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Marks: <span className="font-medium capitalize">{activeMarks}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMarks("all")
                    updateUrl({ marks: "all" })
                    loadTests({ marks: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove marks filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Attempts */}
            {activeAttempts !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Attempts:{" "}
                <span className="font-medium">
                  {attemptsOptions.find((a) => a.value === activeAttempts)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAttempts("all")
                    updateUrl({ attempts: "all" })
                    loadTests({ attempts: "all", page: 1 })
                  }}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove attempts filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetAll}
              className="h-5 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* ── Edit Folder Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Folder Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g. Amazon Drive 2026"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editFolderName.trim()) {
                    handleEditFolder()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button disabled={isFolderEditing || !editFolderName.trim()} onClick={handleEditFolder}>
              {isFolderEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Folder Header ── */}
      <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-muted/30 border border-border w-fit max-w-full group">
        <Link 
          href="/tests"
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 shrink-0"
        >
          <FolderOpen className="size-4" /> All Drives
        </Link>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground flex items-center gap-2 truncate pr-2">
          <Folder className="size-4 text-primary shrink-0" /> {currentFolder?.name}
          <button 
            onClick={() => {
              setEditFolderName(currentFolder?.name || "")
              setIsEditDialogOpen(true)
            }}
            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 ml-1"
            title="Rename Folder"
          >
            <PenLine className="size-3.5" />
          </button>
        </span>
      </div>

      {/* ── Test Cards List Area ── */}
      <div className="relative">
        <div className="space-y-4">
          {isLoading && items.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card w-full h-[74px]">
                  <div className="flex items-center gap-3 w-full max-w-[70%]">
                    <Skeleton className="size-8 rounded-lg shrink-0" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-[80%]" />
                      <Skeleton className="h-3 w-[50%]" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full shrink-0 ml-4" />
                </div>
              ))}
            </div>
          ) : totalCount === 0 ? (
            <Empty className="border border-dashed rounded-xl p-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FlaskConical className="size-5" />
                </EmptyMedia>
                <EmptyTitle>
                  {activeFilterCount > 0 || searchInput.trim() !== ""
                    ? "No matching tests found"
                    : "No tests created yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {activeFilterCount > 0 || searchInput.trim() !== ""
                    ? "Try adjusting your search terms or resetting active filters."
                    : "Get started by creating your first assessment test for students."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {activeFilterCount > 0 || searchInput.trim() !== "" ? (
                  <Button variant="outline" size="sm" onClick={handleResetAll}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    Create Test
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {enrichedTests.map((t) => (
                  <CompactTestCard
                    key={t.id}
                    test={t}
                  />
                ))}
              </div>

              {/* Infinite Scroll Loader Target */}
              <div ref={observerTarget} className="flex justify-center items-center py-6 w-full min-h-12">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Loading more tests...
                  </div>
                )}
                {!hasMore && items.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Showing all {totalCount} tests
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile Floating Action Button (FAB) ── */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Button
          onClick={handleCreate}
          size="icon"
          className="size-12 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-primary text-primary-foreground flex items-center justify-center"
          aria-label="Create Test"
        >
          <Plus className="size-6" />
        </Button>
      </div>

    </div>
  )
}