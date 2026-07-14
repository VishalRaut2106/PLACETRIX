"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconUpload,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconX,
  IconBriefcase,
  IconSparkles,
  IconCheck,
  IconAlertCircle,
  IconTarget,
  IconBrain,
  IconArrowLeft,
  IconRefresh,
  IconFileText,
  IconLoader2,
  IconBolt,
  IconTrendingUp,
  IconHash,
  IconBulb,
  IconArrowRight,
  IconChevronDown,
  IconClock,
  IconUser,
  IconBuildingSkyscraper,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { analyzeResumeAction, type AnalysisResult } from "./actions"

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
const LS_KEY = "placetrix_resume_last"
function saveResult(r: AnalysisResult) { try { localStorage.setItem(LS_KEY, JSON.stringify(r)) } catch { } }
function loadResult(): AnalysisResult | null { try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null } catch { return null } }

// ─────────────────────────────────────────────
// Score colour helpers
// ─────────────────────────────────────────────
function scoreColor(s: number) { return s >= 75 ? "text-emerald-500" : s >= 50 ? "text-amber-500" : "text-rose-500" }
function scoreRingColor(s: number) { return s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#f43f5e" }
function scoreLabel(s: number) { return s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Fair" : "Needs Work" }
function scoreBgClass(s: number) { return s >= 75 ? "bg-emerald-500/10 border-emerald-500/20" : s >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20" }
function impactColor(impact: string) { return impact === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : impact === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-muted text-muted-foreground border-border" }

// ─────────────────────────────────────────────
// Animated circular dial
// ─────────────────────────────────────────────
function ScoreDial({ score, size = 160, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const [displayed, setDisplayed] = React.useState(0)
  const [dashOffset, setDashOffset] = React.useState(circumference)

  React.useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 1200
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(e * score))
      setDashOffset(circumference - e * (circumference * (score / 100)))
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score, circumference])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted/30" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={scoreRingColor(score)} strokeWidth={10} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: "stroke-dashoffset 0.05s linear" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold tabular-nums", scoreColor(score))}>{displayed}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      {label && <Badge variant="secondary" className={cn("text-xs font-semibold", scoreColor(score))}>{label}</Badge>}
    </div>
  )
}

// ─────────────────────────────────────────────
// Animated section bar
// ─────────────────────────────────────────────
function SectionBar({ name, score }: { name: string; score: number }) {
  const [value, setValue] = React.useState(0)
  React.useEffect(() => { const t = setTimeout(() => setValue(score), 100); return () => clearTimeout(t) }, [score])
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{name}</span>
        <span className={cn("font-semibold tabular-nums", scoreColor(score))}>{score}%</span>
      </div>
      <Progress value={value} className={cn("h-2 transition-all duration-1000", score >= 75 ? "[&>[data-slot=progress-indicator]]:bg-emerald-500" : score >= 50 ? "[&>[data-slot=progress-indicator]]:bg-amber-500" : "[&>[data-slot=progress-indicator]]:bg-rose-500")} />
    </div>
  )
}

