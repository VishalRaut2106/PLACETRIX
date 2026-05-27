// "use client"

// // ─────────────────────────────────────────────────────────────────────────────
// // app/~/events/CandidateEventsClient.tsx
// // ─────────────────────────────────────────────────────────────────────────────

// import { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react"
// import Link from "next/link"
// import { useRouter, usePathname } from "next/navigation"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Card } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Input } from "@/components/ui/input"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import {
//   CalendarClock,
//   PlayCircle,
//   CheckCircle2,
//   Calendar,
//   MapPin,
//   Video,
//   User,
//   Search,
//   X,
//   ChevronLeft,
//   ChevronRight,
//   ChevronsLeft,
//   ChevronsRight,
//   Loader2,
//   PartyPopper,
// } from "lucide-react"
// import { cn } from "@/lib/utils"
// import type { CandidateEvent, DerivedEventStatus } from "./_types"
// import { deriveStatus } from "./_types"

// type Tab = "all" | "live" | "upcoming" | "past"

// interface TabConfig {
//   value: Tab
//   label: string
//   icon: React.ReactNode
//   count: number
// }

// export function formatDateTime(dt?: string): string {
//   if (!dt) return "—"
//   return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
// }

// // ─── Status Badge ─────────────────────────────────────────────────────────────
// function StatusBadge({ status }: { status: DerivedEventStatus }) {
//   if (status === "live") {
//     return (
//       <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5 animate-pulse">
//         Live Now
//       </Badge>
//     )
//   }

//   if (status === "upcoming") {
//     return (
//       <Badge className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5">
//         <CalendarClock className="h-3 w-3" />
//         Upcoming
//       </Badge>
//     )
//   }

//   return (
//     <Badge className="gap-1 border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 text-[11px] px-2 py-0.5">
//       <CheckCircle2 className="h-3 w-3" />
//       Ended
//     </Badge>
//   )
// }

// function StatChip({
//   icon,
//   children,
//   tone = "neutral",
// }: {
//   icon: React.ReactNode
//   children: React.ReactNode
//   tone?: "neutral" | "sky" | "emerald" | "amber" | "violet"
// }) {
//   const tones = {
//     neutral: "border-border/60 bg-muted/50 text-muted-foreground",
//     sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
//     emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
//     amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
//     violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
//   } as const

//   return (
//     <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", tones[tone])}>
//       {icon}
//       <span className="truncate max-w-[180px]">{children}</span>
//     </span>
//   )
// }

// function EventActionStatus({ event }: { event: CandidateEvent }) {
//   if (event.derived_status === "past") {
//     return (
//       <span className="text-xs font-medium text-muted-foreground">
//         Event concluded
//       </span>
//     )
//   }

//   if (event.is_registered) {
//     return (
//       <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
//         <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
//         Registered
//       </span>
//     )
//   }

//   if (event.derived_status === "live") {
//     return (
//       <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
//         <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//         Happening now
//       </span>
//     )
//   }

//   return (
//     <span className="text-xs text-muted-foreground">
//       Registration open
//     </span>
//   )
// }

// function EventCard({ event }: { event: CandidateEvent }) {
//   return (
//     <Card className="overflow-hidden border-border/70 bg-card p-0">
//       <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
//         <div className="min-w-0 flex-1">
//           <div className="flex flex-wrap items-center gap-2">
//             <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground">
//               {event.title}
//             </h3>
//             <StatusBadge status={event.derived_status} />
//             <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
//               {event.event_type}
//             </Badge>
//           </div>

//           {event.description && (
//             <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
//               {event.description}
//             </p>
//           )}

//           <div className="mt-3 flex flex-wrap gap-2">
//             {event.speaker && (
//               <StatChip icon={<User className="h-3.5 w-3.5" />} tone="neutral">
//                 {event.speaker}
//               </StatChip>
//             )}

//             <StatChip icon={<Calendar className="h-3.5 w-3.5" />} tone="neutral">
//               {formatDateTime(event.start_time)}
//             </StatChip>

//             {event.venue ? (
//               <StatChip icon={<MapPin className="h-3.5 w-3.5" />} tone="neutral">
//                 {event.venue}
//               </StatChip>
//             ) : (
//               event.meeting_link && (
//                 <StatChip icon={<Video className="h-3.5 w-3.5" />} tone="sky">
//                   Online
//                 </StatChip>
//               )
//             )}
//           </div>
//         </div>

