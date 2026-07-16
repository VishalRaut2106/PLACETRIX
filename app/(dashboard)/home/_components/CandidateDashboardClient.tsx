"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Award,
  ArrowRight,
  Clock,
  Laptop,
  BookOpen,
  ChevronRight,
  FileText,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { LicenseBanner } from "@/components/license/LicenseBanner"
import { Suspense } from "react"

interface ProblemStats {
  total: number
  solved: number
  easy: { total: number; solved: number }
  medium: { total: number; solved: number }
  hard: { total: number; solved: number }
}

interface TestStats {
  total_tests: number
  live_tests: number
  upcoming_tests: number
  completed_tests: number
  average_score: number
}

interface MockTest {
  id: string
  title: string
  description: string | null
  time_limit_seconds: number | null
  available_from: string | null
  available_until: string | null
}

interface CandidateDashboardClientProps {
  profile: {
    id: string
    username: string | null
    full_name: string | null
    first_name: string | null
    last_name: string | null
    profile_updated: boolean
    institute_id: string | null
  }
  stats: TestStats
  globalStats: ProblemStats
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: Array<{
    date: string
    count: number
    status: "none" | "attempted" | "solved"
  }>
  liveTests: MockTest[]
  upcomingTests: MockTest[]
  todayStr: string
}


function ConcentricRing({
  radius,
  value,
  max,
  className,
  trackClassName,
}: {
  radius: number
  value: number
  max: number
  className?: string
  trackClassName?: string
}) {
  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? value / max : 0
  const strokeDashoffset = circumference - percent * circumference

  return (
    <g transform="rotate(-90 50 50)" className="origin-center">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="5"
        className={cn("stroke-muted/20 dark:stroke-muted/10", trackClassName)}
      />
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="5"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        strokeLinecap="round"
        className={cn("stroke-primary", className)}
      />
    </g>
  )
}

// Staggered layout variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 15,
    },
  },
} as const

