"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  BookOpen,
  Clock,
  Search,
  CheckCircle2,
  Lock,
  Award,
  Sparkles,
  ArrowLeft,
  Check,
  FileText,
  PlayCircle,
  HelpCircle,
  Code,
  Layers,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Lesson {
  id: string
  title: string
  duration: string
  type: "video" | "article" | "quiz" | "exercise"
  completed: boolean
}

export interface Module {
  id: string
  title: string
  description?: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  description: string
  category: "Core CS" | "Web Development" | "Interview Prep" | "System Design"
  level: "Beginner" | "Intermediate" | "Advanced"
  duration: string
  instructor: {
    name: string
    role: string
    avatar: string
  }
  modules: Module[]
}

// ─── Initial Placeholder Data ──────────────────────────────────────────────────

const INITIAL_COURSES: Course[] = [
  {
    id: "algo-ds-masterclass",
    title: "Algorithms & Data Structures Masterclass",
    description: "Master complex algorithms and data structures to ace your technical interviews. Covers trees, graphs, dynamic programming, and system design basics.",
    category: "Core CS",
    level: "Advanced",
    duration: "24h 15m",
    instructor: {
      name: "Dr. Evelyn Vance",
      role: "Ex-Google Staff Engineer",
      avatar: "EV"
    },
    modules: [
      {
        id: "m1",
        title: "Complexity Analysis & Arrays",
        description: "Understand Big-O notation, space-time complexity, and basic memory allocations.",
        lessons: [
          { id: "l1", title: "Introduction to Big-O Notation", duration: "15 min", type: "video", completed: true },
          { id: "l2", title: "Space vs Time Complexity Tradeoffs", duration: "25 min", type: "article", completed: true },
          { id: "l3", title: "Two-Pointer Technique & Sliding Window", duration: "45 min", type: "exercise", completed: false },
          { id: "l4", title: "Module Quiz: Array Foundations", duration: "20 min", type: "quiz", completed: false }
        ]
      },
      {
        id: "m2",
        title: "Linked Lists, Stacks & Queues",
        description: "Learn pointer manipulation, linear structures, and their applications.",
        lessons: [
          { id: "l5", title: "Singly and Doubly Linked List Operations", duration: "30 min", type: "video", completed: false },
          { id: "l6", title: "Design a Min Stack in O(1) Time", duration: "40 min", type: "exercise", completed: false },
          { id: "l7", title: "Queue Implementations using Stacks", duration: "35 min", type: "exercise", completed: false }
        ]
      },
      {
        id: "m3",
        title: "Trees, BSTs & Tries",
        description: "Master hierarchical data structures and search trees.",
        lessons: [
          { id: "l8", title: "Binary Tree Traversals (Inorder, Preorder, Postorder)", duration: "35 min", type: "video", completed: false },
          { id: "l9", title: "Binary Search Tree Validation and Insertion", duration: "40 min", type: "exercise", completed: false },
          { id: "l10", title: "Trie (Prefix Tree) Implementation", duration: "50 min", type: "exercise", completed: false }
        ]
      },
      {
        id: "m4",
        title: "Graph Algorithms & Traversals",
        description: "Navigate complex node structures and find shortest paths.",
        lessons: [
          { id: "l11", title: "BFS and DFS Implementations", duration: "45 min", type: "video", completed: false },
          { id: "l12", title: "Cycle Detection in Directed/Undirected Graphs", duration: "40 min", type: "exercise", completed: false },
          { id: "l13", title: "Dijkstra's Shortest Path Algorithm", duration: "60 min", type: "exercise", completed: false }
        ]
      }
    ]
  },
  {
    id: "nextjs-supabase-dev",
    title: "Full-Stack Development with Next.js & Supabase",
    description: "Build modern, scalable web applications using Next.js App Router, Tailwind CSS, and Supabase for database and authentication.",
    category: "Web Development",
    level: "Intermediate",
    duration: "18h 30m",
    instructor: {
      name: "Marcus Chen",
      role: "Lead Frontend Architect",
      avatar: "MC"
    },
    modules: [
      {
        id: "n-m1",
        title: "Next.js App Router Foundations",
        description: "Understand layouts, nested routing, and Server vs Client Components.",
        lessons: [
          { id: "n-l1", title: "Understanding React Server Components", duration: "20 min", type: "video", completed: true },
          { id: "n-l2", title: "File-Based Routing & Dynamic Routes", duration: "18 min", type: "video", completed: true },
          { id: "n-l3", title: "Shared Layouts and Error Handling", duration: "15 min", type: "article", completed: true },
          { id: "n-l4", title: "RSC Data Fetching Patterns", duration: "30 min", type: "exercise", completed: false }
        ]
      },
      {
        id: "n-m2",
        title: "Database Schema & Supabase Setup",
        description: "Set up your database, migrations, and Row Level Security (RLS).",
        lessons: [
          { id: "n-l5", title: "Setting up your Supabase Project", duration: "12 min", type: "video", completed: true },
          { id: "n-l6", title: "Designing Schema with PostgreSQL", duration: "25 min", type: "article", completed: false },
          { id: "n-l7", title: "Writing Row Level Security Rules", duration: "35 min", type: "exercise", completed: false }
        ]
      },
      {
        id: "n-m3",
        title: "Authentication & Route Protection",
        description: "Secure your pages with SSR Auth and Supabase Guard Middleware.",
        lessons: [
          { id: "n-l8", title: "Email and OAuth Setup in Supabase", duration: "22 min", type: "video", completed: false },
          { id: "n-l9", title: "Middleware Authentication Guards", duration: "20 min", type: "article", completed: false },
          { id: "n-l10", title: "Creating Login/Signup Pages in Next.js", duration: "45 min", type: "exercise", completed: false }
        ]
      }
    ]
  },
  {
    id: "behavioral-interviews-soft-skills",
    title: "Behavioral Interviewing & Soft Skills for Tech",
    description: "Learn how to structure your answers using the STAR method, answer tricky behavioral questions, and showcase leadership.",
    category: "Interview Prep",
    level: "Beginner",
    duration: "6h 45m",
    instructor: {
      name: "Sarah Jenkins",
      role: "HR Director at Tech Corp",
      avatar: "SJ"
    },
    modules: [
      {
        id: "b-m1",
        title: "Understanding Behavioral Interviews",
        description: "Why tech companies test behaviors and how rubrics evaluate candidates.",
        lessons: [
          { id: "b-l1", title: "What Interviewers Look For", duration: "15 min", type: "video", completed: true },
          { id: "b-l2", title: "Decoding the Leadership Principles", duration: "20 min", type: "article", completed: true },
          { id: "b-l3", title: "Quiz: Core Professional Competencies", duration: "15 min", type: "quiz", completed: true }
        ]
      },
      {
        id: "b-m2",
        title: "The STAR Method Demystified",
        description: "Situation, Task, Action, and Result formatting for maximum impact.",
        lessons: [
          { id: "b-l4", title: "Structuring with STAR", duration: "22 min", type: "video", completed: true },
          { id: "b-l5", title: "Deep Dive into Actions and Quantifiable Results", duration: "18 min", type: "article", completed: true },
          { id: "b-l6", title: "Mock Walkthrough: Technical Failure Story", duration: "30 min", type: "video", completed: true }
        ]
      },
      {
        id: "b-m3",
        title: "Crafting Your Stories",
        description: "Write and polish stories about conflict, collaboration, and learning.",
        lessons: [
          { id: "b-l7", title: "Conflict Resolution with Teammates", duration: "25 min", type: "exercise", completed: true },
          { id: "b-l8", title: "Showcasing Ownership and Leadership", duration: "30 min", type: "exercise", completed: false }
        ]
      }
    ]
  },
  {
    id: "system-design-scale",
    title: "System Design at Scale",
    description: "Learn how to design highly scalable, fault-tolerant distributed systems. Covers caching, load balancing, sharding, and real-world system architecture.",
    category: "System Design",
    level: "Advanced",
    duration: "14h 20m",
    instructor: {
      name: "Alex Mercer",
      role: "Principal Infrastructure Architect",
      avatar: "AM"
    },
    modules: [
      {
        id: "s-m1",
        title: "Foundations of Distributed Systems",
        description: "Scale from single servers to global networks.",
        lessons: [
          { id: "s-l1", title: "Vertical vs Horizontal Scaling", duration: "20 min", type: "video", completed: false },
          { id: "s-l2", title: "Load Balancers (Nginx, HAProxy, Round Robin)", duration: "30 min", type: "video", completed: false },
          { id: "s-l3", title: "CAP Theorem and PACELC Explained", duration: "25 min", type: "article", completed: false }
        ]
      },
      {
        id: "s-m2",
        title: "Storage Systems & Caching",
        description: "Designing efficient read and write paths.",
        lessons: [
          { id: "s-l4", title: "Relational vs NoSQL Database Selection", duration: "35 min", type: "video", completed: false },
          { id: "s-l5", title: "Database Sharding and Replication", duration: "45 min", type: "article", completed: false },
          { id: "s-l6", title: "Caching Strategies: Write-Through vs Cache-Aside", duration: "30 min", type: "exercise", completed: false }
        ]
      }
    ]
  }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLessonIcon(type: Lesson["type"]) {
  switch (type) {
    case "video":
      return <PlayCircle className="h-4 w-4 text-indigo-500 shrink-0" />
    case "article":
      return <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
    case "quiz":
      return <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
    case "exercise":
      return <Code className="h-4 w-4 text-rose-500 shrink-0" />
  }
}

function StatChip({
  icon,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode
  children: React.ReactNode
  tone?: "neutral" | "sky" | "emerald" | "amber" | "violet" | "rose"
}) {
  const tones = {
    neutral: "border-border/60 bg-muted/50 text-muted-foreground",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  } as const

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

interface CourseCardProps {
  course: Course
  stats: { total: number; completed: number; percentage: number }
  onSelect: () => void
}

function CourseCard({ course, stats, onSelect }: CourseCardProps) {
  const isCompleted = stats.percentage === 100
  const isInProgress = stats.percentage > 0 && stats.percentage < 100

  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground">
              {course.title}
            </h3>
            
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal bg-muted/40 text-muted-foreground border-border/60">
              {course.level}
            </Badge>

            {isCompleted && (
              <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
                Completed
              </Badge>
            )}

            {isInProgress && (
              <Badge className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5">
                In Progress
              </Badge>
            )}
          </div>

          {course.description && (
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
              {course.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip icon={<Clock className="h-3.5 w-3.5" />}>
              {course.duration}
            </StatChip>
            <StatChip icon={<BookOpen className="h-3.5 w-3.5" />}>
              {course.modules.length} modules
            </StatChip>
            <StatChip icon={<Layers className="h-3.5 w-3.5" />}>
              {course.category}
            </StatChip>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 md:min-w-[220px] md:items-end md:pt-0 md:border-t-0 md:text-right">
          <div className="flex flex-col gap-1 md:items-end">
            {stats.percentage > 0 ? (
              <>
                <span className="text-xs font-medium text-foreground">
                  {stats.percentage}% Complete
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {stats.completed}/{stats.total} lessons
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Not started</span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onSelect}
            className="w-full md:w-auto md:self-end"
          >
            {isCompleted ? "Review Course" : stats.percentage > 0 ? "Continue" : "Start Course"}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function CandidateCourse() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES)
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  // Find currently active course
  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === activeCourseId) || null
  }, [courses, activeCourseId])

  // Toggle completion of a lesson
  const toggleLesson = (courseId: string, moduleId: string, lessonId: string) => {
    setCourses(prevCourses => {
      return prevCourses.map(course => {
        if (course.id !== courseId) return course

        return {
          ...course,
          modules: course.modules.map(mod => {
            if (mod.id !== moduleId) return mod

            return {
              ...mod,
              lessons: mod.lessons.map(lesson => {
                if (lesson.id !== lessonId) return lesson
                return { ...lesson, completed: !lesson.completed }
              })
            }
          })
        }
      })
    })
  }

  // Toggle completion for all lessons in a module
  const toggleAllLessonsInModule = (courseId: string, moduleId: string, forceComplete: boolean) => {
    setCourses(prevCourses => {
      return prevCourses.map(course => {
        if (course.id !== courseId) return course

        return {
          ...course,
          modules: course.modules.map(mod => {
            if (mod.id !== moduleId) return mod

            return {
              ...mod,
              lessons: mod.lessons.map(lesson => ({
                ...lesson,
                completed: forceComplete
              }))
            }
          })
        }
      })
    })
  }

  // Calculate statistics for each course
  const courseStats = useMemo(() => {
    const statsMap: Record<string, { total: number; completed: number; percentage: number }> = {}
    
    courses.forEach(course => {
      let total = 0
      let completed = 0
      
      course.modules.forEach(mod => {
        mod.lessons.forEach(l => {
          total++
          if (l.completed) completed++
        })
      })
      
      statsMap[course.id] = {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })
    
    return statsMap
  }, [courses])

  // Map tabs values to friendly UI categories
  const categoriesMap: Record<string, string> = {
    all: "All",
    "core-cs": "Core CS",
    "web-dev": "Web Development",
    "interview-prep": "Interview Prep",
    "system-design": "System Design",
  }

  // Calculate counts for categories tabs
  const tabCounts = useMemo(() => {
    const counts = { all: 0, "core-cs": 0, "web-dev": 0, "interview-prep": 0, "system-design": 0 }
    courses.forEach(course => {
      counts.all++
      if (course.category === "Core CS") counts["core-cs"]++
      if (course.category === "Web Development") counts["web-dev"]++
      if (course.category === "Interview Prep") counts["interview-prep"]++
      if (course.category === "System Design") counts["system-design"]++
    })
    return counts
  }, [courses])

  // Filter courses based on search and selected tab
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Category filter based on activeTab
      if (activeTab !== "all") {
        const expectedCategory = categoriesMap[activeTab]
        if (course.category !== expectedCategory) return false
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase()
        const matchTitle = course.title.toLowerCase().includes(query)
        const matchDesc = course.description.toLowerCase().includes(query)
        return matchTitle || matchDesc
      }

      return true
    })
  }, [courses, activeTab, searchQuery])

  // Tab configurations matching CandidateTestsClient tabs style
  const tabConfig = [
    { value: "all", label: "All", count: tabCounts.all },
    { value: "core-cs", label: "Core CS", count: tabCounts["core-cs"] },
    { value: "web-dev", label: "Web Dev", count: tabCounts["web-dev"] },
    { value: "interview-prep", label: "Interview Prep", count: tabCounts["interview-prep"] },
    { value: "system-design", label: "System Design", count: tabCounts["system-design"] },
  ]

  const handleReset = () => {
    setCourses(INITIAL_COURSES)
  }

  if (activeCourse) {
    const stats = courseStats[activeCourse.id]

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8 max-w-7xl mx-auto animate-in fade-in-50 duration-300">
        
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveCourseId(null)}
            className="group gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Courses
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Reset Progress
          </Button>
        </div>

        {/* Selected Course Minimal Header */}
        <div className="flex flex-col gap-2 border-b pb-4 border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {activeCourse.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {activeCourse.level}
            </Badge>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold font-cirka tracking-tight text-foreground">
            {activeCourse.title}
          </h1>
          
          <p className="text-sm text-muted-foreground max-w-4xl leading-relaxed">
            {activeCourse.description}
          </p>
        </div>

        {/* Course Details Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Modules Accordion (Left & Middle) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Course Syllabus
              </h2>
              <span className="text-[10px] text-muted-foreground italic">Click lessons to mark completed</span>
            </div>

            <Accordion type="multiple" defaultValue={activeCourse.modules.map(m => m.id)} className="w-full space-y-3">
              {activeCourse.modules.map((mod, index) => {
                const modCompleted = mod.lessons.filter(l => l.completed).length
                const modTotal = mod.lessons.length
                const isAllCompleted = modCompleted === modTotal

                return (
                  <AccordionItem
                    key={mod.id}
                    value={mod.id}
                    className="border border-border/70 bg-card rounded-lg px-4 py-0.5 overflow-hidden transition-all"
                  >
                    <AccordionTrigger
                      className="hover:no-underline py-4 flex-col sm:flex-row items-start sm:items-center gap-2 [&[data-state=open]>svg]:rotate-180"
                    >
                      <div className="flex items-start gap-3 w-full text-left">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="space-y-0.5 w-full min-w-0 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground leading-tight">
                              {mod.title}
                            </span>
                            {isAllCompleted ? (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/20 text-[9px] px-1.5 py-0 font-normal">
                                Completed
                              </Badge>
                            ) : modCompleted > 0 ? (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal text-muted-foreground">
                                In Progress
                              </Badge>
                            ) : null}
                          </div>
                          {mod.description && (
                            <p className="text-xs text-muted-foreground font-normal line-clamp-1">
                              {mod.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 shrink-0 ml-8 sm:ml-auto pr-2 mt-2 sm:mt-0" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {modCompleted}/{modTotal} lessons
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => toggleAllLessonsInModule(activeCourse.id, mod.id, !isAllCompleted)}
                          className="h-6 text-[10px] px-2 hover:bg-muted text-muted-foreground font-medium"
                        >
                          {isAllCompleted ? "Reset" : "Complete"}
                        </Button>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pt-2 pb-4 border-t border-border/30">
                      <div className="space-y-2 mt-2">
                        {mod.lessons.map(lesson => (
                          <div
                            key={lesson.id}
                            onClick={() => toggleLesson(activeCourse.id, mod.id, lesson.id)}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-md border text-xs cursor-pointer select-none transition-all",
                              lesson.completed
                                ? "bg-emerald-50/10 border-emerald-250/20 dark:bg-emerald-950/5 dark:border-emerald-800/10"
                                : "bg-muted/10 border-transparent hover:bg-muted/40 hover:border-border/60"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                  lesson.completed
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-muted-foreground/30 bg-background text-transparent hover:border-indigo-500"
                                )}
                              >
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </div>
                              
                              <div className="flex items-center gap-2 min-w-0">
                                {getLessonIcon(lesson.type)}
                                <span className={cn(
                                  "font-medium text-foreground truncate",
                                  lesson.completed && "text-muted-foreground line-through decoration-muted-foreground/45"
                                )}>
                                  {lesson.title}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <span className="text-muted-foreground text-[10px] capitalize border border-border/30 bg-background/50 px-1 py-0.5 rounded">
                                {lesson.type}
                              </span>
                              <span className="text-muted-foreground text-[10px] w-12 text-right">
                                {lesson.duration}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>

          {/* Stats, Certificate & Instructor Sidebar */}
          <div className="space-y-6">
            
            {/* Minimal Progress Card */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-semibold text-foreground">{stats.percentage}%</span>
                </div>
                <Progress value={stats.percentage} className="h-1.5" />
                <div className="pt-3 flex flex-col gap-2 border-t border-border/40 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-foreground">{activeCourse.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level</span>
                    <span className="font-medium text-foreground">{activeCourse.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">{activeCourse.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Lessons</span>
                    <span className="font-medium text-foreground">{stats.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Unlock Card */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                  Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.percentage === 100 ? (
                  <div className="space-y-3">
                    <div className="p-3 border border-emerald-250/20 bg-emerald-500/5 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                        Course completed successfully! Your certificate has been unlocked.
                      </span>
                    </div>
                    
                    <Button size="sm" className="w-full text-xs h-8">
                      Download Certificate
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/40 border border-border/40 rounded-lg flex items-start gap-2.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      Complete all curriculum lessons above to unlock the course certificate.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructor Details Card */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instructor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs shrink-0 border border-border/60">
                    {activeCourse.instructor.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {activeCourse.instructor.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {activeCourse.instructor.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      
      {/* Minimal Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground">
          {courses.length} courses available in your curriculum
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v) }}>
        <div className="space-y-4">
          
          {/* Search (left) + Tabs List (right) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-xs h-9"
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

            {/* Tabs List */}
            <div className="overflow-x-auto shrink-0 w-full sm:w-auto">
              <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1 w-full sm:w-auto justify-start">
                {tabConfig.map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {label}
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                        activeTab === value
                          ? "bg-foreground text-background"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

          </div>

          {/* Courses List */}
          <div className="space-y-4">
            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">No courses found</p>
                  <p className="text-xs text-muted-foreground">Adjust your filters or search query to find courses</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    stats={courseStats[course.id]}
                    onSelect={() => setActiveCourseId(course.id)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </Tabs>
      
    </div>
  )
}