//         <div className="flex flex-col gap-3 border-t border-border/60 pt-3 md:min-w-[220px] md:items-end md:pt-0 md:border-t-0 md:text-right">
//           <div>
//             <EventActionStatus event={event} />
//           </div>

//           <Button asChild variant={event.derived_status === "live" ? "default" : "outline"} size="sm" className="w-full md:w-auto md:self-end">
//             <Link href={`events/${event.id}`}>
//               {event.derived_status === "live" && event.meeting_link ? "Join Event" : "View Details"}
//             </Link>
//           </Button>
//         </div>
//       </div>
//     </Card>
//   )
// }

// function EmptyState({ label }: { label: string }) {
//   const displayLabel = label === "all" ? "" : `${label} `
//   return (
//     <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
//       <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
//         <PartyPopper className="h-5 w-5 text-muted-foreground/60" />
//       </div>
//       <div className="space-y-0.5">
//         <p className="text-sm font-medium">No {displayLabel}events found</p>
//         <p className="text-xs font-medium text-muted-foreground">Check back soon for upcoming schedule posts</p>
//       </div>
//     </div>
//   )
// }

// interface Props {
//   events: CandidateEvent[]
//   serverNow: string
//   initialPage: number
//   initialPageSize: number
//   initialSearch: string
//   initialTab: string
//   totalCount: number
//   tabCounts: { all: number; live: number; upcoming: number; past: number }
// }

// export function CandidateEventsClient({
//   events,
//   serverNow,
//   initialPage,
//   initialPageSize,
//   initialSearch,
//   initialTab,
//   totalCount,
//   tabCounts,
// }: Props) {
//   const router = useRouter()
//   const pathname = usePathname()
//   const [isPending, startTransition] = useTransition()
//   const [searchInput, setSearchInput] = useState(initialSearch)
//   const isOwnUpdateRef = useRef(false)

//   useEffect(() => {
//     if (isOwnUpdateRef.current) {
//       isOwnUpdateRef.current = false
//       return
//     }
//     setSearchInput(initialSearch)
//   }, [initialSearch])

//   const updateParams = useCallback((newParams: Partial<Record<string, string | number>>) => {
//     const params = new URLSearchParams(window.location.search)
//     Object.entries(newParams).forEach(([key, val]) => {
//       if (val === undefined || val === "" || val === null) {
//         params.delete(key)
//       } else {
//         params.set(key, String(val))
//       }
//     })
//     startTransition(() => {
//       router.push(`${pathname}?${params.toString()}`)
//     })
//   }, [pathname, router])

//   useEffect(() => {
//     if (searchInput === initialSearch) return
//     const timer = setTimeout(() => {
//       isOwnUpdateRef.current = true
//       updateParams({ search: searchInput, page: 1 })
//     }, 400)
//     return () => clearTimeout(timer)
//   }, [searchInput, initialSearch, updateParams])

//   const activeTab = (initialTab || "all") as Tab

//   const serverTimeOffset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow])
//   const getNowOnServer = useCallback(() => new Date(Date.now() + serverTimeOffset), [serverTimeOffset])
//   const [now, setNow] = useState(getNowOnServer)

//   useEffect(() => {
//     const id = setInterval(() => setNow(getNowOnServer()), 10000)
//     return () => clearInterval(id)
//   }, [getNowOnServer])

//   const enrichedEvents = useMemo(() => {
//     return events.map((e) => ({
//       ...e,
//       current_derived_status: deriveStatus(e.start_time, e.end_time, now),
//     }))
//   }, [events, now])

//   const tabConfig: TabConfig[] = [
//     { value: "all", label: "All", icon: <PartyPopper className="h-3.5 w-3.5" />, count: tabCounts.all },
//     { value: "live", label: "Live", icon: <PlayCircle className="h-3.5 w-3.5" />, count: tabCounts.live },
//     { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="h-3.5 w-3.5" />, count: tabCounts.upcoming },
//     { value: "past", label: "Past", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: tabCounts.past },
//   ]

//   const totalPages = Math.ceil(totalCount / initialPageSize)
//   const activePage = Math.min(initialPage, Math.max(1, totalPages))

//   return (
//     <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
//       {/* Page Header */}
//       <div className="flex flex-col gap-1.5">
//         <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
//         <p className="text-sm text-muted-foreground">
//           {totalCount} event{totalCount !== 1 ? "s" : ""} scheduled for your track
//         </p>
//       </div>

