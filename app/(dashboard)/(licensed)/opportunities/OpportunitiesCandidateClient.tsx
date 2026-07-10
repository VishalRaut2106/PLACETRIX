// app/(dashboard)/(licensed)/opportunities/OpportunitiesCandidateClient.tsx
"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  Briefcase, Search, MapPin, DollarSign, Calendar, CheckCircle2, 
  XCircle, FileText, ChevronRight, Upload, Info, Loader2, Building2,
  Clock, LayoutList, X
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import { applyToOpportunityAction } from "./actions"
import type { CandidateOpportunityListItem } from "./types"

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
  isEligible,
  onSelect
}: {
  opp: CandidateOpportunityListItem
  isEligible: boolean
  onSelect: (opp: CandidateOpportunityListItem) => void
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
            {opp.my_application_id ? (
              <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
                Applied
              </Badge>
            ) : isEligible ? (
              <Badge className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5">
                Eligible
              </Badge>
            ) : (
              <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5">
                Not Eligible
              </Badge>
            )}
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
              CGPA: {opp.min_cgpa > 0 ? `>= ${opp.min_cgpa}` : "None"}
            </StatChip>

            <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone={isExpired ? "rose" : "neutral"}>
              {isExpired ? "Expired" : `Deadline: ${deadlineDate.toLocaleDateString("en-IN", { dateStyle: "short" })}`}
            </StatChip>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 md:flex-col md:items-end md:justify-center shrink-0">
          {opp.my_application_id ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {opp.my_application_status === "Offered" ? "Offered (Placed)" : opp.my_application_status}
            </span>
          ) : (
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={(e) => { e.stopPropagation(); onSelect(opp); }}>
              View Details <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

interface OpportunitiesCandidateClientProps {
  opportunities: CandidateOpportunityListItem[]
  candidateAcademic: {
    cgpa: number | null
  }
  profileId: string
}

export function OpportunitiesCandidateClient({
  opportunities,
  candidateAcademic,
  profileId
}: OpportunitiesCandidateClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [supabase] = useState(() => createClient())

  // Filters state
  const [searchQuery, setSearchQuery] = useState("")

  // Drawer / Application dialog states
  const [selectedOpp, setSelectedOpp] = useState<CandidateOpportunityListItem | null>(null)
  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const totalCount = opportunities.length
    
    // Check eligibility logic (only CGPA checks)
    const eligibleCount = opportunities.filter(opp => {
      return !opp.min_cgpa || (candidateAcademic.cgpa != null && candidateAcademic.cgpa >= opp.min_cgpa)
    }).length

    const appliedCount = opportunities.filter(opp => opp.my_application_id !== null).length

    return { totalCount, eligibleCount, appliedCount }
  }, [opportunities, candidateAcademic])

  // Get specific eligibility detailed check for an opportunity
  const checkEligibility = (opp: CandidateOpportunityListItem) => {
    const cgpaOk = !opp.min_cgpa || (candidateAcademic.cgpa != null && candidateAcademic.cgpa >= opp.min_cgpa)
    
    return {
      cgpa: { 
        ok: !!cgpaOk, 
        label: `CGPA requirement: ${opp.min_cgpa > 0 ? `${opp.min_cgpa} or above` : "None"} (Your CGPA: ${candidateAcademic.cgpa != null ? candidateAcademic.cgpa.toFixed(2) : "N/A"})` 
      },
      isEligible: !!cgpaOk
    }
  }

  // Handle Apply Submission (File Upload + database insertion)
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpp) return
    if (!selectedFile) {
      toast.error("Please upload a resume file.")
      return
    }

    setUploading(true)
    try {
      // 1. Upload PDF file to Supabase Storage resumes bucket
      const fileExt = selectedFile.name.split(".").pop()
      const fileName = `${Date.now()}_resume.${fileExt}`
      const filePath = `${profileId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true
        })

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload resume file.")
      }

      // 2. Build final resume URL
      const finalResumeUrl = buildStorageUrl("resumes", filePath)
      if (!finalResumeUrl) {
        throw new Error("Failed to resolve uploaded resume URL.")
      }

      // 3. Submit database application record via server action
      startTransition(async () => {
        try {
          const res = await applyToOpportunityAction(selectedOpp.id, finalResumeUrl)
          if (res.success) {
            toast.success("Applied successfully!")
            setIsApplyOpen(false)
            setSelectedOpp(null)
            setSelectedFile(null)
            router.refresh()
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to submit application.")
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload resume.")
    } finally {
      setUploading(false)
    }
  }

  // Search filter and tab logic
  const filteredOpps = useMemo(() => {
    return opportunities.filter(opp => {
      const companyName = opp.company?.name || ""
      const matchSearch = 
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.job_role.toLowerCase().includes(searchQuery.toLowerCase())

      return matchSearch
    })
  }, [opportunities, searchQuery])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          {opportunities.length} open drive{opportunities.length !== 1 ? "s" : ""} total
          {stats.eligibleCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats.eligibleCount} eligible for you
            </span>
          )}
        </p>
      </div>

      {/* Search Filter Only */}
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
            There are no job postings matching your selection at the moment. Try adjusting your search.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {filteredOpps.map((opp) => {
            const elg = checkEligibility(opp)
            return (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                isEligible={elg.isEligible}
                onSelect={setSelectedOpp}
              />
            )
          })}
        </div>
      )}

      {/* Sheet: Job Details Drawer */}
      <Sheet open={!!selectedOpp} onOpenChange={(open) => !open && setSelectedOpp(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
          {selectedOpp && (() => {
            const elg = checkEligibility(selectedOpp)
            const isExpired = new Date(selectedOpp.deadline) < new Date()
            const companyName = selectedOpp.company?.name || "Unknown Company"

            return (
              <div className="h-full flex flex-col justify-between">
                <div className="space-y-6 pb-8">
                  <SheetHeader className="pb-4 border-b">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {selectedOpp.compensation_type.replace("_", " ")}
                      </Badge>
                      {selectedOpp.my_application_id && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] border-none uppercase">
                          Applied
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-xl font-bold">{selectedOpp.title}</SheetTitle>
                    <SheetDescription className="text-sm font-medium text-muted-foreground">
                      {companyName} • {selectedOpp.job_role}
                    </SheetDescription>
                  </SheetHeader>

                  {/* Core Details grid */}
                  <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/10 text-xs">
                    <div>
                      <p className="text-muted-foreground font-medium uppercase text-[9px] tracking-wider mb-0.5">Location</p>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" /> {selectedOpp.location || "Remote"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium uppercase text-[9px] tracking-wider mb-0.5">Package Details</p>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-primary" />
                        {selectedOpp.compensation_type === "full_time" && selectedOpp.ctc_lpa ? `${selectedOpp.ctc_lpa} LPA` : ""}
                        {selectedOpp.compensation_type === "internship" && selectedOpp.stipend_monthly ? `₹${selectedOpp.stipend_monthly.toLocaleString()}/mo` : ""}
                        {selectedOpp.compensation_type === "stipend_with_ppo" && `₹${selectedOpp.stipend_monthly?.toLocaleString()}/mo + PPO`}
                        {selectedOpp.compensation_type === "freelance" && (selectedOpp.ctc_lpa ? `${selectedOpp.ctc_lpa} LPA` : "Project Rate")}
                        {!selectedOpp.ctc_lpa && !selectedOpp.stipend_monthly && "Unpaid / Disclosed later"}
                      </p>
                    </div>
                    {selectedOpp.bond_details && (
                      <div className="col-span-2 border-t pt-3 mt-1">
                        <p className="text-muted-foreground font-medium uppercase text-[9px] tracking-wider mb-0.5">Service Agreement / Bond</p>
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-primary" /> {selectedOpp.bond_details}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 border-t pt-3 mt-1">
                      <p className="text-muted-foreground font-medium uppercase text-[9px] tracking-wider mb-0.5">Apply Before</p>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary" /> 
                        {new Date(selectedOpp.deadline).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Eligibility Screening widget */}
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-primary" /> Eligibility Status
                    </h4>

                    <div className="space-y-2 text-xs">
                      {/* CGPA verification */}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{elg.cgpa.label}</span>
                        {elg.cgpa.ok ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5"><CheckCircle2 className="h-3.5 w-3.5" /> Ok</span>
                        ) : (
                          <span className="text-red-500 font-semibold flex items-center gap-0.5"><XCircle className="h-3.5 w-3.5" /> Ineligible</span>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-2 text-center">
                      {elg.isEligible ? (
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> You meet the eligibility criteria for this posting!
                        </p>
                      ) : (
                        <p className="text-red-500 dark:text-red-400 font-semibold text-xs flex items-center justify-center gap-1">
                          <XCircle className="h-4 w-4" /> You do not meet the minimum CGPA requirement.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Company Profile (if present) */}
                  {selectedOpp.company && (
                    <div className="space-y-2 border rounded-lg p-4 bg-muted/5">
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-primary" /> About {selectedOpp.company.name}
                      </h4>
                      {selectedOpp.company.website && (
                        <a 
                          href={selectedOpp.company.website} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-primary hover:underline font-medium block mt-1"
                        >
                          Visit Company Website
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                        {selectedOpp.company.description || "No company description provided."}
                      </p>
                    </div>
                  )}

                  {/* Job Description details */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Job Description & Details</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border rounded-lg p-4 bg-background">
                      {selectedOpp.job_description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Footer apply buttons */}
                <SheetFooter className="border-t pt-4">
                  {selectedOpp.my_application_id ? (
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between border rounded-lg p-3 bg-emerald-500/5 text-xs">
                        <span className="font-medium text-muted-foreground">Application Status:</span>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold">
                          {selectedOpp.my_application_status === "Offered" ? "Offered (Placed)" : selectedOpp.my_application_status}
                        </Badge>
                      </div>
                      <a 
                        href={selectedOpp.my_application_resume_url || "#"} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full block"
                      >
                        <Button className="w-full gap-2" variant="outline">
                          <FileText className="h-4 w-4" /> View Submitted Resume
                        </Button>
                      </a>
                    </div>
                  ) : selectedOpp.application_link ? (
                    <a 
                      href={selectedOpp.application_link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full gap-1.5" disabled={!elg.isEligible || isExpired}>
                        Apply Externally <ChevronRight className="h-4 w-4" />
                      </Button>
                    </a>
                  ) : (
                    <Button 
                      onClick={() => setIsApplyOpen(true)}
                      className="w-full gap-1.5" 
                      disabled={!elg.isEligible || isExpired}
                    >
                      {isExpired ? "Application Closed" : "Apply for Job"} <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </SheetFooter>
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* Dialog: PDF Resume Uploader */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Opportunity</DialogTitle>
            <DialogDescription>
              Upload your resume as a PDF file to submit your application.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="resume">Resume PDF File *</Label>
              <div className="border border-dashed rounded-lg p-6 text-center hover:bg-muted/10 cursor-pointer relative group transition-colors">
                <input 
                  type="file" 
                  id="resume"
                  accept=".pdf"
                  required
                  disabled={uploading || isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.type !== "application/pdf") {
                        toast.error("Please select a PDF file.")
                        setSelectedFile(null)
                      } else {
                        setSelectedFile(file)
                      }
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2 group-hover:text-primary transition-colors" />
                <p className="text-xs font-semibold text-foreground">
                  {selectedFile ? selectedFile.name : "Click to select PDF resume"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "Only PDF file format is allowed."}
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsApplyOpen(false)}
                disabled={uploading || isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || isPending || !selectedFile}>
                {uploading || isPending ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
