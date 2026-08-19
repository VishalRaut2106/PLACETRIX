"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { getFriendlyErrorMessage } from "@/lib/errors"
import { GoogleGenAI } from "@google/genai"

// --- Shared types ---
export type SettingsForm = {
  title: string
  description: string
  instructions: string
  time_limit_minutes: string
  available_from: string
  available_until: string
  shuffle_questions: boolean
  shuffle_options: boolean
  strict_mode: boolean
  pass_percentage: string
  cohort_ids?: string[]
}

export type OptionForm = {
  _key: string
  option_text: string
  is_correct: boolean
}

export type LocalSection = {
  id: string
  name: string
  description: string
  order_index: number
}

export type SectionForm = {
  name: string
  description: string
}

export type LocalQuestion = {
  id: string
  question_text: string
  question_type: "single_correct" | "multiple_correct"
  marks: number
  order_index: number
  tag_names: string[]
  options: OptionForm[]
  explanation: string
  section_id: string | null
}

export type QuestionForm = {
  question_text: string
  question_type: "single_correct" | "multiple_correct"
  marks: number
  explanation: string
  options: OptionForm[]
  tag_names: string[]
}

export type AiGenerateForm = {
  topic: string
  count: string
  difficulty: "easy" | "medium" | "hard"
  question_type: "single_correct" | "multiple_correct" | "mixed"
}

export type InitialTestData = {
  settings: SettingsForm
  questions: LocalQuestion[]
  sections: LocalSection[]
  status: "draft" | "published"
}

export type GenerateQuestionsResult = {
  questions?: QuestionForm[]
  generatedWith?: string
  error?: string
}

// --- Database Helpers ---
async function saveTestToDb(
  testId: string,
  userId: string,
  settings: SettingsForm,
  questions: LocalQuestion[],
  sections: LocalSection[],
  status: "draft" | "published"
): Promise<void> {
  const supabase = await createClient()

  const { error } = await (supabase as any).rpc("test_save", {
    p_test_id: testId,
    p_settings: {
      title: settings.title.trim(),
      description: settings.description.trim() || null,
      instructions: settings.instructions.trim() || null,
      time_limit_seconds: settings.time_limit_minutes
        ? Math.round(parseFloat(settings.time_limit_minutes) * 60)
        : null,
      available_from: settings.available_from || null,
      available_until: settings.available_until || null,
      shuffle_questions: settings.shuffle_questions,
      shuffle_options: settings.shuffle_options,
      strict_mode: settings.strict_mode,
      pass_percentage: settings.pass_percentage ? parseFloat(settings.pass_percentage) : null,
    },
    p_questions: questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: q.marks,
      explanation: q.explanation?.trim() || null,
      tag_names: q.tag_names,
      section_id: q.section_id || null,
      options: q.options.map((opt) => ({
        id: opt._key,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      })),
    })),
    p_status: status,
    p_sections: sections.length > 0
      ? sections.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          description: s.description?.trim() || null,
        }))
      : null,
  })

  if (error) {
    console.error("[TEST_SAVE] Supabase RPC error:", error)
    throw new Error(getFriendlyErrorMessage(error, "Failed to save the test. Please try again."))
  }
}

async function requireAuth(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) throw new Error("Not authenticated")
  return user.sub as string
}

export async function loadTestAction(
  testId: string
): Promise<InitialTestData | null> {
  const profile = await getUserProfile()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_staff" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Unauthorized")
  }
  const supabase = await createClient()

  const [{ data: test }, { data: cohorts }, { data: rawSections }] = await Promise.all([
    (supabase as any)
      .from("tests")
      .select(`
        title, description, instructions,
        time_limit_seconds, available_from, available_until, status,
        shuffle_questions, shuffle_options, strict_mode, pass_percentage,
        test_questions (
          id, question_text, question_type, marks, order_index, explanation, section_id,
          test_question_options ( id, option_text, is_correct, order_index ),
          question_tags ( test_question_tags ( id, name ) )
        )
      `)
      .eq("id", testId)
      .eq("institute_id", profile.institute_id)
      .maybeSingle(),
    (supabase as any)
      .from("test_cohorts")
      .select("cohort_id")
      .eq("test_id", testId),
    (supabase as any)
      .from("test_sections")
      .select("id, name, description, order_index")
      .eq("test_id", testId)
      .order("order_index"),
  ])

  if (!test) return null

  const cohortIds = (cohorts ?? []).map((c: any) => c.cohort_id)

  return {
    settings: {
      title: test.title ?? "",
      description: test.description ?? "",
      instructions: test.instructions ?? "",
      time_limit_minutes: test.time_limit_seconds
        ? String(test.time_limit_seconds / 60)
        : "",
      available_from: test.available_from ?? "",
      available_until: test.available_until ?? "",
      shuffle_questions: test.shuffle_questions ?? false,
      shuffle_options: test.shuffle_options ?? false,
      strict_mode: test.strict_mode ?? false,
      pass_percentage: test.pass_percentage != null ? String(test.pass_percentage) : "",
      cohort_ids: cohortIds,
    },
    status: test.status as "draft" | "published",
    sections: (rawSections ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      order_index: s.order_index,
    })),
    questions: (test.test_questions ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        order_index: q.order_index,
        explanation: q.explanation ?? "",
        section_id: q.section_id ?? null,
        tag_names: (q.question_tags ?? [])
          .map((qt: any) => qt.test_question_tags?.name)
          .filter(Boolean),
        options: (q.test_question_options ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((o: any) => ({
            _key: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          })),
      })),
  }
}

