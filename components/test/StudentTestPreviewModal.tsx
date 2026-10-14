"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  X,
  Eye,
  Clock,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Flag,
  RotateCcw,
  Sparkles,
  Tag,
  Send,
  Layers,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { InlineRichText } from "@/components/others/rich-text"
import { cn } from "@/lib/utils"

export interface StudentTestPreviewModalProps {
  open: boolean
  onClose: () => void
  testTitle: string
  testDescription?: string | null
  timeLimitMinutes?: string | number | null
  sections: Array<{
    id: string
    name: string
    description?: string | null
    time_limit_minutes?: string | number
    pass_percentage?: string | number
    order_index?: number
  }>
  questions: Array<{
    id: string
    question_text: string
    question_type: "single_correct" | "multiple_correct" | "essay"
    marks: number
    explanation?: string | null
    tag_names?: string[]
    tags?: { id: string; name: string }[]
    section_id?: string | null
    options: Array<{
      id?: string
      _key?: string
      option_text: string
      is_correct?: boolean
    }>
    min_words?: number
    max_words?: number
    rubric_guidelines?: string
  }>
}

export function StudentTestPreviewModal({
  open,
  onClose,
  testTitle,
  testDescription,
  sections,
  questions,
}: StudentTestPreviewModalProps) {
  // Lock body scroll while preview is active and handle Escape key
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  // Normalize sections (guarantee at least one)
  const normalizedSections = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.map((s, idx) => ({
        id: s.id,
        name: s.name || `Section ${String.fromCharCode(65 + idx)}`,
        description: s.description || null,
        time_limit_minutes: s.time_limit_minutes || "30",
        order_index: s.order_index ?? idx + 1,
      }))
    }
    return [
      {
        id: "default-sec",
        name: "Section A",
        description: null,
        time_limit_minutes: "30",
        order_index: 1,
      },
    ]
  }, [sections])

  // Normalize questions
  const normalizedQuestions = useMemo(() => {
    const defaultSecId = normalizedSections[0]?.id || "default-sec"
    return questions.map((q, idx) => ({
      ...q,
      id: q.id || `q-${idx}`,
      section_id: q.section_id || defaultSecId,
      options: (q.options || []).map((opt, oi) => ({
        ...opt,
        id: opt.id ?? opt._key ?? `opt-${idx}-${oi}`,
      })),
      tags: q.tag_names ?? (q.tags ? q.tags.map((t: any) => t.name) : []),
    }))
  }, [questions, normalizedSections])

  // State
  const [currentSectionId, setCurrentSectionId] = useState<string>(
    normalizedSections[0]?.id || "default-sec"
  )
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})

  // Reset state when opening modal
  useEffect(() => {
    if (open) {
      setCurrentSectionId(normalizedSections[0]?.id || "default-sec")
      setCurrentIndex(0)
    }
  }, [open, normalizedSections])

  // Current section
  const currentSectionIndex = useMemo(() => {
    const idx = normalizedSections.findIndex((s) => s.id === currentSectionId)
    return idx >= 0 ? idx : 0
  }, [normalizedSections, currentSectionId])

  const currentSection = normalizedSections[currentSectionIndex] ?? normalizedSections[0]

  // Questions in current section
  const sectionQuestionIndices = useMemo(() => {
    const indices: number[] = []
    normalizedQuestions.forEach((q, idx) => {
      if (q.section_id === currentSection.id || normalizedSections.length === 1) {
        indices.push(idx)
      }
    })
    return indices.length > 0 ? indices : normalizedQuestions.map((_, i) => i)
  }, [normalizedQuestions, currentSection.id, normalizedSections.length])

  // Ensure currentIndex is valid for active section
  useEffect(() => {
    if (sectionQuestionIndices.length > 0 && !sectionQuestionIndices.includes(currentIndex)) {
      setCurrentIndex(sectionQuestionIndices[0])
    }
  }, [currentSectionId, sectionQuestionIndices, currentIndex])

  const currentQuestion = normalizedQuestions[currentIndex]
  const isFirstOfSection = currentIndex === (sectionQuestionIndices[0] ?? 0)
  const isLastOfSection =
    currentIndex === (sectionQuestionIndices[sectionQuestionIndices.length - 1] ?? 0)
  const isFinalSection = currentSectionIndex >= normalizedSections.length - 1

  // Handle answers
  const handleSelectOption = useCallback(
    (questionId: string, optionId: string, qType: "single_correct" | "multiple_correct" | "essay") => {
      if (qType === "essay") return
      setAnswers((prev) => {
        const cur = prev[questionId] ?? []
        let next: string[]
        if (qType === "single_correct") {
          next = cur.includes(optionId) ? [] : [optionId]
        } else {
          next = cur.includes(optionId)
            ? cur.filter((id) => id !== optionId)
            : [...cur, optionId]
        }
        return { ...prev, [questionId]: next }
      })
    },
    []
  )

  const handleClearCurrent = useCallback(() => {
    if (!currentQuestion) return
    if (currentQuestion.question_type === "essay") {
      setEssayAnswers((prev) => ({ ...prev, [currentQuestion.id]: "" }))
    } else {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: [] }))
    }
  }, [currentQuestion])

  const toggleFlag = useCallback((qid: string) => {
    setFlagged((prev) => ({ ...prev, [qid]: !prev[qid] }))
  }, [])

  // Navigation
  const handleNext = () => {
    const currentPos = sectionQuestionIndices.indexOf(currentIndex)
    if (currentPos !== -1 && currentPos < sectionQuestionIndices.length - 1) {
      setCurrentIndex(sectionQuestionIndices[currentPos + 1])
    }
  }

  const handlePrevious = () => {
    const currentPos = sectionQuestionIndices.indexOf(currentIndex)
    if (currentPos > 0) {
      setCurrentIndex(sectionQuestionIndices[currentPos - 1])
    }
  }

  const handleNextSection = () => {
    if (currentSectionIndex < normalizedSections.length - 1) {
      const nextSec = normalizedSections[currentSectionIndex + 1]
      setCurrentSectionId(nextSec.id)
      const nextSecIndices = normalizedQuestions
        .map((q, i) => (q.section_id === nextSec.id ? i : -1))
        .filter((i) => i !== -1)
      if (nextSecIndices.length > 0) {
        setCurrentIndex(nextSecIndices[0])
      }
    }
  }

  const handleResetAnswers = () => {
    setAnswers({})
    setEssayAnswers({})
    setFlagged({})
  }

  // Answered stats
  const answeredCount = useMemo(() => {
    return normalizedQuestions.filter((q) => {
      if (q.question_type === "essay") {
        return Boolean((essayAnswers[q.id] ?? "").trim())
      }
      return (answers[q.id] ?? []).length > 0
    }).length
  }, [normalizedQuestions, answers, essayAnswers])

  if (!open) return null

  const currentAnswers = currentQuestion ? answers[currentQuestion.id] ?? [] : []
  const currentEssayText = currentQuestion ? essayAnswers[currentQuestion.id] ?? "" : ""
  const essayWordCount = currentEssayText.trim()
    ? currentEssayText.trim().split(/\s+/).length
    : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground animate-in fade-in duration-200">
      {/* ── Top Simulation Banner ── */}
      <div className="shrink-0 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 sm:px-6 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <Badge className="bg-amber-500 text-black font-semibold text-xs shrink-0 flex items-center gap-1 shadow-sm">
            <Eye className="size-3.5" />
            Candidate Preview Mode
          </Badge>
          <span className="text-xs text-amber-700 dark:text-amber-300 truncate hidden md:inline">
            Simulated student test screen. Answers and timers are sandbox-only and won't affect test analytics.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAnswers}
            className="h-7 text-xs text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1"
            title="Clear all simulated responses"
          >
            <RotateCcw className="size-3" />
            Reset Responses
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-8 border-border bg-background hover:bg-muted text-xs font-semibold gap-1.5 shadow-sm"
          >
            <X className="size-3.5" />
            Exit Preview
          </Button>
        </div>
      </div>

      {/* ── Student Test Header ── */}
      <header className="shrink-0 z-30 flex h-14 items-center justify-between border-b bg-card/60 px-4 sm:px-6 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="size-4 text-primary shrink-0" />
            <h1 className="truncate text-sm font-bold text-foreground">
              {testTitle || "Untitled Assessment"}
            </h1>
          </div>

          {normalizedSections.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-muted rounded-md p-1 border">
              {normalizedSections.map((sec, idx) => {
                const isActive = sec.id === currentSectionId
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setCurrentSectionId(sec.id)
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                      isActive
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {sec.name} ({idx + 1}/{normalizedSections.length})
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-semibold text-primary">
            <Clock className="size-3.5" />
            <span>{currentSection.time_limit_minutes}m (Simulated)</span>
          </div>
        </div>
      </header>

      {/* ── Main Layout: Question + Palette ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left/Center: Question View ── */}
        <main className="flex min-w-0 flex-1 flex-col h-full overflow-hidden bg-background">
          <div className="flex-1 w-full min-h-0 overflow-y-auto px-4 py-6 sm:px-8 md:py-8 space-y-6">
            {currentQuestion ? (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Section Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {currentSection.name}
                    </span>
                    {currentSection.description && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        — {currentSection.description}
                      </span>
                    )}
                  </div>
                  {normalizedSections.length > 1 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      Section {currentSectionIndex + 1} of {normalizedSections.length}
                    </span>
                  )}
                </div>

                {/* Question Metadata & Flag Button */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                      Q{currentIndex + 1} of {normalizedQuestions.length}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {currentQuestion.marks} {currentQuestion.marks === 1 ? "mark" : "marks"}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {currentQuestion.question_type === "single_correct"
                        ? "Single Choice"
                        : currentQuestion.question_type === "essay"
                          ? "Essay Writing"
                          : "Multiple Choice"}
                    </Badge>

                    {/* Flag for Review */}
                    <button
                      type="button"
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className={cn(
                        "ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                        flagged[currentQuestion.id]
                          ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Flag
                        className={cn(
                          "size-3.5",
                          flagged[currentQuestion.id]
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted-foreground"
                        )}
                      />
                      <span>{flagged[currentQuestion.id] ? "Flagged" : "Flag"}</span>
                    </button>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-base font-medium leading-relaxed pt-1">
                    <InlineRichText>{currentQuestion.question_text}</InlineRichText>
                  </div>

                  {/* Tags */}
                  {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Tag className="size-3 text-muted-foreground/60" />
                      {currentQuestion.tags.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="px-2 py-0 text-[11px] font-normal"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Options or Essay Area */}
                {currentQuestion.question_type !== "essay" ? (
                  <div className="space-y-3 pt-2">
                    {currentQuestion.options.map((option, oi) => {
                      const letter = String.fromCharCode(65 + oi)
                      const isSelected = currentAnswers.includes(option.id)
                      const isSingle = currentQuestion.question_type === "single_correct"

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            handleSelectOption(
                              currentQuestion.id,
                              option.id,
                              currentQuestion.question_type
                            )
                          }
                          className={cn(
                            "group relative flex w-full min-h-12 items-start gap-3.5 rounded-xl border p-4 text-left text-sm transition-all duration-150 cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground font-medium shadow-xs"
                              : "border-border bg-card text-foreground/90 hover:border-primary/40 hover:bg-muted/40"
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-[11px] font-bold text-muted-foreground group-hover:border-primary/40 group-hover:text-primary mt-0.5">
                            {letter}
                          </span>
                          <span className="shrink-0 mt-0.5">
                            {isSingle ? (
                              isSelected ? (
                                <CheckCircle2 className="size-5 text-primary" />
                              ) : (
                                <Circle className="size-5 text-muted-foreground/50" />
                              )
                            ) : isSelected ? (
                              <CheckSquare className="size-5 text-primary" />
                            ) : (
                              <Square className="size-5 text-muted-foreground/50" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 leading-snug">
                            <InlineRichText>{option.option_text}</InlineRichText>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  /* Essay Writing Simulator */
                  <div className="space-y-3 rounded-xl border p-4 bg-card">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Candidate Essay Editor</span>
                      <span className="tabular-nums">
                        Words: <strong className="text-foreground">{essayWordCount}</strong> (Target:{" "}
                        {currentQuestion.min_words ?? 180} - {currentQuestion.max_words ?? 220})
                      </span>
                    </div>

                    <textarea
                      value={currentEssayText}
                      onChange={(e) =>
                        setEssayAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value,
                        }))
                      }
                      placeholder="Write your essay response here…"
                      rows={8}
                      className="w-full rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-y"
                    />

                    {currentQuestion.rubric_guidelines && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                        <p className="font-semibold text-primary mb-1">Rubric / Instructions:</p>
                        <p className="whitespace-pre-line">{currentQuestion.rubric_guidelines}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Clear Response */}
                {(currentAnswers.length > 0 || currentEssayText) && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCurrent}
                      className="text-xs text-muted-foreground hover:text-foreground h-8"
                    >
                      Clear Response
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                No questions found in this section.
              </div>
            )}
          </div>

          {/* ── Bottom Question Navigation Bar ── */}
          <div className="shrink-0 h-16 border-t bg-card/60 backdrop-blur px-6 flex items-center justify-between z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirstOfSection}
              className="gap-1.5"
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded border">
                {currentSection.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground font-medium">
                Q {currentIndex + 1} / {normalizedQuestions.length}
              </span>
            </div>

            {isLastOfSection ? (
              isFinalSection ? (
                <Button
                  size="sm"
                  onClick={onClose}
                  className="font-semibold gap-1.5 bg-primary text-primary-foreground"
                >
                  <Send className="size-4" />
                  Finish Preview
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleNextSection}
                  className="font-semibold gap-1.5 bg-primary text-primary-foreground"
                >
                  Next Section
                  <ArrowRight className="size-4" />
                </Button>
              )
            ) : (
              <Button size="sm" onClick={handleNext} className="gap-1.5 font-semibold px-5">
                Next
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </main>

        {/* ── Right Column: Question Palette Sidebar ── */}
        <aside className="hidden lg:flex w-72 shrink-0 h-full flex-col border-l bg-card/40 overflow-y-auto p-5 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Simulated Progress</span>
              <span className="tabular-nums font-semibold text-foreground">
                {answeredCount} / {normalizedQuestions.length}
              </span>
            </div>
            <Progress
              value={(answeredCount / (normalizedQuestions.length || 1)) * 100}
              className="h-2 w-full"
            />
          </div>

          {/* Question Palette Grid */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Question Palette
            </p>

            {normalizedSections.map((sec) => {
              const secQuestions = normalizedQuestions.filter((q) => q.section_id === sec.id)
              if (secQuestions.length === 0) return null
              const isSecActive = sec.id === currentSectionId

              return (
                <div key={sec.id} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider">
                    <span className="truncate">{sec.name}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {secQuestions.length} Qs
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {secQuestions.map((q) => {
                      const globalIdx = normalizedQuestions.findIndex((nq) => nq.id === q.id)
                      const isCurrent = globalIdx === currentIndex
                      const isAns =
                        q.question_type === "essay"
                          ? Boolean((essayAnswers[q.id] ?? "").trim())
                          : (answers[q.id] ?? []).length > 0
                      const isFlg = flagged[q.id] ?? false

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            if (!isSecActive) setCurrentSectionId(sec.id)
                            setCurrentIndex(globalIdx)
                          }}
                          className={cn(
                            "relative aspect-square w-full rounded-full border text-xs font-bold transition-all duration-150 flex items-center justify-center select-none cursor-pointer",
                            isCurrent && "ring-2 ring-primary ring-offset-2 scale-105 shadow-sm",
                            isAns
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                              : isFlg
                                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {globalIdx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Palette Legend */}
          <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Legend</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-emerald-500/20 border border-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-amber-500/20 border border-amber-500" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full border-2 border-primary" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-background border border-border" />
                <span>Unvisited</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
