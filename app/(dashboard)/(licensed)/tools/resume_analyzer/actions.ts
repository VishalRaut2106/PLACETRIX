"use server"

import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/supabase/profile"
import { GoogleGenAI } from "@google/genai"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface SectionScore {
  name: string
  score: number
  feedback: string
  /** Actionable improvement tip specific to this resume */
  suggestion: string
  /** Concrete before/after rewrite example */
  rewriteExample?: {
    before: string
    after: string
  }
}

export interface KeywordItem {
  keyword: string
  /** How many times it appears in the resume */
  count: number
  /** Is it a high-value industry keyword for this role? */
  important: boolean
}

export interface QuickWin {
  title: string
  impact: "High" | "Medium" | "Low"
  action: string
  /** Estimated time to implement, e.g. "5 min", "15 min", "30 min" */
  estimatedTime: string
}

export interface Verdict {
  /** One-line punchy headline, e.g. "Strong technical resume held back by weak quantification" */
  headline: string
  /** 2-3 sentence narrative summary */
  summary: string
  /** The single most impactful thing to fix right now */
  topPriority: string
}

export interface AnalysisResult {
  overallScore: number
  atsScore: number
  keywordMatchRate: number
  verdict: Verdict
  /** Detected industry/domain, e.g. "Software Engineering", "Marketing", "Finance" */
  detectedIndustry: string
  /** Inferred experience level */
  experienceLevel: "Entry" | "Mid" | "Senior"
  sections: SectionScore[]
  strengths: string[]
  weaknesses: string[]
  /** Keyed by weakness text — specific fix suggestion */
  suggestions: Record<string, string>
  quickWins: QuickWin[]
  keywords: KeywordItem[]
  suggestedKeywords: string[]
  jdMatchScore?: number
  missingSkills?: string[]
  detectedSkills?: string[]
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
// Main server action
// ─────────────────────────────────────────────

export async function analyzeResumeAction(formData: FormData): Promise<AnalysisResult> {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("AI analysis is not configured. GEMINI_API_KEY is missing.")

  const file = formData.get("file") as File | null
  const jobDescription = (formData.get("jobDescription") as string) || ""

  if (!file) throw new Error("No file provided.")

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PDF and DOCX files are supported.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be under 5 MB.")
  }

  // Extract text
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let resumeText: string
  if (file.type === "application/pdf") {
    resumeText = await extractPdfText(buffer)
  } else {
    resumeText = await extractDocxText(buffer)
  }

  if (!resumeText.trim())
    throw new Error("Could not extract text from the file. Please try a different file.")

  const truncatedText = resumeText.slice(0, 8000)
  const hasJD = jobDescription.trim().length > 20

  const ai = new GoogleGenAI({ apiKey })

  const systemPrompt = `You are a world-class resume strategist with 15+ years at FAANG companies. You combine ATS expertise with hiring-manager psychology.

VALIDATION: A valid resume must contain at least TWO of: contact info, work experience, education, skills, or projects. If NOT a resume, return all scores as 0 and verdict.headline as "INVALID_RESUME".

SCORING (be strict):
0-30=Critical 31-50=Below average 51-65=Average 66-80=Good 81-90=Very strong 91-100=Exceptional
Most resumes score 45-75. A decent but generic resume is 55, not 75.

RULES:
- All feedback must reference actual content from THIS resume
- Rewrite examples must use actual text from the resume
- Strengths must cite specific evidence
- Weaknesses must pinpoint exact problems
- Quick wins must be immediately actionable

SECTION ANALYSIS GUIDE (score each 0-100):
1. Contact & Header: name, email, phone, LinkedIn, GitHub present? ATS-parseable?
2. Summary/Objective: specific to role? highlights experience, skills, value prop?
3. Work Experience: action verbs? quantified results (%, $, #)? impact stories?
4. Projects: tech stack, role, outcomes listed? critical for juniors
5. Skills & Technologies: organized by category? relevant? no outdated skills?
6. Education & Certifications: degree, GPA if >3.5, certs, relevant coursework?
7. ATS Compatibility: parseable format? no tables/columns/images breaking parsing?
8. Language & Tone: professional? consistent tenses? no passive voice overuse?

Output ONLY a single raw JSON object. No markdown, no code fences, no extra text.`

