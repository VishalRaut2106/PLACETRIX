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
  testTitle: string
  score: number | null
  totalMarks: number | null
  percentage: number | null
  answers: AnswerInputForDiagnosis[]
}

export type QuestionDiagnosis = {
  question_id: string
  is_correct: boolean
  conceptual_flaw_summary: string
  why_choice_was_wrong: string
  correct_concept_explanation: string
  distractor_analysis: string
}

export type DiagnosticResultPayload = {
  model_used?: string
  overall_diagnosis?: string
  strengths?: string[]
  key_misconceptions?: string[]
  recommended_review_topics?: string[]
  question_diagnoses?: QuestionDiagnosis[]
  generated_at?: string
  error?: string
}

const MODEL_FALLBACK_CHAIN: readonly string[] = Object.freeze([
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemma-2-27b-it",
])

function isRetryableOnNextModel(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return /429|rate.?limit|too many|quota|503|502|overloaded/.test(msg)
  }
  return false
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { error: "AI Diagnostic Engine is not configured. Missing GEMINI_API_KEY." }
  }

  if (!input.answers || input.answers.length === 0) {
    return { error: "No test questions provided for evaluation." }
  }

  // Filter incorrect questions for deep LLM evaluation to save latency and token overhead
  const incorrectAnswers = input.answers.filter((a) => !a.is_correct)
  
  // Create instant default diagnosis entries for correct answers
  const correctDiagnoses: QuestionDiagnosis[] = input.answers
    .filter((a) => a.is_correct)
    .map((a) => ({
      question_id: a.question_id,
      is_correct: true,
      conceptual_flaw_summary: "Concept mastered.",
      why_choice_was_wrong: "N/A (Correctly answered).",
      correct_concept_explanation: a.explanation || "Correct reasoning demonstrated.",
      distractor_analysis: "N/A",
    }))

  // Build readable summary for AI focusing on incorrect questions & high-level performance
  const formattedIncorrect = (incorrectAnswers.length > 0 ? incorrectAnswers : input.answers).map((a, idx) => {
    const selectedTexts = a.options
      .filter((o) => a.selected_option_ids.includes(o.id))
      .map((o) => o.option_text)
      .join("; ")

    const correctTexts = a.options
      .filter((o) => o.is_correct)
      .map((o) => o.option_text)
      .join("; ")

    const allOptionsStr = a.options
      .map((o) => `- ${o.option_text}${o.is_correct ? " [CORRECT ANSWER]" : ""}${a.selected_option_ids.includes(o.id) ? " [STUDENT SELECTED]" : ""}`)
      .join("\n")

    const tagNames = (a.tags ?? []).map((t) => t.name).join(", ")

    return `Question (ID: ${a.question_id}):
Text: ${a.question_text}
Tags: ${tagNames || "None"}
Status: INCORRECT
Student Selected: ${selectedTexts || "(Unanswered / None selected)"}
Correct Option(s): ${correctTexts}
Explanation: ${a.explanation || "N/A"}
Options:
${allOptionsStr}`
  }).join("\n\n---\n\n")

  const ai = new GoogleGenAI({ apiKey })

  const systemInstruction = `You are Gemma 4 — an advanced educational AI diagnostician for student assessment.

Your mission is to perform a rapid, deep conceptual evaluation of a student's test performance.
Identify cognitive distractor traps they fell into and provide concise, actionable study guidance.

STRICT INSTRUCTIONS:
1. "overall_diagnosis": Concise 2-3 sentence synthesis of candidate's mastery level and conceptual understanding.
2. "strengths": 2–3 short bullet points celebrating concepts the student mastered well.
3. "key_misconceptions": 2–3 short bullet points identifying core conceptual flaws behind wrong answers.
4. "recommended_review_topics": 2–4 specific topics or subfields the student must review.
5. "question_diagnoses": An array with an entry for EVERY incorrect question evaluated in the prompt.
   - "conceptual_flaw_summary": One clear sentence summarizing the flaw.
   - "why_choice_was_wrong": Explain why their selected option is wrong and what reasoning flaw led to it.
   - "correct_concept_explanation": Explain the correct concept clearly and concisely.
   - "distractor_analysis": Explain why the wrong option was a tempting distractor trap.
6. LATEX FORMATTING:
   - Use standard single dollar signs ($...$) for inline math and double dollar signs ($$...$$) for centered block math.
   - Double-escape backslashes in JSON output (e.g., "\\\\frac{a}{b}").

Output MUST be a single raw JSON object matching the requested schema.`

  const userPrompt = `Test Title: ${input.testTitle}
Score: ${input.score ?? 0} / ${input.totalMarks ?? 0} (${input.percentage ?? 0}%)
Total Questions: ${input.answers.length} (Correct: ${input.answers.length - incorrectAnswers.length}, Incorrect: ${incorrectAnswers.length})

Student Errors to Diagnose:
---
${formattedIncorrect}
---

Perform a rapid conceptual diagnostic evaluation.`

  const attemptWithModel = async (model: string): Promise<DiagnosticResultPayload> => {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            overall_diagnosis: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            key_misconceptions: { type: "array", items: { type: "string" } },
            recommended_review_topics: { type: "array", items: { type: "string" } },
            question_diagnoses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_id: { type: "string" },
                  is_correct: { type: "boolean" },
                  conceptual_flaw_summary: { type: "string" },
                  why_choice_was_wrong: { type: "string" },
                  correct_concept_explanation: { type: "string" },
                  distractor_analysis: { type: "string" }
                },
                required: [
                  "question_id",
                  "is_correct",
                  "conceptual_flaw_summary",
                  "why_choice_was_wrong",
                  "correct_concept_explanation",
                  "distractor_analysis"
                ]
              }
            }
          },
          required: [
            "overall_diagnosis",
            "strengths",
            "key_misconceptions",
            "recommended_review_topics",
            "question_diagnoses"
          ]
        }
      }
    })

    const raw = response.text
    if (!raw) throw new Error("Empty response from AI engine.")

    const cleanJson = stripCodeFences(raw)
    const parsed = JSON.parse(cleanJson)

    const llmDiagnoses: QuestionDiagnosis[] = Array.isArray(parsed.question_diagnoses) 
      ? parsed.question_diagnoses.map((d: any) => ({ ...d, is_correct: false }))
      : []

    // Combine instant correct diagnoses with LLM incorrect diagnoses
    const allDiagnoses = [...correctDiagnoses, ...llmDiagnoses]

    return {
      model_used: model,
      overall_diagnosis: String(parsed.overall_diagnosis || ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      key_misconceptions: Array.isArray(parsed.key_misconceptions) ? parsed.key_misconceptions.map(String) : [],
      recommended_review_topics: Array.isArray(parsed.recommended_review_topics) ? parsed.recommended_review_topics.map(String) : [],
      question_diagnoses: allDiagnoses,
      generated_at: new Date().toISOString(),
    }
  }

  let lastError: unknown
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await attemptWithModel(model)
    } catch (err) {
      lastError = err
      if (isRetryableOnNextModel(err)) continue
      try {
        return await attemptWithModel(model)
      } catch (retryErr) {
        lastError = retryErr
      }
    }
  }

  console.error("[generateConceptualFeedbackAction] All models failed:", lastError)
  return {
    error: lastError instanceof Error ? lastError.message : "Failed to generate AI diagnostic feedback."
  }
}
