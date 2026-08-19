"use server"

import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/supabase/profile"
import { GoogleGenAI } from "@google/genai"
import crypto from "crypto"

// SHA-256 AI response cache map to eliminate 100% of duplicate Gemini API calls & server wait time
const resumeAiCacheMap = new Map<string, any>()

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface Recommendation {
  title: string
  severity: "High" | "Medium" | "Low"
  feedback: string
  suggestion: string
  rewrite?: {
    before: string
    after: string
  }
}

export interface Verdict {
  headline: string
  summary: string
  topPriority: string
}

export interface QuickWin {
  title: string
  impact: "High" | "Medium" | "Low"
  action: string
  estimatedTime: string // e.g. "5 min", "15 min"
}

export interface FormatCheck {
  label: string
  status: "Passed" | "Failed" | "Warning"
  feedback: string
}

export interface LocalAnalysis {
  wordCount: number
  characterCount: number
  hasEmail: boolean
  hasPhone: boolean
  hasLinkedIn: boolean
  hasGitHub: boolean
}

export interface InterviewPrep {
  elevatorPitch: string
  crossQuestions: {
    question: string
    reasoning: string
    suggestedApproach: string
  }[]
}

export interface AnalysisResult {
  overallScore: number
  atsScore: number
  detectedIndustry: string
  candidateStatus: "Student" | "Intern" | "Fresher" | "Working Professional" | "Other"
  experienceLevel: "Entry" | "Mid" | "Senior"
  verdict: Verdict
  strengths: string[]
  recommendations: Recommendation[]
  quickWins: QuickWin[]
  formatChecks: FormatCheck[]
  suggestedKeywords: string[]
  detectedSkills: string[]
  localAnalysis: LocalAnalysis
  interviewPrep?: InterviewPrep
  jdMatchScore?: number
  missingSkills?: string[]
  fileName: string
  analyzedAt: string
}

// ─────────────────────────────────────────────
// Text extraction helpers
// ─────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse is CJS — dynamically require to avoid ESM issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse")
  const data = await pdfParse(buffer)
  return data.text as string
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

// ─────────────────────────────────────────────
// Local analysis helpers (non-AI text scanning)
// ─────────────────────────────────────────────

function performLocalAnalysis(text: string): LocalAnalysis {
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const characterCount = text.length

  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)
  const hasLinkedIn = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(text)
  const hasGitHub = /github\.com\/[a-zA-Z0-9_-]+/i.test(text)

  return {
    wordCount,
    characterCount,
    hasEmail,
    hasPhone,
    hasLinkedIn,
    hasGitHub,
  }
}

// ─────────────────────────────────────────────
// Main server action
// ─────────────────────────────────────────────

export async function analyzeResumeAction(_formData: FormData): Promise<AnalysisResult> {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  throw new Error(
    "Trixy AI Resume Analyzer is temporarily paused for scheduled maintenance and performance optimization. Please check back shortly."
  )
}

export async function generateExtraQuestionAction(
  _formData: FormData
): Promise<{ question: string; reasoning: string; suggestedApproach: string }> {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized")

  throw new Error(
    "Trixy AI interview question generation is temporarily paused for scheduled maintenance."
  )
}