  const userPrompt = `Analyze this resume and return a JSON object with this exact structure. All string values must reference actual content from the resume.

{
  "overallScore": 0,
  "atsScore": 0,
  "keywordMatchRate": 0,
  "verdict": {
    "headline": "One punchy sentence: biggest strength vs biggest gap",
    "summary": "2-3 sentences about what works, what doesn't, overall trajectory",
    "topPriority": "Single most impactful change to make right now"
  },
  "detectedIndustry": "e.g. Software Engineering",
  "experienceLevel": "Entry or Mid or Senior",
  "sections": [
    {"name": "Contact & Header", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "Summary / Objective", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "Work Experience", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "Projects", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "Skills & Technologies", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "Education & Certifications", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "ATS Compatibility", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}},
    {"name": "Language & Tone", "score": 0, "feedback": "...", "suggestion": "...", "rewriteExample": {"before": "actual text", "after": "improved text"}}
  ],
  "strengths": ["strength citing actual content", "strength 2", "strength 3"],
  "weaknesses": ["weakness pinpointing exact content", "weakness 2", "weakness 3"],
  "suggestionsList": [
    {"weakness": "weakness text exactly", "suggestion": "2-3 sentence fix with example"}
  ],
  "quickWins": [
    {"title": "short title", "impact": "High", "action": "specific instruction referencing resume", "estimatedTime": "5 min"},
    {"title": "title", "impact": "High", "action": "instruction", "estimatedTime": "10 min"},
    {"title": "title", "impact": "Medium", "action": "instruction", "estimatedTime": "15 min"}
  ],
  "keywords": [
    {"keyword": "found keyword", "count": 1, "important": true}
  ],
  "suggestedKeywords": ["missing keyword 1", "missing keyword 2"],
  "detectedSkills": ["skill1", "skill2"]${
    hasJD
      ? `,
  "jdMatchScore": 0,
  "missingSkills": ["missing skill 1"]`
      : ""
  }
}

Replace ALL placeholder values with real analysis. Return 3-4 strengths, 3-4 weaknesses with matching suggestions, 3-5 quick wins, up to 15 keywords, up to 10 suggestedKeywords, up to 12 detectedSkills.

RESUME TEXT:
${truncatedText}${
  hasJD
    ? `

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}`
    : ""
}`

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 5000,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          overallScore: { type: "integer" },
          atsScore: { type: "integer" },
          keywordMatchRate: { type: "integer" },
          verdict: {
            type: "object",
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              topPriority: { type: "string" }
            },
            required: ["headline", "summary", "topPriority"]
          },
          detectedIndustry: { type: "string" },
          experienceLevel: { type: "string", enum: ["Entry", "Mid", "Senior"] },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                score: { type: "integer" },
                feedback: { type: "string" },
                suggestion: { type: "string" },
                rewriteExample: {
                  type: "object",
                  properties: {
                    before: { type: "string" },
                    after: { type: "string" }
                  },
                  required: ["before", "after"]
                }
              },
              required: ["name", "score", "feedback", "suggestion"]
            }
          },
          strengths: {
            type: "array",
            items: { type: "string" }
          },
          weaknesses: {
            type: "array",
            items: { type: "string" }
          },
          suggestionsList: {
            type: "array",
            items: {
              type: "object",
              properties: {
                weakness: { type: "string" },
                suggestion: { type: "string" }
              },
              required: ["weakness", "suggestion"]
            }
          },
          quickWins: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                impact: { type: "string", enum: ["High", "Medium", "Low"] },
                action: { type: "string" },
                estimatedTime: { type: "string" }
              },
              required: ["title", "impact", "action", "estimatedTime"]
            }
          },
          keywords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                count: { type: "integer" },
                important: { type: "boolean" }
              },
              required: ["keyword", "count", "important"]
            }
          },
          suggestedKeywords: {
            type: "array",
            items: { type: "string" }
          },
          detectedSkills: {
            type: "array",
            items: { type: "string" }
          },
          jdMatchScore: { type: "integer" },
          missingSkills: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: [
          "overallScore",
          "atsScore",
          "keywordMatchRate",
          "verdict",
          "detectedIndustry",
          "experienceLevel",
          "sections",
          "strengths",
          "weaknesses",
          "suggestionsList",
          "quickWins",
          "keywords",
          "suggestedKeywords",
          "detectedSkills"
        ]
      }
    }
  })

  const content = response.text ?? ""

  let parsed: Omit<AnalysisResult, "fileName" | "analyzedAt">
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found in AI response")
    const rawParsed = JSON.parse(jsonMatch[0])
    
    // Map suggestionsList back to suggestions Record<string, string>
    const suggestions: Record<string, string> = {}
    if (Array.isArray(rawParsed.suggestionsList)) {
      for (const item of rawParsed.suggestionsList) {
        if (item && typeof item === "object" && item.weakness) {
          suggestions[item.weakness] = item.suggestion || ""
        }
      }
    }
    
    parsed = {
      ...rawParsed,
      suggestions
    }
    delete (parsed as any).suggestionsList
  } catch {
    throw new Error("AI returned an invalid response. Please try again.")
  }

  // Handle invalid resume detection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawVerdict = parsed.verdict as any
  const verdictHeadline = typeof rawVerdict === "object" ? rawVerdict?.headline : rawVerdict
  if (verdictHeadline === "INVALID_RESUME" || (parsed.overallScore === 0 && parsed.atsScore === 0)) {
    throw new Error("The uploaded file does not appear to be a professional resume or CV. Please upload a valid resume containing typical sections like education, experience, or skills.")
  }

  // Normalize verdict to structured object if model returned a string
  if (typeof rawVerdict === "string") {
    parsed.verdict = {
      headline: rawVerdict.split(".")[0] || rawVerdict,
      summary: rawVerdict,
      topPriority: "Review the detailed section breakdown below for specific improvement areas.",
    }
  }

  return {
    ...parsed,
    fileName: file.name,
    analyzedAt: new Date().toISOString(),
  }
}
