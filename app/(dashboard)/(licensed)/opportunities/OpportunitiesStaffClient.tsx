// app/(dashboard)/(licensed)/opportunities/OpportunitiesStaffClient.tsx
"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Briefcase, Plus, Search, MapPin, DollarSign, Calendar, Users, 
  Trash2, Edit3, X, ChevronRight, Download, FileText, CheckCircle2, Building2,
  Clock, CalendarClock, LayoutList, PlayCircle, PenLine
} from "lucide-react"
import { toast } from "sonner"
import { 
  createOpportunityAction, 
  updateOpportunityAction, 
  deleteOpportunityAction, 
  updateApplicationStatusAction 
} from "./actions"
import type { 
  OpportunityListItem, 
  OpportunityApplication, 
  OpportunityFormData, 
  OpportunityStatus, 
  OpportunityType,
  ApplicationStatus,
  CompanyProfile,
  CompensationType
} from "./types"

interface OpportunitiesStaffClientProps {
  opportunities: OpportunityListItem[]
  applications: Record<string, OpportunityApplication[]>
  companies: CompanyProfile[]
}

const COMPENSATION_TYPES: { value: CompensationType; label: string }[] = [
  { value: "full_time", label: "Full-Time Job" },
  { value: "internship", label: "Internship" },
  { value: "stipend_with_ppo", label: "Internship with PPO" },
  { value: "freelance", label: "Freelance" }
]

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: "on_campus", label: "On-Campus Drive" },
  { value: "off_campus", label: "Off-Campus Drive" },
  { value: "internship", label: "Internship" },
  { value: "ppo", label: "Pre-Placement Offer (PPO)" },
  { value: "freelance", label: "Freelance Opportunity" }
]

const APPLICATION_STAGES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: "Applied", label: "Applied", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
  { value: "Shortlisted", label: "Shortlisted", color: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" },
  { value: "Interviewing", label: "Interviewing", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { value: "Offered", label: "Offered (Placed)", color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" },
  { value: "Rejected", label: "Rejected", color: "bg-red-500/10 text-red-500 hover:bg-red-500/20" }
]

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OpportunityStatus }) {
  switch (status) {
    case "Published":
      return (
        <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
          Published
        </Badge>
      )
    case "Draft":
      return (
        <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5">
          Draft
        </Badge>
      )
    case "Concluded":
      return (
        <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5">
          Concluded
        </Badge>
      )
  }
}