//       <Tabs value={activeTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })}>
//         <div className="space-y-4">
//           {/* Action Row */}
//           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
//             <div className="relative w-full sm:max-w-xs">
//               {isPending ? (
//                 <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />
//               ) : (
//                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//               )}
//               <Input
//                 placeholder="Search events or speakers..."
//                 value={searchInput}
//                 onChange={(e) => setSearchInput(e.target.value)}
//                 className="pl-9 pr-9"
//               />
//               {searchInput && (
//                 <button
//                   onClick={() => {
//                     isOwnUpdateRef.current = true
//                     setSearchInput("")
//                     updateParams({ search: "", page: 1 })
//                   }}
//                   className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
//                 >
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               )}
//             </div>

//             <div className="overflow-x-auto shrink-0">
//               <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
//                 {tabConfig.map(({ value, label, count }) => (
//                   <TabsTrigger
//                     key={value}
//                     value={value}
//                     className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
//                   >
//                     {label}
//                     {count > 0 && (
//                       <span className={cn(
//                         "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
//                         activeTab === value ? "bg-foreground text-background" : "bg-muted-foreground/20 text-muted-foreground"
//                       )}>
//                         {count}
//                       </span>
//                     )}
//                   </TabsTrigger>
//                 ))}
//               </TabsList>
//             </div>
//           </div>

//           <div className="relative">
//             {isPending && (
//               <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] rounded-lg">
//                 <div className="sticky top-[40vh] mx-auto flex w-fit flex-col items-center gap-2 rounded-lg border bg-popover px-4 py-3 shadow-md">
//                   <Loader2 className="h-6 w-6 text-primary animate-spin" />
//                   <span className="text-xs font-medium text-muted-foreground animate-pulse">Loading...</span>
//                 </div>
//               </div>
//             )}

//             <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
//               {tabConfig.map(({ value, label }) => {
//                 if (value !== activeTab) return <TabsContent key={value} value={value} className="mt-0 outline-none" />
//                 return (
//                   <TabsContent key={value} value={value} className="mt-0 outline-none space-y-4">
//                     {totalCount === 0 ? (
//                       <EmptyState label={label.toLowerCase()} />
//                     ) : (
//                       <>
//                         <div className="flex flex-col gap-3 w-full">
//                           {enrichedEvents.map((e) => (
//                             <EventCard key={e.id} event={{ ...e, derived_status: e.current_derived_status }} />
//                           ))}
//                         </div>

//                         {/* Pagination Footer */}
//                         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1 px-1">
//                           <div className="text-xs text-muted-foreground">
//                             Showing <span className="font-medium">{totalCount === 0 ? 0 : Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}</span> to{" "}
//                             <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span> of <span className="font-medium">{totalCount}</span> events
//                           </div>

//                           <div className="flex flex-wrap items-center gap-4 sm:gap-6">
//                             <div className="flex items-center gap-2">
//                               <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
//                               <Select value={initialPageSize.toString()} onValueChange={(val) => updateParams({ size: val, page: 1 })}>
//                                 <SelectTrigger className="h-8 w-[70px] text-xs">
//                                   <SelectValue placeholder={initialPageSize.toString()} />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   {[5, 10, 20, 50].map((s) => (
//                                     <SelectItem key={s} value={s.toString()} className="text-xs">{s}</SelectItem>
//                                   ))}
//                                 </SelectContent>
//                               </Select>
//                             </div>

//                             <div className="flex items-center gap-1">
//                               <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
//                                 <ChevronsLeft className="h-4 w-4" />
//                               </Button>
//                               <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
//                                 <ChevronLeft className="h-4 w-4" />
//                               </Button>
//                               <div className="flex items-center justify-center text-xs font-medium min-w-[80px]">
//                                 Page {activePage} of {totalPages}
//                               </div>
//                               <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })} disabled={activePage === totalPages || totalPages === 0}>
//                                 <ChevronRight className="h-4 w-4" />
//                               </Button>
//                               <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateParams({ page: totalPages })} disabled={activePage === totalPages || totalPages === 0}>
//                                 <ChevronsRight className="h-4 w-4" />
//                               </Button>
//                             </div>
//                           </div>
//                         </div>
//                       </>
//                     )}
//                   </TabsContent>
//                 )
//               })}
//             </div>
//           </div>
//         </div>
//       </Tabs>
//     </div>
//   )
// }