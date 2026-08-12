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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { error: "Trixy AI Diagnostic Engine is not configured. Missing GEMINI_API_KEY." }
  }

  if (!input.answers || input.answers.length === 0) {
    return { error: "No test questions provided for evaluation." }
  }

  const isGeneral = input.analysisType === "general"

  // Filter incorrect questions for LLM evaluation
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

  // Build summary for AI
  const formattedIncorrect = (incorrectAnswers.length > 0 ? incorrectAnswers : input.answers).map((a) => {
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

  const systemInstruction = isGeneral
    ? `You are Trixy AI — an advanced educational AI diagnostician for student assessment.
Your mission is to perform a concise, general performance synthesis of a student's test attempt.
Focus on high-level strengths, key conceptual areas for improvement, and quick study takeaways. Keep token output light and fast.

STRICT INSTRUCTIONS:
1. "overall_diagnosis": 2-3 sentence overview of candidate's test performance.
2. "strengths": 2-3 short bullet points celebrating mastered concepts.
3. "key_misconceptions": 2-3 short bullet points highlighting major areas of improvement.
4. "recommended_review_topics": 2-4 key topics to review.
5. "question_diagnoses": Keep this array EMPTY [] for general overview to save token overhead.
6. LATEX FORMATTING: Use standard single dollar signs ($...$) for inline math. Double-escape backslashes in JSON output ("\\\\frac{a}{b}"). Output raw JSON only.`
    : `You are Trixy AI — an advanced educational AI diagnostician for student assessment.
Your mission is to perform a deep conceptual evaluation of a student's test performance.
Identify cognitive distractor traps they fell into and provide concise, actionable study guidance.

STRICT INSTRUCTIONS:
1. "overall_diagnosis": Concise 2-3 sentence synthesis of candidate's mastery level and conceptual understanding.
2. "strengths": 2–3 short bullet points celebrating concepts the student mastered well.
3. "key_misconceptions": 2–3 short bullet points identifying core conceptual flaws behind wrong answers.
4. "recommended_review_topics": 2–4 specific topics or subfields the student must review.
5. "question_diagnoses": An array with an entry for EVERY incorrect question evaluated in the prompt.
   - "question_id": string ID of the question.
   - "analysis": A single concise, well-structured response paragraph covering BOTH: (1) the potential error or misconception made in selecting the option, and (2) the exact correct solution and reasoning.
6. LATEX FORMATTING: Use standard single dollar signs ($...$) for inline math. Double-escape backslashes in JSON output ("\\\\frac{a}{b}"). Output raw JSON only.`

  const userPrompt = `Test Title: ${input.testTitle}
Score: ${input.score ?? 0} / ${input.totalMarks ?? 0} (${input.percentage ?? 0}%)
Total Questions: ${input.answers.length} (Correct: ${input.answers.length - incorrectAnswers.length}, Incorrect: ${incorrectAnswers.length})
Analysis Mode: ${isGeneral ? "General Performance Overview" : "Deep Per-Question Diagnosis"}

Student Performance Data:
---
${formattedIncorrect}
---

Perform a ${isGeneral ? "general lightweight performance synthesis" : "deep conceptual diagnostic evaluation"}.`

  const attemptWithModel = async (model: string): Promise<DiagnosticResultPayload> => {
    const streamRes = await ai.models.generateContentStream({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 6000,
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
                  analysis: { type: "string" }
                },
                required: [
                  "question_id",
                  "is_correct",
                  "analysis"
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

    let raw = ""
    for await (const chunk of streamRes) {
      raw += chunk.text ?? ""
    }

    if (!raw) throw new Error("Empty response from Trixy AI engine.")

    const cleanJson = stripCodeFences(raw)
    const parsed = JSON.parse(cleanJson)

    const llmDiagnoses: QuestionDiagnosis[] = Array.isArray(parsed.question_diagnoses) 
      ? parsed.question_diagnoses.map((d: any) => ({ ...d, is_correct: false }))
      : []

    // Combine instant correct diagnoses with LLM incorrect diagnoses
    const allDiagnoses = [...correctDiagnoses, ...llmDiagnoses]

    const resultPayload: DiagnosticResultPayload = {
      model_used: model,
      analysis_type: isGeneral ? "general" : "deep",
      overall_diagnosis: String(parsed.overall_diagnosis || ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      key_misconceptions: Array.isArray(parsed.key_misconceptions) ? parsed.key_misconceptions.map(String) : [],
      recommended_review_topics: Array.isArray(parsed.recommended_review_topics) ? parsed.recommended_review_topics.map(String) : [],
      question_diagnoses: !isGeneral ? allDiagnoses : [],
      generated_at: new Date().toISOString(),
    }

    // Persist diagnosis in Supabase DB so page refreshes load instantly without re-invoking AI
    if (input.attemptId) {
      try {
        const dbClient = await createClient()
        await (dbClient as any)
          .from("test_attempts")
          .update({ ai_diagnosis: resultPayload })
          .eq("id", input.attemptId)
      } catch (dbErr) {
        console.error("[generateConceptualFeedbackAction] Failed to persist ai_diagnosis in DB:", dbErr)
      }
    }

    return resultPayload
  }

  let lastError: unknown
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await attemptWithModel(model)
    } catch (err) {
      lastError = err
      if (!isRetryableOnNextModel(err)) {
        // Hard error (parse failure, bad response, auth, etc.) — don't advance fallback chain
        console.error(`[generateConceptualFeedbackAction] Non-retryable error on model ${model}, aborting fallback chain:`, err)
        break
      }
      console.warn(`[generateConceptualFeedbackAction] Model ${model} quota/rate-limited, trying next model...`)
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.error("[generateConceptualFeedbackAction] All models failed:", lastError)
  return {
    error: lastError instanceof Error ? lastError.message : "Failed to generate Trixy AI diagnostic feedback."
  }
}

