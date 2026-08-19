"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { GoogleGenAI } from "@google/genai"

export type AnswerInputForDiagnosis = {
  question_id: string
  question_text: string
  marks: number
  is_correct: boolean | null
  selected_option_ids: string[]
  explanation: string | null
  tags?: { id: string; name: string }[]
  options: {
    id: string
    option_text: string
    is_correct: boolean
  }[]
}

export type ConceptualDiagnosisInput = {
  attemptId?: string
  testTitle: string
  score: number | null
  totalMarks: number | null
  percentage: number | null
  answers: AnswerInputForDiagnosis[]
  analysisType?: "deep" | "general"
}

export type QuestionDiagnosis = {
  question_id: string
  is_correct: boolean
  analysis?: string
  conceptual_flaw_summary?: string
  why_choice_was_wrong?: string
  correct_concept_explanation?: string
  distractor_analysis?: string
}

export type DiagnosticResultPayload = {
  model_used?: string
  analysis_type?: "deep" | "general"
  overall_diagnosis?: string
  strengths?: string[]
  key_misconceptions?: string[]
  recommended_review_topics?: string[]
  question_diagnoses?: QuestionDiagnosis[]
  generated_at?: string
  error?: string
}

// ── Fallback chain prioritizing high-throughput, low-latency Gemini Flash & Lite models
const MODEL_FALLBACK_CHAIN: readonly string[] = Object.freeze([
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
])

function isRetryableOnNextModel(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return /429|rate.?limit|too many|quota|503|502|504|overloaded|404|not found|no longer available|deprecated|400|invalid/.test(msg)
  }
  return true
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
}

export async function generateConceptualFeedbackAction(
  input: ConceptualDiagnosisInput
): Promise<DiagnosticResultPayload> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: "Authentication required." }
  }

  // 1. Instant Cache Check: If diagnosis was already generated and saved for this attemptId, return cached payload instantly!
  if (input.attemptId) {
    try {
      const dbClient = await createClient()
      const { data: attemptRow } = await (dbClient as any)
        .from("test_attempts")
        .select("ai_diagnosis")
        .eq("id", input.attemptId)
        .maybeSingle()

      if (attemptRow?.ai_diagnosis && !attemptRow.ai_diagnosis.error && attemptRow.ai_diagnosis.overall_diagnosis) {
        return attemptRow.ai_diagnosis as DiagnosticResultPayload
      }
    } catch (err) {
      console.warn("[generateConceptualFeedbackAction] Cache lookup error:", err)
    }
  }

  return {
    error: "Trixy AI Diagnostic Analysis is temporarily undergoing scheduled maintenance to optimize system performance. Please check back shortly.",
  }
}