async function requireTestManager() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (
    !["institute_primary", "institute_staff", "institute_placement_officer"].includes(
      profile.account_type
    )
  ) {
    throw new Error("Unauthorized: Only institute staff can manage tests.")
  }
  if (!profile.institute_id) throw new Error("No institute associated with your profile.")
  return profile
}

export async function saveDraftAction(
  testId: string,
  settings: SettingsForm,
  questions: LocalQuestion[],
  sections: LocalSection[]
): Promise<void> {
  const profile = await requireTestManager()
  const supabase = await createClient()

  // Verify cohort IDs belong to caller's institute
  if (settings.cohort_ids && settings.cohort_ids.length > 0) {
    const { data: cohorts, error: cohortError } = await (supabase as any)
      .from("cohorts")
      .select("id")
      .in("id", settings.cohort_ids)
      .eq("institute_id", profile.institute_id)

    if (cohortError || !cohorts || cohorts.length !== settings.cohort_ids.length) {
      throw new Error("Invalid cohorts selected.")
    }
  }

  await saveTestToDb(testId, profile.id, settings, questions, sections, "draft")
  // Save cohort mappings for draft too (optional, replaces)
  await (supabase as any).from("test_cohorts").delete().eq("test_id", testId)
  if (settings.cohort_ids && settings.cohort_ids.length > 0) {
    await (supabase as any).from("test_cohorts").insert(
      settings.cohort_ids.map((cohortId) => ({ test_id: testId, cohort_id: cohortId }))
    )
  }
  revalidatePath("/tests")
}

export async function publishTestAction(
  testId: string,
  settings: SettingsForm,
  questions: LocalQuestion[],
  sections: LocalSection[]
): Promise<void> {
  const profile = await requireTestManager()
  if (!settings.title.trim()) throw new Error("Title is required.")
  if (questions.length === 0) throw new Error("Add at least one question.")
  if (!settings.cohort_ids || settings.cohort_ids.length === 0) {
    throw new Error("Please select at least one cohort before publishing this test.")
  }

  const supabase = await createClient()

  // Verify cohort IDs belong to caller's institute
  const { data: cohorts, error: cohortError } = await (supabase as any)
    .from("cohorts")
    .select("id")
    .in("id", settings.cohort_ids)
    .eq("institute_id", profile.institute_id)

  if (cohortError || !cohorts || cohorts.length !== settings.cohort_ids.length) {
    throw new Error("Invalid cohorts selected.")
  }

  // Group G Correctness check: Ensure each question has at least one correct option
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const hasCorrect = q.options.some((o) => o.is_correct)
    if (!hasCorrect) {
      throw new Error(`Question ${i + 1} ("${q.question_text.slice(0, 40)}...") has no correct options defined. Please mark at least one option as correct.`)
    }
  }

  await saveTestToDb(testId, profile.id, settings, questions, sections, "published")

  // Replace test cohort mappings
  await (supabase as any).from("test_cohorts").delete().eq("test_id", testId)
  if (settings.cohort_ids && settings.cohort_ids.length > 0) {
    const { error: cohortInsError } = await (supabase as any).from("test_cohorts").insert(
      settings.cohort_ids.map((cohortId) => ({ test_id: testId, cohort_id: cohortId }))
    )
    if (cohortInsError) {
      console.error("[TEST_SAVE] Cohort insert error:", cohortInsError)
    }
  }

  revalidatePath("/tests")
  redirect(`/tests/${testId}`)
}

