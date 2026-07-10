// app/(dashboard)/(licensed)/opportunities/[opportunityId]/InstituteOpportunityDetailClient.tsx
"use client"

import { useState, useTransition, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Briefcase, MapPin, IndianRupee, Calendar, Users, 
  Trash2, Edit3, Download, Building2, Search, X,
  Clock, ArrowLeft, CheckCircle2, Info, MoreHorizontal, Loader2
} from "lucide-react"
import { toast } from "sonner"
import { deleteOpportunityAction, updateApplicationStatusAction } from "../actions"
import type { OpportunityListItem, OpportunityApplication, ApplicationStatus } from "../types"

interface InstituteOpportunityDetailClientProps {
  opportunity: OpportunityListItem
  applications: OpportunityApplication[]
}

const APPLICATION_STAGES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: "Applied", label: "Applied", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
  { value: "Shortlisted", label: "Shortlisted", color: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" },
  { value: "Interviewing", label: "Interviewing", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { value: "Offered", label: "Offered (Placed)", color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" },
  { value: "Rejected", label: "Rejected", color: "bg-red-500/10 text-red-500 hover:bg-red-500/20" }
]

function PageHeader({ opp, companyName }: { opp: OpportunityListItem; companyName: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
          {opp.compensation_type.replace("_", " ")}
        </Badge>
        <Badge className={cn(
          opp.status === "Published" && "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
          opp.status !== "Published" && "border-border bg-muted text-muted-foreground",
          "text-[10px] uppercase border"
        )}>
          {opp.status}
        </Badge>
      </div>
      <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground mt-1">
        {opp.title}
      </h1>
      <p className="text-sm text-muted-foreground">
        Published by {companyName} • {opp.job_role}
      </p>
    </div>
  )
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function InstituteOpportunityDetailClient({
  opportunity,
  applications
}: InstituteOpportunityDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("overview")

  // Search & Filter state for Applicants
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const deadlineDate = new Date(opportunity.deadline)
  const isExpired = deadlineDate < new Date()
  const companyName = opportunity.company?.name || "Unknown Company"

  // Helper to format compensation string
  function formatCompensation() {
    if (opportunity.compensation_type === "full_time" && opportunity.ctc_lpa) return `${opportunity.ctc_lpa} LPA`
    if (opportunity.compensation_type === "internship" && opportunity.stipend_monthly) return `₹${opportunity.stipend_monthly.toLocaleString()}/mo`
    if (opportunity.compensation_type === "stipend_with_ppo" && opportunity.stipend_monthly) return `₹${opportunity.stipend_monthly.toLocaleString()}/mo + PPO`
    if (opportunity.compensation_type === "freelance" && opportunity.ctc_lpa) return `${opportunity.ctc_lpa} LPA`
    return "Unpaid"
  }

  // Delete Action
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this opportunity? This will delete all applications too.")) return

    startTransition(async () => {
      try {
        const res = await deleteOpportunityAction(opportunity.id)
        if (res.success) {
          toast.success("Opportunity deleted successfully.")
          router.push("/opportunities")
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete opportunity")
      }
    })
  }

  // Stage Change Action
  const handleStageChange = async (appId: string, newStatus: ApplicationStatus) => {
    startTransition(async () => {
      try {
        const res = await updateApplicationStatusAction(appId, newStatus)
        if (res.success) {
          toast.success(`Candidate status updated to ${newStatus}`)
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update candidate status")
      }
    })
  }

  // Filter applicants list dynamically
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchSearch = 
        (app.candidate_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.candidate_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.candidate_course && app.candidate_course.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchStatus = statusFilter === "all" || app.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [applications, searchQuery, statusFilter])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      {/* Back Button & Actions Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 self-start">
          <Link href="/opportunities">
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 self-end h-9"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push(`/opportunities/${opportunity.id}/edit`)}
              disabled={isPending}
            >
              <Edit3 className="mr-2 h-3.5 w-3.5" />
              Edit Opportunity
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Posting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Page Header */}
      <PageHeader opp={opportunity} companyName={companyName} />

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
            {[
              { value: "overview", label: "Overview", icon: <Info className="h-3.5 w-3.5" />, count: null },
              { value: "applicants", label: "Applicants", icon: <Users className="h-3.5 w-3.5" />, count: applications.length }
            ].map(({ value, label, icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {icon}
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                      activeTab === value
                        ? "bg-foreground text-background"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="m-0 space-y-6">
          {/* Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <MetaItem 
              icon={<MapPin className="h-4 w-4" />} 
              label="Location" 
              value={opportunity.location || "Remote"} 
            />
            <MetaItem 
              icon={<IndianRupee className="h-4 w-4" />} 
              label="Package Details" 
              value={formatCompensation()} 
            />
            <MetaItem 
              icon={<Building2 className="h-4 w-4" />} 
              label="CGPA Cutoff" 
              value={opportunity.min_cgpa > 0 ? `>= ${opportunity.min_cgpa}` : "None"} 
            />
            <MetaItem 
              icon={<Calendar className="h-4 w-4" />} 
              label="Apply Before" 
              value={new Date(opportunity.deadline).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short"
              })} 
            />
          </div>

          {/* Job Description details */}
          <Card className="rounded-xl overflow-hidden border">
            <CardContent className="p-5 space-y-3">
              <h4 className="font-semibold text-sm">Job Description & Details</h4>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed min-h-[80px]">
                {opportunity.job_description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Company details (if present) */}
          {opportunity.company && (
            <Card className="rounded-xl overflow-hidden border">
              <CardContent className="p-5 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> About {opportunity.company.name}
                </h4>
                {opportunity.company.website && (
                  <a 
                    href={opportunity.company.website} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-primary hover:underline font-medium block mt-1"
                  >
                    Visit Company Website
                  </a>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  {opportunity.company.description || "No company description provided."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Applicants */}
        <TabsContent value="applicants" className="m-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applicants by name, email, course..."
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

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {APPLICATION_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredApplications.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Users className="h-12 w-12 text-muted-foreground/35 mx-auto mb-4" />
              <h4 className="font-semibold text-lg">No applicants found</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {applications.length === 0 
                  ? "Once candidates apply, their details will appear here." 
                  : "No applicants match the current search filters."}
              </p>
            </Card>
          ) : (
            <div className="border rounded-lg bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y text-left text-xs">
                  <thead className="bg-muted/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Candidate</th>
                      <th className="p-4">Course / Year</th>
                      <th className="p-4 text-center">CGPA</th>
                      <th className="p-4 text-center">Resume</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-card">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-sm text-foreground">{app.candidate_name || "Unknown"}</div>
                          <div className="text-muted-foreground text-[10px] mt-0.5">{app.candidate_email || "N/A"}</div>
                          {app.candidate_phone && (
                            <div className="text-muted-foreground text-[10px]">{app.candidate_phone}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground">{app.candidate_course || "N/A"}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Year: {app.candidate_passout_year || "N/A"}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-sm text-foreground">
                          {app.candidate_cgpa != null ? app.candidate_cgpa.toFixed(2) : "—"}
                        </td>
                        <td className="p-4 text-center">
                          <a 
                            href={app.resume_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </a>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase border",
                            app.status === "Applied" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
                            app.status === "Shortlisted" && "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20",
                            app.status === "Interviewing" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",
                            app.status === "Offered" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                            app.status === "Rejected" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20"
                          )}>
                            {app.status === "Offered" ? "Offered (Placed)" : app.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Select 
                            value={app.status}
                            onValueChange={(val) => handleStageChange(app.id, val as any)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-[125px] h-8 text-[11px] ml-auto">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {APPLICATION_STAGES.map(stage => (
                                <SelectItem key={stage.value} value={stage.value} className="text-xs">
                                  {stage.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
