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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ExportFolderParticipantsModalProps {
  folderId: string
  folderName: string
  instituteId: string
  trigger?: React.ReactNode
}

const BASE_FIELDS = [
  { id: "srNo", label: "Sr. No." },
  { id: "name", label: "Candidate Name" },
  { id: "email", label: "Email Address" },
  { id: "branch", label: "Branch / Course" },
  { id: "passoutYear", label: "Passout Year" },
  { id: "totalTests", label: "Total Tests in Folder" },
  { id: "testsAttempted", label: "Tests Attempted" },
  { id: "avgPercentage", label: "Average Percentage" },
  { id: "totalScore", label: "Total Score (Across Tests)" },
]

export function ExportFolderParticipantsModal({ folderId, folderName, instituteId, trigger }: ExportFolderParticipantsModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(BASE_FIELDS.map((f) => f.id))
  
  const [includeIndividualTests, setIncludeIndividualTests] = useState(true)
  const [sortBy, setSortBy] = useState("name_asc")
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
      const totalFolderTestsCount = tests.length
      
      // 2. Fetch all test attempts for these tests
      const { data: attempts, error: attemptsErr } = await (supabase as any)
        .from("test_attempts")
        .select(`
          id, candidate_id, test_id, status, score, total_marks, percentage, active_time_taken, total_time_taken, started_at, submitted_at
        `)
        .in("test_id", testIds)
        .not("started_at", "is", null)

      if (attemptsErr) throw attemptsErr

      // 3. Find which cohorts are assigned to these tests
      const { data: testCohorts, error: testCohortsErr } = await (supabase as any)
        .from("test_cohorts")
        .select("cohort_id")
        .in("test_id", testIds)
        
      if (testCohortsErr) throw testCohortsErr
      
      const cohortIds = Array.from(new Set((testCohorts || []).map((tc: any) => tc.cohort_id)))
      
      // 4. Find which students are in these cohorts
      let assignedStudentIds: string[] = []
      if (cohortIds.length > 0) {
        const { data: cohortStudents, error: cohortStudentsErr } = await (supabase as any)
          .from("cohort_students")
          .select("student_id")
          .in("cohort_id", cohortIds)
          
        if (cohortStudentsErr) throw cohortStudentsErr
        assignedStudentIds = (cohortStudents || []).map((cs: any) => cs.student_id)
      }
      
      // 5. Build set of relevant student IDs (assigned + anyone who attempted)
      const relevantStudentIds = new Set<string>([
        ...assignedStudentIds,
        ...(attempts || []).map((a: any) => a.candidate_id).filter(Boolean)
      ])

      // 6. Fetch ALL candidate profiles for the institute and filter
      const { data: allCandidates, error: candErr } = await (supabase as any)
        .from("profiles")
        .select(`
          id, full_name, email,
          candidate_academic_details(passout_year, course:institute_courses(course_name))
        `)
        .eq("institute_id", instituteId)
        .eq("account_type", "institute_candidate")

      if (candErr) throw candErr
      
      const relevantCandidates = (allCandidates || []).filter((c: any) => relevantStudentIds.has(c.id))

      if (relevantCandidates.length === 0) {
        toast.error("No relevant candidate data found to export.")
        setIsExporting(false)
        return
      }

      // 7. Initialize student map with RELEVANT candidates
      const studentMap = new Map<string, any>()
      
      relevantCandidates.forEach((c: any) => {
        const cad = Array.isArray(c.candidate_academic_details)
          ? c.candidate_academic_details[0]
          : c.candidate_academic_details
        const courseName = Array.isArray(cad?.course)
          ? cad?.course[0]?.course_name
          : cad?.course?.course_name

        studentMap.set(c.id, {
          candidate_id: c.id,
          student_name: c.full_name ?? "Unknown",
          student_email: c.email ?? "Unknown",
          branch: courseName ?? null,
          passout_year: cad?.passout_year ?? null,
          tests_attempted: 0,
          total_score: 0,
          total_percentage_sum: 0,
          total_time_spent: 0,
          test_scores: {}
        })
      })

      // 8. Aggregate attempts into student map
      ;(attempts || []).forEach((a: any) => {
        const cId = a.candidate_id
        if (!cId || !studentMap.has(cId)) return

        const s = studentMap.get(cId)
        s.tests_attempted += 1
        s.total_score += a.score ?? 0
        s.total_percentage_sum += a.percentage ?? 0
        
        const timeSpent = a.total_time_taken ?? (a.submitted_at && a.started_at ? Math.max(0, Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)) : 0)
        s.total_time_spent += timeSpent

        s.test_scores[a.test_id] = a.percentage != null ? `${a.percentage}%` : (a.score != null ? a.score : "Attempted")
      })

      const allStudents = Array.from(studentMap.values())
      
      // Sort students based on selected option
      allStudents.sort((a, b) => {
        switch (sortBy) {
          case "name_asc":
            return a.student_name.localeCompare(b.student_name)
          case "branch_asc":
            const branchCompare = (a.branch || "Z").localeCompare(b.branch || "Z")
            if (branchCompare !== 0) return branchCompare
            return a.student_name.localeCompare(b.student_name)
          case "score_desc":
            return b.total_score - a.total_score
          case "avg_desc":
            const aAvg = a.tests_attempted > 0 ? a.total_percentage_sum / a.tests_attempted : 0
            const bAvg = b.tests_attempted > 0 ? b.total_percentage_sum / b.tests_attempted : 0
            return bAvg - aAvg
          case "attempts_desc":
            return b.tests_attempted - a.tests_attempted
          default:
            return a.student_name.localeCompare(b.student_name)
        }
      })

      // 6. Build Excel rows
      const exportData = allStudents.map((s: any, index: number) => {
        const row: any = {}
        if (selectedFields.includes("srNo")) row["Sr. No."] = index + 1
        if (selectedFields.includes("name")) row["Candidate Name"] = s.student_name
        if (selectedFields.includes("email")) row["Email Address"] = s.student_email
        if (selectedFields.includes("branch")) row["Branch / Course"] = s.branch || "N/A"
        if (selectedFields.includes("passoutYear")) row["Passout Year"] = s.passout_year || "N/A"
        
        if (selectedFields.includes("totalTests")) row["Total Tests in Folder"] = totalFolderTestsCount
        if (selectedFields.includes("testsAttempted")) row["Tests Attempted"] = s.tests_attempted
        
        if (selectedFields.includes("avgPercentage")) row["Average Percentage"] = s.tests_attempted > 0 ? `${(s.total_percentage_sum / s.tests_attempted).toFixed(2)}%` : "0%"
        if (selectedFields.includes("totalScore")) row["Total Score"] = s.total_score

        if (includeIndividualTests) {
          tests.forEach((t: any) => {
            row[t.title] = s.test_scores[t.id] ?? "Did not attempt"
          })
        }

        return row
      })
      
      if (exportData.length === 0) {
          toast.error("No candidate data found to export.")
          setIsExporting(false)
          return
      }

      // 7. Generate Excel
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
          <div className="space-y-2 mb-6">
            <Label>Sort Rows By</Label>
            <Select value={sortBy} onValueChange={setSortBy} disabled={isExporting}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sorting option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Candidate Name (A-Z)</SelectItem>
                <SelectItem value="branch_asc">Department / Branch (A-Z)</SelectItem>
                <SelectItem value="score_desc">Total Score (High to Low)</SelectItem>
                <SelectItem value="avg_desc">Average Percentage (High to Low)</SelectItem>
                <SelectItem value="attempts_desc">Tests Attempted (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