// ─── AI Question Generation ───────────────────────────────────────────────────

const DIFFICULTY_MARKS: Record<AiGenerateForm["difficulty"], number> = Object.freeze({
  easy: 1,
  medium: 1,
  hard: 1,
})

const MODEL_FALLBACK_CHAIN: readonly string[] = Object.freeze([
  "gemini-3.5-flash",
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

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 600): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
}

function cleanAiString(input: any): string {
  if (!input) return ""
  let str = String(input).trim()

  // Replace literal \n with actual newlines
  str = str.replace(/\\n/g, "\n")

  // Clean backslashes prepended to percentage & currency numbers
  str = str.replace(/\\%\$\\?/g, "%")
  str = str.replace(/\\%\$/g, "%")
  str = str.replace(/\\%\\(?=\s|$|[^\w])/g, "%")

  // Currency backslash artifacts: \$1,500,000 → $1,500,000
  str = str.replace(/\\+\$(\d{1,3}(?:,\d{3})*|\d+)/g, "$$$1")

  // Convert legacy LaTeX delimiters \( ... \) -> $ ... $ and \[ ... \] -> $$ ... $$
  str = str.replace(/\\\\/g, "_DOUBLE_BACKSLASH_") // protect \\\\ first
  str = str.replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$")
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$")
  str = str.replace(/_DOUBLE_BACKSLASH_/g, "\\\\")

  // Strip markdown **bold** and *italic* that AI sometimes emits in text fields
  str = str.replace(/\*\*([^*]+?)\*\*/g, "$1")
  str = str.replace(/\*([^*]+?)\*/g, "$1")

  // Strip \begin{enumerate} / \begin{itemize} environments -- replace \item with a dash
  str = str.replace(/\\begin\{(?:enumerate|itemize)\}/g, "")
  str = str.replace(/\\end\{(?:enumerate|itemize)\}/g, "")
  str = str.replace(/\\item\s*/g, "- ")

  // Convert bare \% outside math to plain %
  // Protect math blocks first so we don't touch \% inside $...$ or $$...$$
  str = str.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (m) => m.replace(/\\/g, "\x00"))
  str = str.replace(/\\%/g, "%")
  str = str.replace(/\x00/g, "\\")
  // Convert bare \times, \cdot, \div outside math to unicode equivalents
  str = str.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (m) => m.replace(/\\/g, "\x00"))
  str = str.replace(/\\times/g, "×")
  str = str.replace(/\\cdot/g, "·")
  str = str.replace(/\\div/g, "÷")
  str = str.replace(/\x00/g, "\\")

  return str
}

function sanitizeQuestions(raw: any[], marksDefault: number): QuestionForm[] {
  return raw
    .filter(
      (q) =>
        q?.question_text?.trim() &&
        Array.isArray(q?.options) &&
        q.options.length >= 2
    )
    .map((q): QuestionForm => {
      const qType: "single_correct" | "multiple_correct" =
        q.question_type === "multiple_correct"
          ? "multiple_correct"
          : "single_correct"

      let options: OptionForm[] = (q.options as any[]).map((o) => ({
        _key: crypto.randomUUID(),
        option_text: cleanAiString(o.option_text),
        is_correct: !!o.is_correct,
      }))

      if (qType === "single_correct") {
        let pinned = false
        options = options.map((o, i) => {
          if (o.is_correct && !pinned) {
            pinned = true
            return o
          }
          if (i === options.length - 1 && !pinned) {
            return { ...o, is_correct: true }
          }
          return { ...o, is_correct: false }
        })
      } else {
        const correctCount = options.filter((o) => o.is_correct).length
        if (correctCount < 2) {
          let forced = 0
          options = options.map((o) => {
            if (forced < 2 && !o.is_correct) {
              forced++
              return { ...o, is_correct: true }
            }
            return o
          })
        }
      }

      return {
        question_text: cleanAiString(q.question_text),
        question_type: qType,
        marks: Number(q.marks ?? marksDefault),
        explanation: cleanAiString(q.explanation),
        tag_names: Array.isArray(q.tag_names)
          ? q.tag_names.map((t: any) => String(t).trim()).filter(Boolean)
          : [],
        options,
      }
    })
}

export async function generateQuestionsAction(
  _input: AiGenerateForm
): Promise<GenerateQuestionsResult> {
  await requireAuth()
  return {
    error: "Trixy AI question generation is temporarily paused for scheduled maintenance and performance optimization. Please add questions manually or try again later.",
  }
}