// ─── Stat Chip ───────────────────────────────────────────────────────────────
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

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({
  opp,
  onEdit,
  onDelete,
  onSelect
}: {
  opp: OpportunityListItem
  onEdit: (opp: OpportunityListItem, e: React.MouseEvent) => void
  onDelete: (oppId: string, e: React.MouseEvent) => void
  onSelect: (opp: OpportunityListItem) => void
}) {
  const deadlineDate = new Date(opp.deadline)
  const isExpired = deadlineDate < new Date()
  const companyName = opp.company?.name || "Unknown Company"

  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-primary/20" onClick={() => onSelect(opp)}>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground">
              {opp.title}
            </h3>
            <StatusBadge status={opp.status} />
          </div>

          <p className={cn(
            "mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground",
            opp.job_role ? "" : "italic text-muted-foreground/60"
          )}>
            {companyName} • {opp.job_role}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip icon={<MapPin className="h-3.5 w-3.5" />} tone="neutral">
              {opp.location || "Remote"}
            </StatChip>
            
            <StatChip icon={<DollarSign className="h-3.5 w-3.5" />} tone="sky">
              {opp.compensation_type === "full_time" && opp.ctc_lpa ? `${opp.ctc_lpa} LPA` : ""}
              {opp.compensation_type === "internship" && opp.stipend_monthly ? `₹${opp.stipend_monthly.toLocaleString()}/mo` : ""}
              {opp.compensation_type === "stipend_with_ppo" && `₹${opp.stipend_monthly?.toLocaleString()}/mo + PPO`}
              {opp.compensation_type === "freelance" && (opp.ctc_lpa ? `${opp.ctc_lpa} LPA` : "Freelance")}
              {!opp.ctc_lpa && !opp.stipend_monthly && "Unpaid"}
            </StatChip>

            <StatChip icon={<Building2 className="h-3.5 w-3.5" />} tone="amber">
              CGPA Cutoff: {opp.min_cgpa > 0 ? `>= ${opp.min_cgpa}` : "None"}
            </StatChip>

            <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone={isExpired ? "rose" : "neutral"}>
              {isExpired ? "Expired" : `Deadline: ${deadlineDate.toLocaleDateString("en-IN", { dateStyle: "short" })}`}
            </StatChip>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 md:flex-col md:items-end md:justify-center shrink-0">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 text-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            {opp.applications_count || 0} applicants
          </span>

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => onEdit(opp, e)}
              className="h-8 w-8 hover:bg-muted"
            >
              <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => onDelete(opp.id, e)}
              className="h-8 w-8 hover:bg-red-500/10 group"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function OpportunitiesStaffClient({
  opportunities,
  applications,
  companies
}: OpportunitiesStaffClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingOpp, setEditingOpp] = useState<OpportunityListItem | null>(null)
  const [selectedOpp, setSelectedOpp] = useState<OpportunityListItem | null>(null) // For viewing applicants

  // Form state
  const [formData, setFormData] = useState<OpportunityFormData>({
    company_id: "",
    new_company_name: "",
    new_company_logo_url: "",
    new_company_website: "",
    new_company_description: "",
    title: "",
    job_role: "",
    job_description: "",
    location: "",
    compensation_type: "full_time",
    ctc_lpa: null,
    stipend_monthly: null,
    bond_details: "",
    application_link: "",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: "Draft",
    min_cgpa: 0
  })

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingOpp(null)
    setFormData({
      company_id: companies.length > 0 ? companies[0].id : "new",
      new_company_name: "",
      new_company_logo_url: "",
      new_company_website: "",
      new_company_description: "",
      title: "",
      job_role: "",
      job_description: "",
      location: "",
      compensation_type: "full_time",
      ctc_lpa: null,
      stipend_monthly: null,
      bond_details: "",
      application_link: "",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      status: "Draft",
      min_cgpa: 0
    })
    setIsCreateOpen(true)
  }

  // Open Form for Edit
  const handleOpenEdit = (opp: OpportunityListItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingOpp(opp)
    setFormData({
      company_id: opp.company_id,
      new_company_name: "",
      new_company_logo_url: "",
      new_company_website: "",
      new_company_description: "",
      title: opp.title,
      job_role: opp.job_role,
      job_description: opp.job_description || "",
      location: opp.location || "",
      compensation_type: opp.compensation_type,
      ctc_lpa: opp.ctc_lpa,
      stipend_monthly: opp.stipend_monthly,
      bond_details: opp.bond_details || "",
      application_link: opp.application_link || "",
      deadline: new Date(opp.deadline).toISOString().slice(0, 16),
      status: opp.status,
      min_cgpa: opp.min_cgpa || 0
    })
    setIsCreateOpen(true)
  }

  // Form Submit Action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.company_id === "new" && !formData.new_company_name) {
      toast.error("Please provide a company name.")
      return
    }
    if (!formData.title || !formData.job_role || !formData.deadline) {
      toast.error("Please fill in all required fields.")
      return
    }

    startTransition(async () => {
      try {
        if (editingOpp) {
          const res = await updateOpportunityAction(editingOpp.id, formData)
          if (res.success) {
            toast.success("Opportunity updated successfully!")
            setIsCreateOpen(false)
            router.refresh()
          }
        } else {
          const res = await createOpportunityAction(formData)
          if (res.success) {
            toast.success("Opportunity created successfully!")
            setIsCreateOpen(false)
            router.refresh()
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save opportunity")
      }
    })
  }

  // Delete Action
  const handleDelete = async (oppId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this opportunity? This will delete all applications too.")) return

    startTransition(async () => {
      try {
        const res = await deleteOpportunityAction(oppId)
        if (res.success) {
          toast.success("Opportunity deleted successfully.")
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete opportunity")
      }
    })
  }

  // Stage Change Action
  const handleStageChange = async (appId: string, oppId: string, newStatus: ApplicationStatus) => {
    startTransition(async () => {
      try {
        const res = await updateApplicationStatusAction(appId, newStatus)
        if (res.success) {
          toast.success(`Candidate status updated to ${newStatus}`)
          router.refresh()
          if (selectedOpp && selectedOpp.id === oppId) {
            setSelectedOpp({ ...selectedOpp })
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update candidate status")
      }
    })
  }

  // Filter & Search Logic
  const filteredOpps = useMemo(() => {
    return opportunities.filter((opp: OpportunityListItem) => {
      const companyName = opp.company?.name || ""
      const matchSearch = 
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.job_role.toLowerCase().includes(searchQuery.toLowerCase())

      return matchSearch
    })
  }, [opportunities, searchQuery])

  const publishedCount = useMemo(() => {
    return opportunities.filter((o: OpportunityListItem) => o.status === "Published").length
  }, [opportunities])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Opportunities & Drives</h1>
          <p className="text-sm text-muted-foreground">
            {opportunities.length} drive{opportunities.length !== 1 ? "s" : ""} total
            {publishedCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {publishedCount} published
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Post Opportunity
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search opportunities..."
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

      {/* Listings Display */}
      {filteredOpps.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-lg">No opportunities found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            No matching opportunities were found. Try adjusting your search query or post a new one.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {filteredOpps.map((opp: OpportunityListItem) => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onSelect={setSelectedOpp}
            />
          ))}
        </div>
      )}

      {/* Sheet: Create / Edit Opportunity Form */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
          <SheetHeader className="pb-6">
            <SheetTitle>{editingOpp ? "Edit Opportunity" : "Create Opportunity"}</SheetTitle>
            <SheetDescription>
              Enter the job specifications and configure eligibility parameters for students.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              
              {/* Company Profile Selection */}
              <div className="space-y-2 border-b pb-4">
                <Label htmlFor="company_id">Company Profile *</Label>
                <Select 
                  value={formData.company_id} 
                  onValueChange={v => setFormData({ ...formData, company_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Company Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Company Profile...</SelectItem>
                  </SelectContent>
                </Select>

                {formData.company_id === "new" && (
                  <div className="border border-dashed p-4 rounded-lg space-y-3 bg-muted/10 mt-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-semibold text-muted-foreground">New Company Profile Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="new_company_name" className="text-xs">Company Name *</Label>
                        <Input 
                          id="new_company_name" 
                          value={formData.new_company_name || ""} 
                          onChange={e => setFormData({ ...formData, new_company_name: e.target.value })} 
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new_company_website" className="text-xs">Website URL</Label>
                        <Input 
                          id="new_company_website" 
                          placeholder="https://..."
                          value={formData.new_company_website || ""} 
                          onChange={e => setFormData({ ...formData, new_company_website: e.target.value })} 
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new_company_logo" className="text-xs">Logo Image URL</Label>
                      <Input 
                        id="new_company_logo" 
                        placeholder="https://..."
                        value={formData.new_company_logo_url || ""} 
                        onChange={e => setFormData({ ...formData, new_company_logo_url: e.target.value })} 
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new_company_desc" className="text-xs">Brief Description</Label>
                      <Textarea 
                        id="new_company_desc" 
                        rows={2}
                        value={formData.new_company_description || ""} 
                        onChange={e => setFormData({ ...formData, new_company_description: e.target.value })} 
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Opportunity Job Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="title">Opportunity Title (Visible to Students) *</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    placeholder="e.g., Google Step Internship 2026"
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_role">Job Role / Position *</Label>
                  <Input 
                    id="job_role" 
                    placeholder="e.g. Software Engineer"
                    value={formData.job_role} 
                    onChange={e => setFormData({ ...formData, job_role: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Job Location</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g., Bangalore, Hybrid"
                    value={formData.location || ""} 
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Status and Deadlines */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Application Deadline *</Label>
                  <Input 
                    id="deadline" 
                    type="datetime-local" 
                    value={formData.deadline} 
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Publish Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={v => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Concluded">Concluded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Compensation details */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
                <h4 className="font-semibold text-sm">Compensation & Terms</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="compensation_type">Type *</Label>
                    <Select 
                      value={formData.compensation_type} 
                      onValueChange={v => setFormData({ ...formData, compensation_type: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPENSATION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Conditionally show stipend / CTC */}
                  {(formData.compensation_type === "full_time" || formData.compensation_type === "stipend_with_ppo" || formData.compensation_type === "freelance") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ctc_lpa">CTC Package (LPA)</Label>
                      <Input 
                        id="ctc_lpa" 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g., 14.5"
                        value={formData.ctc_lpa ?? ""} 
                        onChange={e => setFormData({ ...formData, ctc_lpa: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  )}

                  {(formData.compensation_type === "internship" || formData.compensation_type === "stipend_with_ppo") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="stipend_monthly">Monthly Stipend (₹)</Label>
                      <Input 
                        id="stipend_monthly" 
                        type="number" 
                        placeholder="e.g., 35000"
                        value={formData.stipend_monthly ?? ""} 
                        onChange={e => setFormData({ ...formData, stipend_monthly: e.target.value ? parseInt(e.target.value) : null })}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bond_details">Service Agreement / Bond (e.g. 2 Years, None)</Label>
                  <Input 
                    id="bond_details" 
                    placeholder="e.g., 18 months agreement, or None"
                    value={formData.bond_details || ""} 
                    onChange={e => setFormData({ ...formData, bond_details: e.target.value })}
                  />
                </div>
              </div>

              {/* Targeting & Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min_cgpa">Minimum CGPA Target</Label>
                  <Input 
                    id="min_cgpa" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="10"
                    placeholder="e.g. 8.0 (0 for no limit)"
                    value={formData.min_cgpa || ""} 
                    onChange={e => setFormData({ ...formData, min_cgpa: e.target.value ? parseFloat(e.target.value) : 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="application_link">External Apply URL (Optional)</Label>
                  <Input 
                    id="application_link" 
                    placeholder="e.g. Google Form or company portal"
                    value={formData.application_link || ""} 
                    onChange={e => setFormData({ ...formData, application_link: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job_description">Job Description & Details</Label>
                <Textarea 
                  id="job_description" 
                  rows={4}
                  placeholder="Enter details about responsibilities, qualifications, Interview rounds, CTC structure, etc."
                  value={formData.job_description || ""} 
                  onChange={e => setFormData({ ...formData, job_description: e.target.value })}
                />
              </div>

            </div>

            <DialogFooter className="pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : editingOpp ? "Save Changes" : "Post Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Applications / Candidate list */}
      <Dialog open={!!selectedOpp} onOpenChange={(open) => !open && setSelectedOpp(null)}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[85vh] flex flex-col p-6">
          {selectedOpp && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <DialogTitle className="text-xl">{selectedOpp.title} Candidates</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedOpp.company?.name || "Unknown Company"} • {selectedOpp.job_role}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className="uppercase">{selectedOpp.status}</Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4">
                {!applications[selectedOpp.id] || applications[selectedOpp.id].length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="h-10 w-10 text-muted-foreground/35 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Once candidates apply, their resumes and academic scores will show up here.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y text-left text-xs">
                      <thead className="bg-muted/40 font-semibold text-muted-foreground uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Candidate</th>
                          <th className="p-3">Course / Year</th>
                          <th className="p-3 text-center">CGPA</th>
                          <th className="p-3 text-center">Resume</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {applications[selectedOpp.id].map((app) => (
                          <tr key={app.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-sm">{app.candidate_name}</div>
                              <div className="text-muted-foreground text-[10px]">{app.candidate_email}</div>
                              {app.candidate_phone && (
                                <div className="text-muted-foreground text-[10px]">{app.candidate_phone}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-muted-foreground">{app.candidate_course || "N/A"}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Year: {app.candidate_passout_year || "N/A"}</div>
                            </td>
                            <td className="p-3 text-center font-bold text-sm">
                              {app.candidate_cgpa != null ? app.candidate_cgpa.toFixed(2) : "—"}
                            </td>
                            <td className="p-3 text-center">
                              <a 
                                href={app.resume_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                              >
                                <Download className="h-3 w-3" /> PDF
                              </a>
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                app.status === "Applied" && "bg-blue-500/10 text-blue-600",
                                app.status === "Shortlisted" && "bg-yellow-500/10 text-yellow-600",
                                app.status === "Interviewing" && "bg-purple-500/10 text-purple-600",
                                app.status === "Offered" && "bg-emerald-500/10 text-emerald-600",
                                app.status === "Rejected" && "bg-red-500/10 text-red-600"
                              )}>
                                {app.status === "Offered" ? "Offered (Placed)" : app.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Select 
                                value={app.status}
                                onValueChange={(val) => handleStageChange(app.id, selectedOpp.id, val as any)}
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[120px] h-7 text-[10px]">
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
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
