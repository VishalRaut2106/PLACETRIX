"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ExportFolderParticipantsModalProps {
  folderId: string
  folderName: string
  trigger?: React.ReactNode
}

const BASE_FIELDS = [
  { id: "srNo", label: "Sr. No." },
  { id: "name", label: "Candidate Name" },
  { id: "email", label: "Email Address" },
  { id: "branch", label: "Branch / Course" },
  { id: "passoutYear", label: "Passout Year" },
  { id: "testsAttempted", label: "Tests Attempted" },
  { id: "avgPercentage", label: "Average Percentage" },
  { id: "totalScore", label: "Total Score (Across Tests)" },
  { id: "totalTime", label: "Total Time Spent" },
]

export function ExportFolderParticipantsModal({ folderId, folderName, trigger }: ExportFolderParticipantsModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(BASE_FIELDS.map((f) => f.id))
  
  // We don't know the exact tests yet, so we will fetch them dynamically when exporting,
  // but we can offer a master toggle to "Include Individual Test Scores".
  const [includeIndividualTests, setIncludeIndividualTests] = useState(true)
  
  const [isExporting, setIsExporting] = useState(false)

  const toggleField = (id: string) => {
    setSelectedFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const formatSeconds = (seconds: number | null) => {
    if (seconds == null || seconds <= 0) return "—"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
    return `${s}s`
  }

  const handleExport = async () => {
    if (selectedFields.length === 0 && !includeIndividualTests) {
      toast.error("Please select at least one field to export.")
      return
    }

    try {
      setIsExporting(true)
      const XLSX = await import("xlsx-js-style")
      const supabase = createClient()
      
      // 1. Fetch all tests in this folder
      const { data: tests, error: testsErr } = await (supabase as any)
        .from("tests")
        .select("id, title")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: true })

      if (testsErr) throw testsErr

      if (!tests || tests.length === 0) {
        toast.error("No tests found in this folder.")
        setIsExporting(false)
        return
      }

      const testIds = tests.map((t: any) => t.id)
      
      // 2. Fetch all test attempts for these tests
      const { data: attempts, error: attemptsErr } = await (supabase as any)
        .from("test_attempts")
        .select(`
          id, candidate_id, test_id, status, score, total_marks, percentage, active_time_taken, total_time_taken, started_at, submitted_at,
          profile:profiles!candidate_id(
            full_name, email, 
            candidate_academic_details(passout_year, course:institute_courses(course_name))
          )
        `)
        .in("test_id", testIds)
        .not("started_at", "is", null)

      if (attemptsErr) throw attemptsErr

      if (!attempts || attempts.length === 0) {
        toast.error("No test attempts found in this folder.")
        setIsExporting(false)
        return
      }

      // 3. Aggregate data per student
      const studentMap = new Map<string, any>()

      attempts.forEach((a: any) => {
        const cId = a.candidate_id
        if (!cId) return

        if (!studentMap.has(cId)) {
          const cad = Array.isArray(a.profile?.candidate_academic_details)
            ? a.profile?.candidate_academic_details[0]
            : a.profile?.candidate_academic_details
          const courseName = Array.isArray(cad?.course)
            ? cad?.course[0]?.course_name
            : cad?.course?.course_name

          studentMap.set(cId, {
            candidate_id: cId,
            student_name: a.profile?.full_name ?? "Unknown",
            student_email: a.profile?.email ?? "Unknown",
            branch: courseName ?? null,
            passout_year: cad?.passout_year ?? null,
            tests_attempted: 0,
            total_score: 0,
            total_percentage_sum: 0,
            total_time_spent: 0,
            test_scores: {} // map of test_id -> score (or percentage)
          })
        }

        const s = studentMap.get(cId)
        s.tests_attempted += 1
        s.total_score += a.score ?? 0
        s.total_percentage_sum += a.percentage ?? 0
        
        const timeSpent = a.total_time_taken ?? (a.submitted_at && a.started_at ? Math.max(0, Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)) : 0)
        s.total_time_spent += timeSpent

        s.test_scores[a.test_id] = a.percentage != null ? `${a.percentage}%` : (a.score != null ? a.score : "Attempted")
      })

      const allStudents = Array.from(studentMap.values())

      // 4. Build Excel rows
      const exportData = allStudents.map((s: any, index: number) => {
        const row: any = {}
        if (selectedFields.includes("srNo")) row["Sr. No."] = index + 1
        if (selectedFields.includes("name")) row["Candidate Name"] = s.student_name
        if (selectedFields.includes("email")) row["Email Address"] = s.student_email
        if (selectedFields.includes("branch")) row["Branch / Course"] = s.branch || "N/A"
        if (selectedFields.includes("passoutYear")) row["Passout Year"] = s.passout_year || "N/A"
        
        if (selectedFields.includes("testsAttempted")) row["Tests Attempted"] = s.tests_attempted
        if (selectedFields.includes("avgPercentage")) row["Average Percentage"] = s.tests_attempted > 0 ? `${(s.total_percentage_sum / s.tests_attempted).toFixed(2)}%` : "0%"
        if (selectedFields.includes("totalScore")) row["Total Score"] = s.total_score
        if (selectedFields.includes("totalTime")) row["Total Time Spent"] = formatSeconds(s.total_time_spent)

        if (includeIndividualTests) {
          tests.forEach((t: any) => {
            row[t.title] = s.test_scores[t.id] ?? "Did not attempt"
          })
        }

        return row
      })

      // 5. Generate Excel
      const workbook = XLSX.utils.book_new()
      const worksheet: any = {}

      const headers = Object.keys(exportData[0] || {})
      const totalCols = headers.length

      // Branch abbreviation map
      const branchAbbr: Record<string, string> = {
        "artificial intelligence and data science": "AI & DS",
        "computer engineering": "CE",
        "electronics and telecommunications engineering": "E&TC",
        "information technology": "IT",
        "master of business administration (mba)": "MBA",
        "mechanical engineering": "MECH",
      }

      function abbreviateBranch(branch: string | null | undefined): string {
        if (!branch || branch === "N/A") return branch || "N/A"
        const lower = branch.toLowerCase().trim()
        return branchAbbr[lower] ?? branch
      }

      function cellAddr(col: number, row: number) {
        return XLSX.utils.encode_cell({ c: col, r: row })
      }

      // Title row
      const titleCell = cellAddr(0, 1)
      worksheet[titleCell] = {
        v: `${folderName} - Consolidated Report`,
        t: "s",
        s: {
          font: { bold: true, sz: 14, color: { rgb: "1A1A2E" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: "EFF6FF" }, patternType: "solid" },
        },
      }
      if (!worksheet["!merges"]) worksheet["!merges"] = []
      worksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } })

      // Header row
      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E3A5F" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "FFFFFF" } },
          bottom: { style: "thin", color: { rgb: "FFFFFF" } },
          left: { style: "thin", color: { rgb: "FFFFFF" } },
          right: { style: "thin", color: { rgb: "FFFFFF" } },
        },
      }

      headers.forEach((header, colIdx) => {
        const addr = cellAddr(colIdx, 2)
        worksheet[addr] = { v: header, t: "s", s: headerStyle }
      })

      // Data rows
      const dataStyle = {
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      }

      exportData.forEach((row: any, rowIdx: number) => {
        headers.forEach((header, colIdx) => {
          let value = row[header]
          if (header === "Branch / Course") {
            value = abbreviateBranch(value)
          }
          const addr = cellAddr(colIdx, rowIdx + 3)
          const isNumber = typeof value === "number"
          worksheet[addr] = {
            v: value,
            t: isNumber ? "n" : "s",
            s: dataStyle,
          }
        })
      })

      // Sheet dimensions
      worksheet["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: exportData.length + 2, c: totalCols - 1 },
      })

      // Column widths
      const colWidths = headers.map((key) => {
        const lengths = exportData.map((row: any) => {
          let v = row[key]
          if (key === "Branch / Course") v = abbreviateBranch(v)
          return String(v ?? "").length
        })
        lengths.push(key.length)
        return { wch: Math.max(...lengths) + 4 }
      })
      worksheet["!cols"] = colWidths
      worksheet["!rows"] = [{ hpt: 10 }, { hpt: 28 }, { hpt: 22 }]

      XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidated Report")

      const safeName = folderName.replace(/[^a-zA-Z0-9]/g, "_")
      XLSX.writeFile(workbook, `${safeName}_consolidated_report.xlsx`)
      toast.success("Export successful!")
      setOpen(false)
    } catch (error: any) {
      toast.error("Export failed: " + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isExporting && setOpen(val)}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-1.5 h-10 rounded-xl text-xs font-semibold cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Export Folder Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Folder Data</DialogTitle>
          <DialogDescription>
            Generate a consolidated Excel report for all tests in <b>{folderName}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {BASE_FIELDS.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`folder-field-${field.id}`}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                  disabled={isExporting}
                />
                <label
                  htmlFor={`folder-field-${field.id}`}
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isExporting ? 'cursor-default opacity-50' : 'cursor-pointer select-none'}`}
                >
                  {field.label}
                </label>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-4 border-t border-border">
             <div className="flex items-center space-x-2">
                <Checkbox
                  id={`include-tests`}
                  checked={includeIndividualTests}
                  onCheckedChange={(c) => setIncludeIndividualTests(c as boolean)}
                  disabled={isExporting}
                />
                <label
                  htmlFor={`include-tests`}
                  className={`text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isExporting ? 'cursor-default opacity-50' : 'cursor-pointer select-none'}`}
                >
                  Include individual test scores as columns
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2 pl-6 leading-relaxed">
                If checked, the Excel file will include one column for each test in this folder, showing the student's percentage on that specific test.
              </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isExporting} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="rounded-xl gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {isExporting ? "Exporting..." : "Export Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