// ─────────────────────────────────────────────
// Before / After rewrite card
// ─────────────────────────────────────────────
function RewriteExample({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Before</span>
        <p className="text-xs text-muted-foreground italic leading-relaxed line-through decoration-rose-400/60">
          &quot;{before}&quot;
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">After</span>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
          &quot;{after}&quot;
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// File drop zone
// ─────────────────────────────────────────────
function FileDropZone({ file, onFileChange }: { file: File | null; onFileChange: (f: File | null) => void }) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const validateAndSet = (f: File) => {
    const ok = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type)
    if (!ok) { toast.error("Only PDF and DOCX files are supported."); return }
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB."); return }
    onFileChange(f)
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) validateAndSet(f) }
  const FileIcon = file?.type === "application/pdf" ? IconFileTypePdf : IconFileTypeDocx

  return (
    <div
      className={cn("relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer", dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-primary/5")}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSet(f) }} />
      {file ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10"><FileIcon className="size-7 text-primary" /></div>
          <div>
            <p className="font-semibold text-foreground text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(0)} KB · Ready to analyze</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onFileChange(null) }}>
            <IconX className="size-3.5" />Remove
          </Button>
        </div>
      ) : (
        <>
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted"><IconUpload className="size-7 text-muted-foreground" /></div>
          <div>
            <p className="font-semibold text-foreground">Drop your resume here</p>
            <p className="text-sm text-muted-foreground mt-1">or <span className="text-primary underline underline-offset-2">browse</span> to select</p>
          </div>
          <div className="flex gap-2"><Badge variant="secondary">PDF</Badge><Badge variant="secondary">DOCX</Badge><Badge variant="secondary">Max 5 MB</Badge></div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────
export function ResumeAnalyzerClient() {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [mode, setMode] = React.useState<"standalone" | "jd">("standalone")
  const [jobDescription, setJobDescription] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<AnalysisResult | null>(null)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { const s = loadResult(); if (s) setResult(s) }, [])

  const handleAnalyze = async () => {
    if (!file) { toast.error("Please select a resume file first."); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      if (mode === "jd" && jobDescription.trim()) fd.append("jobDescription", jobDescription)
      const res = await analyzeResumeAction(fd)
      setResult(res)
      saveResult(res)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null); setFile(null); setJobDescription("")
    try { localStorage.removeItem(LS_KEY) } catch { }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Safely access verdict fields (handles both string legacy and object format)
  const verdict = result?.verdict
  const verdictHeadline = typeof verdict === "object" ? verdict?.headline : verdict
  const verdictSummary = typeof verdict === "object" ? verdict?.summary : verdict
  const verdictPriority = typeof verdict === "object" ? verdict?.topPriority : undefined

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-8 md:py-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground -ml-2 hover:bg-muted/50" onClick={() => router.back()}>
            <IconArrowLeft className="size-4 mr-1" />
            Back to Tools
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Resume Analyzer</h1>
          <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs ml-1">AI-Powered</Badge>
        </div>
        <p className="text-sm text-muted-foreground font-sans">
          Upload your resume for a deep AI audit — ATS scoring, section breakdown, and actionable rewrites.
        </p>
      </div>

      {/* ── Upload Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IconUpload className="size-4 text-muted-foreground" />
            Upload Resume
          </CardTitle>
          <CardDescription>PDF or DOCX only · Max 5 MB · Your file is never stored on our servers</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FileDropZone file={file} onFileChange={setFile} />

          {/* Mode toggle */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Analysis Mode</p>
            <div className="flex gap-2 flex-wrap">
              {(["standalone", "jd"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all", mode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                  {m === "standalone" ? <><IconFileText className="size-4" />Resume Only</> : <><IconBriefcase className="size-4" />Match a Job</>}
                </button>
              ))}
            </div>
          </div>

          {/* JD textarea */}
          <div className={cn("overflow-hidden transition-all duration-300", mode === "jd" ? "max-h-72 opacity-100" : "max-h-0 opacity-0")}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Paste Job Title & Description</label>
              <textarea
                className="min-h-36 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none transition"
                placeholder={"e.g. Senior Frontend Engineer at Acme Corp\n\nWe are looking for a React developer with 3+ years of experience..."}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The AI will extract required skills and score your resume against them.</p>
            </div>
          </div>

          <Button className="w-full gap-2 h-11 text-sm font-semibold" onClick={handleAnalyze} disabled={!file || loading}>
            {loading ? <><IconLoader2 className="size-4 animate-spin" />Analyzing your resume…</> : <><IconSparkles className="size-4" />Analyze Resume</>}
          </Button>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {result && (
        <div ref={resultsRef} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Results header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Analysis Results
              </h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-xs text-muted-foreground">{result.fileName} · {new Date(result.analyzedAt).toLocaleString()}</p>
                {result.detectedIndustry && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <IconBuildingSkyscraper className="size-3" />{result.detectedIndustry}
                  </Badge>
                )}
                {result.experienceLevel && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <IconUser className="size-3" />{result.experienceLevel} Level
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-0">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAnalyze} disabled={loading || !file}>
                <IconRefresh className="size-3.5" />Re-analyze
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleReset}>
                <IconArrowLeft className="size-3.5" />New Resume
              </Button>
            </div>
          </div>

          {/* ── AI Verdict ── */}
          {verdict && (
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 mt-0.5">
                      <IconBrain className="size-4 text-violet-500" />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <span className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Verdict</span>
                      {verdictHeadline && (
                        <p className="text-sm font-semibold text-foreground">{verdictHeadline}</p>
                      )}
                      {verdictSummary && verdictSummary !== verdictHeadline && (
                        <p className="text-sm text-foreground/80 leading-relaxed">{verdictSummary}</p>
                      )}
                    </div>
                  </div>
                  {verdictPriority && (
                    <div className="ml-11 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2">
                      <p className="text-xs text-foreground">
                        <span className="font-semibold text-violet-600 dark:text-violet-400">Top Priority: </span>
                        {verdictPriority}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Quick Wins ── */}
          {result.quickWins && result.quickWins.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <IconBolt className="size-4" />
                  Quick Wins — Highest Impact Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {result.quickWins.map((win, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn("inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", impactColor(win.impact))}>
                        {win.impact}
                      </span>
                      {win.estimatedTime && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <IconClock className="size-2.5" />{win.estimatedTime}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">{win.title}</span>
                      <span className="text-xs text-muted-foreground leading-relaxed">{win.action}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Score Overview ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall score */}
            <Card className="flex flex-col items-center justify-center py-8 gap-4">
              <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
              <ScoreDial score={result.overallScore} size={160} label={scoreLabel(result.overallScore)} />
              <p className="text-xs text-muted-foreground text-center px-6">Based on content quality, ATS compatibility, and formatting.</p>
            </Card>

            {/* ATS + Keyword match */}
            <Card className="flex flex-col justify-between gap-6 p-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ATS Score</span>
                <ScoreDial score={result.atsScore} size={110} />
                <p className="text-xs text-muted-foreground mt-1">Applicant Tracking System compatibility</p>
              </div>
              <Separator />
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keyword Match</span>
                <div className={cn("text-2xl font-bold tabular-nums mt-1", scoreColor(result.keywordMatchRate))}>{result.keywordMatchRate}%</div>
                <p className="text-xs text-muted-foreground">Industry-relevant keywords found</p>
              </div>
            </Card>

            {/* JD match or detected skills */}
            {result.jdMatchScore !== undefined ? (
              <Card className={cn("border flex flex-col gap-4 p-6", scoreBgClass(result.jdMatchScore))}>
                <div className="flex items-center gap-2">
                  <IconBriefcase className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Job Match Score</span>
                </div>
                <div className="flex justify-center">
                  <ScoreDial score={result.jdMatchScore} size={110} label={scoreLabel(result.jdMatchScore)} />
                </div>
                {result.missingSkills && result.missingSkills.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Missing Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missingSkills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-2">
                  <IconSparkles className="size-4 text-violet-500" />
                  <span className="text-sm font-semibold">Detected Skills</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(result.detectedSkills ?? []).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Section score bars */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm font-semibold">Section Scores</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {result.sections.map((s) => (<SectionBar key={s.name} name={s.name} score={s.score} />))}
            </div>
          </Card>

          {/* ── Strengths & Weaknesses ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">

                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <IconCheck className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-rose-500/20 bg-rose-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-rose-700 dark:text-rose-400">

                  Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {result.weaknesses.map((w, i) => (
                    <li key={i}>
                      <Collapsible>
                        <div className="flex items-start gap-2.5 text-sm">
                          <IconAlertCircle className="size-4 text-rose-500 mt-0.5 shrink-0" />
                          <div className="flex flex-1 items-start justify-between gap-2">
                            <span className="text-foreground">{w}</span>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0">
                                Fix it<IconChevronDown className="size-3" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        <CollapsibleContent>
                          <div className="mt-2 ml-6 rounded-lg bg-background/70 border border-rose-500/20 p-3 text-xs text-muted-foreground">
                            <IconBulb className="size-3 inline mr-1 text-amber-500" />
                            {result.suggestions?.[w] ?? "Focus on making this section more specific and achievement-driven with quantifiable results."}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* ── Detailed Section Breakdown ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Detailed Section Breakdown
              </CardTitle>
              <CardDescription>Expand each section for specific feedback, improvement tips, and rewrite examples.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {result.sections.map((section) => (
                  <AccordionItem key={section.name} value={section.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1 pr-2">
                        <Badge variant="secondary" className={cn("text-xs font-bold tabular-nums px-2 py-0.5", scoreBgClass(section.score), scoreColor(section.score))}>
                          {section.score}
                        </Badge>
                        <span className="font-medium text-sm">{section.name}</span>
                        <span className="text-xs text-muted-foreground hidden sm:block truncate ml-auto mr-4">{section.feedback}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4 pt-1 pb-2">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feedback</p>
                          <p className="text-sm text-foreground">{section.feedback}</p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Improvement Tip</p>
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                            <IconBulb className="size-3.5 inline mr-1 text-amber-500" />{section.suggestion}
                          </div>
                        </div>

                        {section.rewriteExample && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                              <IconArrowRight className="size-3" />Concrete Rewrite Example
                            </p>
                            <RewriteExample before={section.rewriteExample.before} after={section.rewriteExample.after} />
                          </div>
                        )}

                        <SectionBar name={section.name} score={section.score} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* ── Keyword Analysis ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keyword density */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Keyword Density
                </CardTitle>
                <CardDescription>Brighter = high-value industry keyword</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(result.keywords ?? []).length > 0
                    ? result.keywords.map((k) => {
                      const intensity = Math.min(k.count, 5)
                      const bgOpacity = 10 + intensity * 8
                      return (
                        <div
                          key={k.keyword}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                            k.important
                              ? `bg-violet-500/${bgOpacity} border-violet-500/30 text-violet-700 dark:text-violet-300`
                              : "bg-muted/40 border-border/60 text-muted-foreground"
                          )}
                        >
                          <span>{k.keyword}</span>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums", k.important ? "bg-violet-500/20 text-violet-600 dark:text-violet-400" : "bg-muted text-muted-foreground")}>
                            ×{k.count}
                          </span>
                        </div>
                      )
                    })
                    : <p className="text-xs text-muted-foreground">No keywords extracted.</p>
                  }
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-3">
                  <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-violet-500/30" />High-value keyword</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-muted" />Supporting keyword</span>
                </div>
              </CardContent>
            </Card>

            {/* Suggested keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Suggested Keywords to Add
                </CardTitle>
                <CardDescription>Missing from your resume but would strengthen it</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(result.suggestedKeywords ?? []).length > 0
                    ? result.suggestedKeywords.map((k) => (
                      <Badge key={k} variant="secondary" className="text-xs gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        + {k}
                      </Badge>
                    ))
                    : <p className="text-xs text-muted-foreground">No additional keywords suggested — great coverage!</p>
                  }
                </div>
                {result.suggestedKeywords && result.suggestedKeywords.length > 0 && (
                  <p className="text-xs text-muted-foreground border-t border-border/40 pt-3 mt-3">
                    💡 Naturally weave these into your experience bullet points and skills section — don&apos;t keyword-stuff.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
