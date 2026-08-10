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
  await (supabase as any).from("test_cohorts").insert(
    settings.cohort_ids.map((cohortId) => ({ test_id: testId, cohort_id: cohortId }))
  )

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
  "gemma-4-31b",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
])

function isRetryableOnNextModel(err: unknown): boolean {
  // Escalate to next model on all transient errors (not just rate limits)
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

  // Clean backslashes prepended to currency numbers like \2,000,000 or \$1,500,000
  str = str.replace(/\\+\$(\d{1,3}(?:,\d{3})*|\d+)/g, "$$$1")
  str = str.replace(/\\(\d{1,3}(?:,\d{3})*|\d+)/g, "$$$1")

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
  input: AiGenerateForm
): Promise<GenerateQuestionsResult> {
  await requireAuth()
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: "AI generation is not configured. Missing GEMINI_API_KEY in environment." }

  const count = Math.min(60, Math.max(1, parseInt(input.count, 10) || 5))
  const marksDefault = DIFFICULTY_MARKS[input.difficulty]

  const typeInstruction =
    input.question_type === "mixed"
      ? `Distribute types evenly: roughly half "single_correct" (exactly 1 correct option) and half "multiple_correct" (2–3 correct options).`
      : input.question_type === "multiple_correct"
        ? `All questions must be "multiple_correct" with exactly 2–3 correct options out of 4.`
        : `All questions must be "single_correct" with exactly 1 correct option out of 4.`

  const ai = new GoogleGenAI({ apiKey })

  const systemPrompt = `You are Trixy AI — an expert exam question author for educational assessments.

STRICT RULES you must follow for every question:
1. Every question has EXACTLY 4 options — no more, no less.
2. "single_correct" → exactly 1 option with is_correct=true; the other 3 must be is_correct=false.
3. "multiple_correct" → exactly 2 or 3 options with is_correct=true; the rest must be is_correct=false.
4. All distractors (incorrect options) must be plausible but unambiguously wrong to a knowledgeable person.
5. The "explanation" field must (a) confirm why the correct answer(s) are right, and (b) briefly explain why the main distractor is wrong.
6. "tag_names": provide 1–3 short topic tags. IMPORTANT: You MUST prioritize using the exact tags from the 'EXISTING TAGS' list provided in the user prompt. Only invent a new tag if absolutely none of the existing tags accurately describe the question.
7. Every question must have marks = 1, regardless of difficulty.
8. Vary cognitive levels across the batch: include recall, application, and analysis questions.
9. Never repeat similar or near-identical questions within the same batch.
10. Your response must be a raw JSON object — no markdown, no code fences, no extra text.
11. LATEX & MATH FORMATTING (STRICT RULES):
    - For ANY mathematical content — equations, variables, exponents, fractions, square roots, chemical formulas, scientific notation, matrices, Greek letters — you MUST wrap them in LaTeX math delimiters. NEVER write math in plain text.
    - Use $...$ for inline math and $$...$$ for block/display equations. No other delimiter styles are allowed.
    - FORBIDDEN delimiters: NEVER use \\( ... \\) or \\[ ... \\] — these are legacy and will break rendering.
    - CURRENCY RULE: A raw '$' in a sentence opens inline math and will swallow your text! For monetary values ALWAYS use either:
        GOOD: "The total is $2{,}000{,}000$ rupees" (closed math)
        GOOD: "The total is USD 2,000,000"
        BAD:  "The total is $2,000,000 and..." ← NEVER do this — the '$' is unclosed
    - DELIMITER MATCHING: Every '$' opens a math block. It MUST close on the same short expression.
        GOOD: "If $x + y = 10$, find $x$."
        BAD:  "$x + y = 10, find x$" ← do not wrap sentences in math
    - MARKDOWN BOLD/ITALIC: NEVER output **bold** or *italic* markdown in question_text, option_text, or explanation. Use plain text or LaTeX \\textbf{} and \\textit{} if needed.
    - JSON BACKSLASH ESCAPING (CRITICAL): Your entire response is a JSON string. Every LaTeX backslash MUST be double-escaped.
        GOOD: "\\\\frac{1}{2}", "\\\\sqrt{x}", "\\\\theta", "\\\\alpha", "\\\\%", "\\\\times"
        BAD:  "\\frac{1}{2}", "\\sqrt{x}", "\\theta" ← single backslash will cause JSON parse failure
    - PERCENT SIGN: Always write percent as \\% inside math: "$20\\%$". Never write "20%" bare inside math mode.
    - GREEK LETTERS / SYMBOLS: Always in math mode: "$\\alpha$", "$\\beta$", "$\\pi$", "$\\Omega$". Never bare.
    - ENUMERATE / ITEMIZE: NEVER use \\begin{enumerate} or \\begin{itemize} inside question_text or option_text. Write list items as plain numbered text ("1. ..., 2. ...") or use a Markdown table.
12. TABLES & DATA PRESENTATION:
    - When a question involves tabular data, datasets, truth tables, data interpretation, scientific measurements, matrices, or comparison charts, you MUST format the table using standard Markdown tables OR LaTeX tabular environments.
    - Markdown tables are strongly preferred for data interpretation and comparison questions.
    - VERY IMPORTANT (NEWLINES): Each row of a Markdown table MUST be separated by an explicit newline character \\n in the JSON string. For example: "| Header 1 | Header 2 |\\n| --- | --- |\\n| Row 1 Col 1 | Row 1 Col 2 |\\n| Row 2 Col 1 | Row 2 Col 2 |". Never concatenate table rows on a single line!
    - Ensure all mathematical symbols or expressions inside table cells are properly enclosed in LaTeX math delimiters (e.g. "$x^2$", "$\\\\alpha$").
    - AMPERSAND in LaTeX tabular: The column separator '&' in \\begin{tabular} MUST be double-escaped as "\\\\&" because your output is JSON. A bare '&' will break JSON parsing.
    - Double-escape ALL LaTeX backslashes in tabular output (e.g. write "\\\\begin{tabular}", "\\\\hline", "\\\\\\\\\\\\\\\\" for newlines inside LaTeX tables).

It must follow this exact shape:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "single_correct" | "multiple_correct",
      "marks": 1,
      "explanation": "string",
      "tag_names": ["string"],
      "options": [
        { "option_text": "string", "is_correct": true | false }
      ]
    }
  ]
}`

  const supabase = await createClient()
  const { data: tagData } = await (supabase as any)
    .from("test_question_tags")
    .select("name")
    .order("name")
    
  const existingTagsStr = tagData && tagData.length > 0 
    ? tagData.map((t: any) => t.name).join(", ")
    : "No existing tags yet."


  const executeSingleBatch = async (
    model: string,
    batchCount: number
  ): Promise<QuestionForm[]> => {
    const batchPrompt = `[Request ID: ${crypto.randomUUID()}]
[Random Seed: ${Math.floor(Math.random() * 1000000)}]
Generate exactly ${batchCount} questions on the topic: "${input.topic}".
Difficulty: ${input.difficulty}. Each question carries 1 mark.
${typeInstruction}
Ensure all questions are entirely distinct, unique, use creative scenarios, and are not reused from any prior generation.

EXISTING TAGS (Use these exactly if they fit):
${existingTagsStr}`

    const streamRes = await ai.models.generateContentStream({
      model,
      contents: batchPrompt,
      config: {
        systemInstruction: systemPrompt,
        // Slight temperature jitter per batch for diversity across parallel requests
        temperature: 0.25 + Math.random() * 0.15,
        maxOutputTokens: 14000,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  question_type: { type: "string", enum: ["single_correct", "multiple_correct"] },
                  marks: { type: "integer" },
                  explanation: { type: "string" },
                  tag_names: {
                    type: "array",
                    items: { type: "string" }
                  },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        option_text: { type: "string" },
                        is_correct: { type: "boolean" }
                      },
                      required: ["option_text", "is_correct"]
                    }
                  }
                },
                required: ["question_text", "question_type", "marks", "explanation", "tag_names", "options"]
              }
            }
          },
          required: ["questions"]
        }
      }
    })

    let raw = ""
    for await (const chunk of streamRes) {
      raw += chunk.text ?? ""
    }

    if (!raw) throw new Error("Empty response from AI.")

    const text = stripCodeFences(raw)
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch (parseErr) {
      console.error("[generateQuestionsAction] Failed to parse AI JSON:", text)
      throw new Error("The AI returned an invalid format. Retrying with another model...")
    }

    const rawList: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : []

    const questions = sanitizeQuestions(rawList, marksDefault)
    if (questions.length === 0) {
      throw new Error("No valid questions returned by the AI.")
    }
    return questions
  }

  const attemptWithModel = async (
    model: string
  ): Promise<GenerateQuestionsResult> => {
    const BATCH_SIZE = 15
    const MAX_CONCURRENCY = 4
    const STAGGER_MS = 300

    if (count <= BATCH_SIZE) {
      // Small request — single batch, no splitting needed, with retry
      const questions = await withRetry(() => executeSingleBatch(model, count))
      return { questions, generatedWith: model }
    }

    // Split total into chunks of at most BATCH_SIZE, then fire them in waves of MAX_CONCURRENCY
    const chunks: number[] = []
    let remaining = count
    while (remaining > 0) {
      const chunkSize = Math.min(BATCH_SIZE, remaining)
      chunks.push(chunkSize)
      remaining -= chunkSize
    }

    // Launch chunks in waves with stagger to avoid hammering the API
    // Each individual batch also retries up to 2× on transient failure before failing the wave
    const allResults: QuestionForm[][] = []
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENCY) {
      const wave = chunks.slice(i, i + MAX_CONCURRENCY)
      const wavePromises = wave.map((chunkSize, waveIdx) =>
        new Promise<QuestionForm[]>((resolve, reject) => {
          setTimeout(() => {
            withRetry(() => executeSingleBatch(model, chunkSize)).then(resolve).catch(reject)
          }, waveIdx * STAGGER_MS)
        })
      )
      const waveResults = await Promise.all(wavePromises)
      allResults.push(...waveResults)
    }

    // Deduplicate across batches by question_text (trim + lowercase)
    const seen = new Set<string>()
    const combined = allResults.flat().filter((q) => {
      const key = q.question_text.trim().toLowerCase().slice(0, 120)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return { questions: combined, generatedWith: model }
  }

  let lastError: unknown

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await attemptWithModel(model)
    } catch (err) {
      lastError = err
      console.warn(`[generateQuestionsAction] Model ${model} failed, advancing fallback chain…`)
      if (isRetryableOnNextModel(err)) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  console.error("[generateQuestionsAction] All models exhausted.", lastError)

  return {
    error: lastError instanceof Error
      ? `AI generation failed: ${lastError.message}`
      : "Failed to generate questions. Please try again."
  }
}