export function CandidateDashboardClient({
  profile,
  stats,
  globalStats,
  streakStats,
  activityCalendar,
  liveTests,
  upcomingTests,
  todayStr,
}: CandidateDashboardClientProps) {
  const [greeting, setGreeting] = useState("Hello")

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours >= 0 && hours <= 6) setGreeting("Still up? You're Unstoppable")
    else if (hours < 12) setGreeting("Good morning")
    else if (hours < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  const computedFirstName = profile.full_name ? profile.full_name.split(' ')[0] : null
  const profileName = computedFirstName || profile.username || "Candidate"
  const isProfileComplete = profile.profile_updated === true

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      <Suspense><LicenseBanner /></Suspense>

      {!isProfileComplete && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-3 min-w-0">
            <Award className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="font-semibold leading-none">Profile Incomplete</p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">
                Please complete your profile to unlock placement opportunities, test schedules, and other features.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 shrink-0 font-medium">
            <Link href="/myprofile">Complete Profile</Link>
          </Button>
        </div>
      )}

      {/* ─── Bento Grid Layout ─── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
      >

        {/* Cell 1: Welcome & Streak (col-span-3 - natural height header) */}
        <motion.div variants={itemVariants} className="lg:col-span-3 md:col-span-2 col-span-1">
          <Card className="relative overflow-hidden bg-card border border-border/40 shadow-sm rounded-2xl group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col p-0 gap-0">
            {/* Glowing gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.03] to-sky-500/[0.06] pointer-events-none" />

            {/* Tech Dot Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

            {/* Dynamic background blur blobs (Indigo, Purple, and Sky Blue) */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/25 transition-all duration-300 pointer-events-none" />
            <div className="absolute right-1/4 top-1/4 w-32 h-32 bg-sky-500/15 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-6 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-300 pointer-events-none" />

            <CardContent className="p-5 relative z-10 flex flex-col justify-start gap-3.5">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-bold font-cirka tracking-tight text-foreground leading-tight">
                  {greeting}, {profileName}!
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Track your Placements, Mock Tests, and Progress in Coding Challenges all from One Dashboard.
                </p>
              </div>

              {!isProfileComplete && (
                <div className="pt-1">
                  <Link href="/myprofile">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/5">
                      Complete Profile
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cell 2: Coding Challenges (col-span-1) */}
        <motion.div variants={itemVariants} className="col-span-1">
          <Card className="bg-card border border-border/40 shadow-sm rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col p-0 gap-0 h-full">
            <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Logic Lab Challenges
              </div>

              <div className="flex items-center justify-between gap-4 flex-1">
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-2xl font-extrabold text-foreground tracking-tight">
                      {globalStats.solved} <span className="text-xs font-normal text-muted-foreground">/ {globalStats.total} Solved</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {/* Easy */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="font-medium">Easy</span>
                        </div>
                        <span className="font-semibold text-foreground">{globalStats.easy.solved}/{globalStats.easy.total}</span>
                      </div>
                      <Progress
                        value={globalStats.easy.total > 0 ? (globalStats.easy.solved / globalStats.easy.total) * 100 : 0}
                        className="h-1 bg-emerald-500/10 [&>div]:bg-emerald-500"
                      />
                    </div>
                    {/* Medium */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="font-medium">Medium</span>
                        </div>
                        <span className="font-semibold text-foreground">{globalStats.medium.solved}/{globalStats.medium.total}</span>
                      </div>
                      <Progress
                        value={globalStats.medium.total > 0 ? (globalStats.medium.solved / globalStats.medium.total) * 100 : 0}
                        className="h-1 bg-amber-500/10 [&>div]:bg-amber-500"
                      />
                    </div>
                    {/* Hard */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          <span className="font-medium">Hard</span>
                        </div>
                        <span className="font-semibold text-foreground">{globalStats.hard.solved}/{globalStats.hard.total}</span>
                      </div>
                      <Progress
                        value={globalStats.hard.total > 0 ? (globalStats.hard.solved / globalStats.hard.total) * 100 : 0}
                        className="h-1 bg-rose-500/10 [&>div]:bg-rose-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Concentric Ring Graphic */}
                <div className="relative h-24 w-24 shrink-0 flex items-center justify-center transition-transform duration-500 hover:scale-105">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <ConcentricRing
                      radius={42}
                      value={globalStats.easy.solved}
                      max={globalStats.easy.total}
                      className="stroke-emerald-500"
                    />
                    <ConcentricRing
                      radius={32}
                      value={globalStats.medium.solved}
                      max={globalStats.medium.total}
                      className="stroke-amber-500"
                    />
                    <ConcentricRing
                      radius={22}
                      value={globalStats.hard.solved}
                      max={globalStats.hard.total}
                      className="stroke-rose-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold tracking-tight text-foreground">
                      {globalStats.total > 0 ? Math.round((globalStats.solved / globalStats.total) * 100) : 0}
                      <span className="text-xs font-semibold text-muted-foreground/80 ml-0.5">%</span>
                    </span>
                    <span className="text-[7px] font-bold tracking-widest text-muted-foreground/80 uppercase">Progress</span>
                  </div>
                </div>
              </div>

              {/* Streak Footer Grid */}
              <div className="grid grid-cols-2 gap-1 bg-background/50 dark:bg-muted/10 rounded-xl p-2 border border-border/20 select-none text-center">
                <div>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Current Streak</span>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">{streakStats.currentStreak} Days</span>
                </div>
                <div className="border-l border-border/20">
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Max Streak</span>
                  <span className="text-xs font-bold text-foreground block">{streakStats.maxStreak} Days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cell 3: Mock Test Performance (col-span-1) */}
        <motion.div variants={itemVariants} className="col-span-1">
          <Card className="bg-card border border-border/40 shadow-sm rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col p-0 gap-0 h-full">
            <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mock Test Performance
              </div>

              <div className="flex items-center justify-between gap-4 flex-1">
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-2xl font-extrabold text-foreground tracking-tight">
                      {stats.completed_tests} <span className="text-xs font-normal text-muted-foreground">Tests Taken</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="font-medium">Test Accuracy</span>
                      <span className="font-semibold text-foreground">{Math.round(stats.average_score)}%</span>
                    </div>
                    <Progress
                      value={stats.average_score}
                      className="h-1 bg-primary/10 [&>div]:bg-primary"
                    />
                  </div>
                </div>

                {/* Accuracy Circular Indicator */}
                <div className="relative h-24 w-24 shrink-0 flex items-center justify-center transition-transform duration-500 hover:scale-105">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <ConcentricRing
                      radius={36}
                      value={stats.average_score}
                      max={100}
                      className="stroke-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold tracking-tight text-primary">
                      {Math.round(stats.average_score)}
                      <span className="text-xs font-semibold text-primary/70 ml-0.5">%</span>
                    </span>
                    <span className="text-[7px] font-bold tracking-widest text-muted-foreground/80 uppercase text-center leading-none mt-0.5">Avg Score</span>
                  </div>
                </div>
              </div>

              {/* Micro grid stats */}
              <div className="grid grid-cols-3 gap-1 bg-background/50 dark:bg-muted/10 rounded-xl p-2 border border-border/20 select-none text-center">
                <div>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Assigned</span>
                  <span className="text-xs font-bold text-foreground block">{stats.total_tests}</span>
                </div>
                <div className="border-x border-border/20">
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Live</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">{stats.live_tests}</span>
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Done</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">{stats.completed_tests}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cell 4: Practice Activity Calendar (md:col-span-2 lg:col-span-1) */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <Card className="bg-card border border-border/40 shadow-sm rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col p-0 gap-0 h-full">
            <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Practice Activity
              </div>

              <div className="flex-1 flex items-center justify-center w-full my-auto">
                <div className="grid grid-cols-7 gap-2 w-full">
                  {activityCalendar.map((day) => {
                    const isToday = day.date === todayStr
                    return (
                      <div
                        key={day.date}
                        className={cn(
                          "aspect-square w-full rounded-full border flex flex-col items-center justify-center gap-0.5 transition-all relative group cursor-default hover:scale-105",
                          day.status === "solved"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : day.status === "attempted"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                              : "bg-background border-border/30 text-muted-foreground",
                          isToday && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-background"
                        )}
                      >
                        <span className="text-xs font-bold leading-none">
                          {new Date(day.date).getDate()}
                        </span>
                        <span className="text-[8px] opacity-75 uppercase font-medium leading-none">
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).substring(0, 1)}
                        </span>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground border text-xs px-2.5 py-1.5 rounded shadow-lg z-30 whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1">
                          <p className="font-semibold">{day.date}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {day.count} submission{day.count !== 1 && "s"} · {day.status === "solved" ? "Solved Challenge" : day.status === "attempted" ? "Attempted" : "No submissions"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Legend Footer */}
              <div className="grid grid-cols-2 gap-1 bg-background/50 dark:bg-muted/10 rounded-xl p-2 border border-border/20 select-none text-center">
                <div>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Timeframe</span>
                  <span className="text-xs font-bold text-foreground block">Last 14 Days</span>
                </div>
                <div className="border-l border-border/20 flex flex-col justify-center items-center">
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Legend</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-background border border-border/30" />
                      <span>No Activity</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span>Attempted</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Solved</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cell 5: Active & Upcoming Tests (col-span-2 on lg) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 md:col-span-2 col-span-1">
          <Card className="bg-card border border-border/40 shadow-sm rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col p-0 gap-0 h-full">
            <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active & Upcoming Tests
              </div>
              {liveTests.length === 0 && upcomingTests.length === 0 ? (
                <Empty className="p-8 border-dashed border-border/30 rounded-xl bg-background/10 flex-1 flex flex-col justify-center">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="bg-blue-500/10 text-blue-500 rounded-full">
                      <BookOpen className="h-5 w-5" strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-semibold">No active Tests</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      There are no active or upcoming mock Tests assigned by your institution at the moment.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {/* Live Tests */}
                  {liveTests.map((test) => (
                    <div
                      key={test.id}
                      className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-4 flex flex-col justify-between gap-4 transition-all hover:bg-emerald-500/[0.04]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-transparent font-medium text-[10px] px-2 py-0.5">
                            Live Now
                          </Badge>
                          {test.time_limit_seconds && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                              {Math.round(test.time_limit_seconds / 60)}m
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1 mt-1">{test.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{test.description || "No description provided."}</p>
                      </div>

                      <Link href={`/tests`} className="w-full mt-2">
                        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                          Start Test
                        </Button>
                      </Link>
                    </div>
                  ))}

                  {/* Upcoming Tests */}
                  {upcomingTests.map((test) => (
                    <div
                      key={test.id}
                      className="border border-border/30 bg-background/30 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all hover:bg-background/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 font-medium text-[10px] px-2 py-0.5">
                            Upcoming
                          </Badge>
                          {test.time_limit_seconds && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                              {Math.round(test.time_limit_seconds / 60)}m
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1 mt-1">{test.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{test.description || "No description provided."}</p>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/20 mt-2">
                        Starts: <span className="font-medium text-foreground">
                          {test.available_from ? new Date(test.available_from).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cell 6: Quick Navigation (md:col-span-2 lg:col-span-1) */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <Card className="bg-card border border-border/40 shadow-sm rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col p-0 gap-0 h-full">
            <CardContent className="p-5 flex flex-col justify-between flex-1 gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Navigation
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2 flex-1 justify-center">
                <Link href="/logiclab" className="group flex items-center justify-between p-2 rounded-xl border border-border/30 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <Laptop className="h-3.5 w-3.5 text-indigo-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Logic Lab</p>
                      <p className="text-[10px] text-muted-foreground">Practice coding challenges</p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
                </Link>

                <Link href="/courses" className="group flex items-center justify-between p-2 rounded-xl border border-border/30 hover:border-sky-500/30 hover:bg-sky-500/[0.02] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                      <BookOpen className="h-3.5 w-3.5 text-sky-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Courses</p>
                      <p className="text-[10px] text-muted-foreground">Learn and upgrade your skills</p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
                </Link>

                <Link href="/tests" className="group flex items-center justify-between p-2 rounded-xl border border-border/30 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Award className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Tests</p>
                      <p className="text-[10px] text-muted-foreground">View and take mock tests</p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  )
}
