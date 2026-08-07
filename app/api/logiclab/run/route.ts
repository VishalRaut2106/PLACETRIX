import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCachedProblemExecutionData } from "@/app/(dashboard)/(licensed)/logiclab/actions"
import { getUserProfile } from "@/lib/supabase/profile"
import { rateLimit } from "@/lib/rate-limit"

// Whitelisted Judge0 language IDs accepted by LogicLab
const ALLOWED_LANGUAGE_IDS = new Set([54, 62, 63, 71]) // C++, Java, JS, Python

// Deterministic metrics removed in favor of real Judge0 metrics.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let { source_code, language_id, stdin, problem_id, mode, custom_cases, custom_expected } = body

    // Sanitize invisible characters from copy-pasting (like non-breaking spaces) that crash C++/Java compilers
    if (source_code) {
      source_code = source_code.replace(/[\u00A0\u200B]/g, ' ')
    }

    // ── 0. AUTH + Rate limit ──
    const profile = await getUserProfile()
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // ── 0a. SECURITY: Validate language_id ──
    if (!ALLOWED_LANGUAGE_IDS.has(Number(language_id))) {
      return NextResponse.json(
        { success: false, error: `Unsupported language_id: ${language_id}. Allowed: ${[...ALLOWED_LANGUAGE_IDS].join(", ")}.` },
        { status: 400 }
      )
    }

    // ── 0b. RATE LIMIT: 30 runs per minute per user (more lenient than submit) ──
    const rl = rateLimit("run", profile.id, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Please wait ${Math.ceil(rl.resetInMs / 1000)}s before running again.` },
        { status: 429 }
      )
    }

    // ── 1. SECURITY: Payload Size Check ──
    if (!source_code || source_code.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Code payload exceeds maximum size limit of 50KB." },
        { status: 400 }
      )
    }

    // ── 2. SECURITY: Basic Static Analysis / Blocklist ──
    const blocklistRegex = /(sys\.exit|os\.system|subprocess\.|exec\(|eval\(|__import__|java\.lang\.Runtime|java\.lang\.ProcessBuilder)/i
    if (blocklistRegex.test(source_code)) {
      return NextResponse.json(
        { success: false, error: "Security Exception: Blocked keyword or potentially destructive function detected in code." },
        { status: 403 }
      )
    }

    // If mode === "problem", we merge user code with the driver code
    let finalSource = source_code
    let finalStdin = stdin || ""
    let sampleTestCases: any[] = []
    let timeLimit = 2.0
    let memoryLimit = 256000
    let lineOffset = 0

    if (mode === "problem" && problem_id) {
      const problemData = await getCachedProblemExecutionData(problem_id) as any

      if (!problemData) {
        throw new Error("Problem not found or could not be loaded from cache.")
      }

      timeLimit = Math.min(problemData.time_limit || 2.0, 15.0)
      memoryLimit = Math.min((problemData.memory_limit || 256) * 1024, 512000)

      let driverCodes: any = problemData.driver_codes || {}
      if (typeof driverCodes === "string") {
        try {
          driverCodes = JSON.parse(driverCodes)
        } catch (e) {
          driverCodes = {}
        }
      }
      const langKey = String(language_id)
      const driverCode = driverCodes[langKey] || ""

      if (!driverCode) {
        return NextResponse.json({ success: false, error: `Execution engine error: Driver code missing for language ${langKey}. Please recreate this problem.` }, { status: 400 })
      }

      if (langKey === "62") { // Java
        const lines = driverCode.split("\n")
        const imports = lines.filter((line: string) => line.trim().startsWith("import "))
        const nonImports = lines.filter((line: string) => !line.trim().startsWith("import "))
        lineOffset = 2 + imports.length + 2
        finalSource = "import java.util.*;\nimport java.io.*;\n" + imports.join("\n") + "\n\n" + source_code + "\n\n" + nonImports.join("\n")
      } else if (langKey === "71") { // Python
        const merged = source_code + "\n\n" + driverCode
        lineOffset = 6
        finalSource = "from __future__ import annotations\nimport sys\nimport json\nimport math\nimport collections\nfrom typing import *\n" + merged
      } else if (langKey === "54") { // C++
        const lines = driverCode.split("\n")
        const includes = lines.filter((line: string) => line.trim().startsWith("#include") || line.trim().startsWith("using "))
        const nonIncludes = lines.filter((line: string) => !line.trim().startsWith("#include") && !line.trim().startsWith("using "))
        lineOffset = 16 + includes.length + 2
        finalSource = "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\n#include <limits>\n#include <numeric>\n#include <utility>\nusing namespace std;\n" + includes.join("\n") + "\n\n" + source_code + "\n\n" + nonIncludes.join("\n")
      } else {
        finalSource = source_code + "\n\n" + driverCode
      }

      // Parse test cases
      let testCases: any[] = problemData.test_cases || []
      if (typeof testCases === "string") {
        try { testCases = JSON.parse(testCases) } catch { testCases = [] }
      }
      sampleTestCases = testCases.filter((tc: any) => tc.is_sample || tc.isSample)
      if (sampleTestCases.length === 0 && testCases.length > 0) sampleTestCases = [testCases[0]]

      if (Array.isArray(custom_cases) && custom_cases.length > 0) {
        sampleTestCases = custom_cases.map((customInput, idx) => {
          const originalTc = sampleTestCases[idx] || {}
          const expected = (Array.isArray(custom_expected) && idx < custom_expected.length) ? custom_expected[idx] : undefined
          return {
            ...originalTc,
            input: customInput,
            expected_output: (expected !== undefined && expected !== "") ? expected : originalTc.expected_output,
            is_custom: idx >= sampleTestCases.length
          }
        })
      }
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
    if (!judge0Endpoint) {
      return NextResponse.json({ success: false, error: "Judge0 endpoint is not configured in environment variables." }, { status: 500 })
    }
    const submissionsUrl = `${judge0Endpoint}/submissions?wait=true&base64_encoded=true`

    const encodedSource = Buffer.from(finalSource || "").toString("base64")

    const decode = (str: string | null) => {
      if (!str) return ""
      try { return Buffer.from(str, "base64").toString("utf-8") } catch { return str }
    }

    // ── Execute Case runs ──
    if (mode === "problem" && sampleTestCases.length > 0) {
      let overallSuccess = true
      let overallStatus = { id: 3, description: "Accepted" }
      let totalTime = 0
      let maxMemory = 0
      const results: any[] = []

      // Prepare batch submissions
      const batchPayload = {
        submissions: sampleTestCases.map((tc: any) => ({
          source_code: encodedSource,
          language_id,
          stdin: Buffer.from(tc.input || "").toString("base64"),
          cpu_time_limit: timeLimit,
          memory_limit: memoryLimit
        }))
      }

      let executedResults: any[] = []

      try {
        // Step 1: Submit batch
        const batchResponse = await fetch(`${judge0Endpoint}/submissions/batch?base64_encoded=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(batchPayload),
        })

        if (!batchResponse.ok) {
          throw new Error("Failed to submit batch to Judge0")
        }

        const batchTokens = await batchResponse.json()
        if (!Array.isArray(batchTokens) || batchTokens.length !== sampleTestCases.length) {
          throw new Error("Invalid token count returned from Judge0")
        }

        const tokensStr = batchTokens.map(t => t.token).join(",")
        const batchGetUrl = `${judge0Endpoint}/submissions/batch?tokens=${tokensStr}&base64_encoded=true`

        // Step 2: Poll for results with exponential backoff (300ms → 2 000ms)
        let allDone = false
        let attempts = 0
        let finalBatchResults: any[] = []
        const MAX_POLL_MS = 30_000 // hard ceiling: 30 seconds total
        const pollStart = Date.now()

        while (!allDone && Date.now() - pollStart < MAX_POLL_MS) {
          const delay = Math.min(300 * Math.pow(1.5, attempts), 2_000)
          await new Promise(resolve => setTimeout(resolve, delay))

          try {
            const statusRes = await fetch(batchGetUrl)
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              if (statusData && Array.isArray(statusData.submissions)) {
                finalBatchResults = statusData.submissions
                allDone = finalBatchResults.every((sub: any) => sub.status && sub.status.id > 2)
              }
            }
          } catch (pollErr) {
            console.warn(`[LogicLab] Polling network drop on attempt ${attempts}, retrying...`)
          }
          attempts++
        }

        // Step 3: Format to executedResults
        executedResults = sampleTestCases.map((tc: any, i: number) => {
          const data = finalBatchResults[i]
          if (!data) {
            return { index: i + 1, tc, error: "Judge0 service timed out or dropped token." }
          }
          if (data.status?.id <= 2) {
            return { index: i + 1, tc, error: "Judge0 Timeout: Execution stuck in queue or processing too long." }
          }
          if (data.status?.id === 13) {
             return { index: i + 1, tc, error: "Internal Error in Judge0." }
          }
          return { index: i + 1, tc, data }
        })
      } catch (err: any) {
        executedResults = sampleTestCases.map((tc: any, i: number) => ({
          index: i + 1, 
          tc, 
          error: `Batch execution failed: ${err.message}`
        }))
      }
      executedResults.sort((a, b) => a.index - b.index)

      for (const execution of executedResults) {
        let { index, tc, error, data } = execution
        let consoleOutput = ""

        if (!error && data?.stdout) {
          const stdoutRaw = decode(data.stdout).trim()
          
          const errMatch = stdoutRaw.match(/@@@LOGICLAB_ERR_START@@@([\s\S]*?)@@@LOGICLAB_ERR_END@@@/)
          if (errMatch) {
            error = "Runtime Error: " + errMatch[1].trim()
            consoleOutput = stdoutRaw.replace(errMatch[0], "").trim()
          } else {
            const resMatch = stdoutRaw.match(/@@@LOGICLAB_RES_START@@@([\s\S]*?)@@@LOGICLAB_RES_END@@@/)
            if (resMatch) {
              data.stdout = Buffer.from(resMatch[1].trim()).toString("base64")
              consoleOutput = stdoutRaw.replace(resMatch[0], "").trim()
            } else {
              // Fallback for legacy driver codes that don't have delimiters
              // Legacy driver codes just console.log the JSON stringified result at the very end
              const lines = stdoutRaw.split('\n')
              if (lines.length > 0) {
                const lastLine = lines.pop() || ""
                data.stdout = Buffer.from(lastLine.trim()).toString("base64")
                consoleOutput = lines.join('\n').trim()
              } else {
                data.stdout = Buffer.from("").toString("base64")
                consoleOutput = stdoutRaw
              }
            }
          }
        }

        if (error) {
          overallSuccess = false
          overallStatus = { id: 13, description: "System Error" }
          results.push({ index, passed: false, input: tc.input, error, actual: error, expected: tc.expected_output, consoleOutput })
          continue
        }

        const stdout = decode(data.stdout).trim()
        const expectedTrimmed = (tc.expected_output || "").trim()
        const statusId = data.status?.id || 0

        let passed = false
        if (tc.is_custom && !expectedTrimmed) {
          passed = (statusId === 3) // Pass if no runtime error and no expected output provided
        } else {
          passed = (statusId === 3 && stdout === expectedTrimmed)
        }

        if (!passed) overallSuccess = false
        if (statusId !== 3 && overallStatus.id === 3) overallStatus = data.status

        const timeVal = parseFloat(data.time || "0")
        const memoryVal = parseInt(data.memory || "0", 10)
        totalTime = Math.max(totalTime, timeVal)
        maxMemory = Math.max(maxMemory, memoryVal)

        results.push({
          index,
          passed,
          input: tc.input,
          expected: expectedTrimmed,
          actual: stdout,
          stderr: decode(data.stderr),
          compile_output: decode(data.compile_output),
          message: decode(data.message),
          console_output: consoleOutput,
          status: data.status || { id: 3, description: "Accepted" },
          time: timeVal.toFixed(3),
          memory: String(memoryVal)
        })
      }

      return NextResponse.json({
        success: overallSuccess,
        status: overallStatus,
        time: totalTime.toFixed(2),
        memory: String(maxMemory),
        cases: results,
        lineOffset
      })
    } else {
      const encodedStdin = Buffer.from(finalStdin || "").toString("base64")
      let retries = 3
      let delay = 500

      while (retries > 0) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
          const response = await fetch(submissionsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              source_code: encodedSource,
              language_id,
              stdin: encodedStdin,
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          const textResponse = await response.text()
          let data
          try {
            data = JSON.parse(textResponse)
          } catch {
            return NextResponse.json({ success: false, error: "Judge0 JSON parse error" }, { status: 500 })
          }

          if (!response.ok) {
            if (response.status === 429 || response.status >= 500) {
              retries--
              if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay))
                delay *= 2
                continue
              }
            }
            return NextResponse.json({ success: false, error: data.error || response.statusText }, { status: response.status })
          }

          return NextResponse.json({
            success: true,
            stdout: decode(data.stdout),
            stderr: decode(data.stderr),
            compile_output: decode(data.compile_output),
            message: decode(data.message),
            status: data.status || { id: 3, description: "Accepted" },
            time: data.time || "0.00",
            memory: data.memory || "0",
          })
        } catch (err: any) {
          clearTimeout(timeoutId)
          retries--
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2
            continue
          }
          return NextResponse.json({ success: false, error: err.message }, { status: 500 })
        }
      }
    }
  } catch (error: any) {
    console.error("[LogicLab API Proxy] Request failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during compilation." },
      { status: 500 }
    )
  }
}
