"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Clock, Search, X, ChevronRight, CheckCircle2,
  LayoutGrid, LayoutList, TrendingUp, Award, Layers, SlidersHorizontal
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { cn, formatDuration } from "@/lib/utils"
import { Course } from "./types"
import { CourseCover } from "./components/CourseCover"

// ─── Overall Progress Stats Banner ──────────────────────────────────────────
interface StatsBannerProps {
  courses: Course[]
  courseStats: Record<string, { total: number; completed: number; percentage: number }>
}

function OverallStatsBanner({ courses, courseStats }: StatsBannerProps) {
  const overall = useMemo(() => {
    let enrolledCount = 0
    let completedCourses = 0

    courses.forEach(course => {
      const isEnrolled = course.isEnrolled
      if (isEnrolled) {
        enrolledCount++
        const stats = courseStats[course.id]
        if (stats?.percentage === 100) completedCourses++
      }
    })

    return { enrolledCount, completedCourses }
  }, [courses, courseStats])

  const statItems = [
    { icon: <Layers className="h-3.5 w-3.5 text-primary" />, value: courses.length, label: "Total Courses" },
    { icon: <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />, value: overall.enrolledCount, label: "Enrolled" },
    { icon: <Award className="h-3.5 w-3.5 text-amber-500" />, value: overall.completedCourses, label: "Completed" },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {statItems.map((item, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card">
          <div className="shrink-0">{item.icon}</div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground tabular-nums leading-none">{item.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5 truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CourseCard Component (Grid) ────────────────────────────────────────────
interface CourseCardProps {
  course: Course
  stats: { total: number; completed: number; percentage: number }
  onSelect: () => void
}

function CourseCard({ course, stats, onSelect }: CourseCardProps) {
  const isCompleted = stats.percentage === 100

  // Difficulty color dot and text matching the LEVEL_OPTIONS
  const levelColor = course.level === "Beginner" 
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
    : course.level === "Intermediate" 
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"

  const dotColor = course.level === "Beginner" 
    ? "bg-emerald-500" 
    : course.level === "Intermediate" 
      ? "bg-amber-500" 
      : "bg-rose-500"

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "group flex flex-col justify-between overflow-hidden border border-border/50 dark:border-zinc-800/80 bg-card",
        "hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(99,102,241,0.08)] hover:-translate-y-1.5",
        "transition-all duration-300 cursor-pointer h-full select-none p-0 gap-0"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Cover */}
        <div className="aspect-video w-full overflow-hidden bg-muted relative rounded-t-xl">
          <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-500 ease-out">
            <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
          </div>

          {/* Category Badge overlay (top-left) */}
          {course.badge && (
            <span className="absolute top-2.5 left-2.5 backdrop-blur-md bg-black/60 text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              {course.badge}
            </span>
          )}

          {/* Status pill (top-right) if enrolled */}
          {course.isEnrolled && (
            <span className={cn(
              "absolute top-2.5 right-2.5 border text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-black/65 backdrop-blur-xs",
              isCompleted
                ? "text-emerald-400 border-emerald-500/25"
                : "text-primary border-primary/25"
            )}>
              {isCompleted ? "Completed" : "Enrolled"}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1">
          <CardHeader className="px-4 pt-4 pb-0 gap-2">
            {/* Instructor & Type row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {course.instructor.avatar ? (
                  <img
                    src={course.instructor.avatar}
                    alt=""
                    className="h-4.5 w-4.5 rounded-full object-cover shrink-0 border border-primary/20"
                  />
                ) : (
                  <div className="h-4.5 w-4.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[9px] text-primary shrink-0">
                    {course.instructor.name.charAt(0)}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground font-medium truncate">
                  {course.instructor.name}
                </span>
              </div>

              {/* Course type badge */}
              <span className="text-[9px] font-semibold text-muted-foreground/85 uppercase tracking-wider bg-muted px-2 py-0.5 rounded-md border border-border/40 whitespace-nowrap">
                {course.type || "Course"}
              </span>
            </div>

            {/* Title */}
            <CardTitle className="font-semibold text-[13px] text-foreground leading-snug line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors duration-200">
              {course.title}
            </CardTitle>

            {/* Description */}
            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed min-h-[32px]">
              {course.description}
            </p>

            {/* Level badge */}
            <div className="flex items-center pt-0.5">
              <Badge variant="outline" className={cn("text-[9px] font-semibold flex items-center gap-1 px-2 py-0 h-5 rounded-full uppercase tracking-wider", levelColor)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                {course.level}
              </Badge>
            </div>
          </CardHeader>

          {/* Progress / Action */}
          <CardContent className="mt-auto pt-4 pb-4 px-4">
            <div className="border-t border-border/40 pt-3.5 w-full">
              {stats.percentage > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-medium">
                    <span className={cn(
                      "flex items-center gap-1",
                      isCompleted ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
                    )}>
                      {isCompleted ? <><CheckCircle2 className="h-3 w-3 shrink-0" /> Completed</> : "In Progress"}
                    </span>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    )}>{stats.percentage}%</span>
                  </div>
                  <Progress
                    value={stats.percentage}
                    className={cn("h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:to-indigo-500", isCompleted && "[&>[data-slot=progress-indicator]]:from-emerald-500 [&>[data-slot=progress-indicator]]:to-emerald-500")}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] h-[26px]">
                  <span className="text-muted-foreground/75 italic">Not started</span>
                  <span className="text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 text-xs">
                    Start Learning <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}

// ─── CourseRow Component (List View) ────────────────────────────────────────
function CourseRow({ course, stats, onSelect }: CourseCardProps) {
  const isCompleted = stats.percentage === 100

  // Difficulty color dot and text matching the LEVEL_OPTIONS
  const levelColor = course.level === "Beginner" 
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
    : course.level === "Intermediate" 
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"

  const dotColor = course.level === "Beginner" 
    ? "bg-emerald-500" 
    : course.level === "Intermediate" 
      ? "bg-amber-500" 
      : "bg-rose-500"

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card cursor-pointer select-none",
        "hover:border-primary/40 hover:shadow-[0_4px_20px_rgb(99,102,241,0.06)] hover:bg-muted/5",
        "transition-all duration-200"
      )}
    >
      <div className="h-16 w-24 shrink-0 rounded-lg overflow-hidden bg-muted relative">
        <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
        {course.badge && (
          <span className="absolute top-1 left-1 backdrop-blur-xs bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-wider">
            {course.badge}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[8px] font-semibold flex items-center gap-0.5 px-1.5 py-0 h-4 rounded-full uppercase tracking-wider", levelColor)}>
            <span className={cn("h-1 w-1 rounded-full", dotColor)} />
            {course.level}
          </Badge>
          <span className="text-[9px] font-semibold text-muted-foreground/80 uppercase tracking-wider bg-muted/70 px-1.5 py-0.5 rounded border border-border/30">
            {course.type || "Course"}
          </span>
        </div>
        <p className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {course.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1 leading-normal">{course.description}</p>
        <div className="flex items-center gap-3 pt-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {formatDuration(course.duration)}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <BookOpen className="h-3 w-3" /> {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}
          </span>
          {course.instructor && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              {course.instructor.name}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 w-28">
        {stats.percentage > 0 ? (
          <>
            <div className="flex justify-between items-center w-full text-[10px] font-medium">
              <span className={cn(isCompleted ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                {isCompleted ? "Completed" : "In Progress"}
              </span>
              <span className={cn("font-semibold tabular-nums", isCompleted ? "text-emerald-500" : "text-foreground")}>
                {stats.percentage}%
              </span>
            </div>
            <Progress
              value={stats.percentage}
              className={cn("h-1.5 w-full bg-muted [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:to-indigo-500", isCompleted && "[&>[data-slot=progress-indicator]]:from-emerald-500 [&>[data-slot=progress-indicator]]:to-emerald-500")}
            />
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">Not started</span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
    </div>
  )
}

// ─── Filter chip (used inside the sheet) ─────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-sm px-4 py-2 rounded-full border font-medium transition-all duration-150 w-full text-left",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {label}
    </button>
  )
}

// ─── Constants ───────────────────────────────────────────────────────────────
type StatusFilter = "all" | "in-progress" | "completed"
type LevelFilter = "all" | "Beginner" | "Intermediate" | "Advanced"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Courses" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

const LEVEL_OPTIONS: { value: LevelFilter; label: string; hex: string }[] = [
  { value: "all", label: "All Levels", hex: "" },
  { value: "Beginner", label: "Beginner", hex: "#16a34a" },
  { value: "Intermediate", label: "Intermediate", hex: "#f59e0b" },
  { value: "Advanced", label: "Advanced", hex: "#e11d48" },
]

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Course", label: "Course" },
  { value: "Specialization", label: "Specialization" },
  { value: "Professional Certificate", label: "Professional Certificate" },
]

// ─── Main Component ──────────────────────────────────────────────────────────
export function CandidateCourseClient({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [badgeFilter, setBadgeFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // Restore view mode from localStorage & sync initialCourses
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedView = localStorage.getItem("placetrix_courses_view")
    if (savedView === "list" || savedView === "grid") setViewMode(savedView)
  }, [])

  useEffect(() => {
    setCourses(initialCourses)
  }, [initialCourses])

  const handleViewToggle = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("placetrix_courses_view", mode)
  }

  // Per-course stats
  const courseStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; percentage: number }> = {}
    courses.forEach(course => {
      let total = 0, completed = 0
      course.modules.forEach(mod => { total++; if (mod.completed) completed++ })
      map[course.id] = { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
    })
    return map
  }, [courses])

  // Get dynamic categories list from courses
  const availableBadges = useMemo(() => {
    const badges = new Set<string>()
    courses.forEach(c => {
      if (c.badge) badges.add(c.badge)
    })
    return Array.from(badges).sort()
  }, [courses])

  // Active filter count (for badge on filter button)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter !== "all") count++
    if (levelFilter !== "all") count++
    if (typeFilter !== "all") count++
    if (badgeFilter !== "all") count++
    return count
  }, [statusFilter, levelFilter, typeFilter, badgeFilter])

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      if (statusFilter !== "all") {
        const stats = courseStats[course.id]
        if (statusFilter === "in-progress" && !(stats && stats.percentage > 0 && stats.percentage < 100)) return false
        if (statusFilter === "completed" && !(stats && stats.percentage === 100)) return false
      }
      if (levelFilter !== "all" && course.level !== levelFilter) return false
      if (typeFilter !== "all" && course.type !== typeFilter) return false
      if (badgeFilter !== "all" && course.badge !== badgeFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [courses, statusFilter, levelFilter, typeFilter, badgeFilter, searchQuery, courseStats])

  const clearAllFilters = () => {
    setStatusFilter("all")
    setLevelFilter("all")
    setTypeFilter("all")
    setBadgeFilter("all")
    setSearchQuery("")
  }

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== ""

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground">
          {courses.length} course{courses.length !== 1 ? "s" : ""} curated for your placement journey
        </p>
      </div>

      {/* Stats Banner */}
      <OverallStatsBanner courses={courses} courseStats={courseStats} />

      {/* Toolbar: Search + Filter + View Toggle */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterSheetOpen(true)}
          className={cn(
            "h-9 gap-1.5 rounded-lg shrink-0 border-border/70",
            activeFilterCount > 0 && "border-primary/40 text-primary bg-primary/5"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* View Toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5 h-9 shrink-0">
          <button
            onClick={() => handleViewToggle("grid")}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md transition-all duration-150",
              viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleViewToggle("list")}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md transition-all duration-150",
              viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="List view"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Active filter summary strip */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 -mt-3">
          <span className="text-[11px] text-muted-foreground">
            {filteredCourses.length} of {courses.length} courses
          </span>
          <button
            onClick={clearAllFilters}
            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        </div>
      )}

      {/* Courses Grid / List */}
      {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3 border border-dashed border-border/60 rounded-xl bg-card/50">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">No courses found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-xs text-primary hover:underline font-medium">
              Clear all filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-300">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              stats={courseStats[course.id]}
              onSelect={() => router.push(`/courses/${course.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-in fade-in duration-300">
          {filteredCourses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              stats={courseStats[course.id]}
              onSelect={() => router.push(`/courses/${course.id}`)}
            />
          ))}
        </div>
      )}

      {/* ─── Filter Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[360px] flex flex-col gap-0 p-0">
          {/* Sheet Header — pr-10 clears the built-in absolute close button */}
          <SheetHeader className="px-6 pt-5 pb-4 pr-10 border-b border-border/50">
            <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Narrow down by status, level, type and category.
            </SheetDescription>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter("all"); setLevelFilter("all"); setTypeFilter("all"); setBadgeFilter("all") }}
                className="text-xs text-primary hover:underline font-medium text-left"
              >
                Clear all
              </button>
            )}
          </SheetHeader>

          {/* Filter body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

            {/* Status */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              <div className="flex flex-col gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    active={statusFilter === opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty Level</p>
              <div className="flex flex-col gap-2">
                {LEVEL_OPTIONS.map(opt => {
                  const isActive = levelFilter === opt.value
                  const activeStyle = isActive && opt.hex
                    ? { backgroundColor: opt.hex, borderColor: opt.hex, color: "#fff" }
                    : {}
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setLevelFilter(opt.value)}
                      style={activeStyle}
                      className={cn(
                        "text-sm px-4 py-2 rounded-full border font-medium transition-all duration-150 w-full text-left",
                        isActive
                          ? opt.hex
                            ? "border-transparent"
                            : "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Course Type */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Course Type</p>
              <div className="flex flex-col gap-2">
                {TYPE_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    active={typeFilter === opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* Category / Badge */}
            {availableBadges.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Category</p>
                <div className="flex flex-col gap-2">
                  <FilterChip
                    label="All Categories"
                    active={badgeFilter === "all"}
                    onClick={() => setBadgeFilter("all")}
                  />
                  {availableBadges.map(badge => (
                    <FilterChip
                      key={badge}
                      label={badge}
                      active={badgeFilter === badge}
                      onClick={() => setBadgeFilter(badge)}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-5 border-t border-border/50">
            <Button
              className="w-full rounded-full font-semibold"
              onClick={() => setFilterSheetOpen(false)}
            >
              Show {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}