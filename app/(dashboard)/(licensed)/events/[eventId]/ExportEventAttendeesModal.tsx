"use client"

import React, { useState } from "react"
import { EventTicket } from "../types"
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
import { FileSpreadsheet } from "lucide-react"

interface ExportEventAttendeesModalProps {
  tickets: EventTicket[]
  eventName: string
  trigger?: React.ReactNode
}

const AVAILABLE_FIELDS = [
  { id: "name", label: "Candidate Name" },
  { id: "email", label: "Email Address" },
  { id: "course", label: "Course / Branch" },
  { id: "passoutYear", label: "Passout Year" },
  { id: "status", label: "RSVP Status" },
  { id: "attendance", label: "Attendance Status" },
  { id: "date", label: "Registration Date" },
]

export function ExportEventAttendeesModal({ tickets, eventName, trigger }: ExportEventAttendeesModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(AVAILABLE_FIELDS.map((f) => f.id))

  const toggleField = (id: string) => {
    setSelectedFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to export.")
      return
    }
    if (tickets.length === 0) {
      toast.error("No attendees to export.")
      return
    }

    try {
      const XLSX = await import("xlsx")
      const exportData = tickets.map((t, index) => {
        const row: any = {}
        row["Sr. No."] = index + 1
        if (selectedFields.includes("name")) row["Candidate Name"] = t.candidate_name || "Unknown"
        if (selectedFields.includes("email")) row["Email Address"] = t.candidate_email || "N/A"
        if (selectedFields.includes("course")) row["Course / Branch"] = t.candidate_course || "N/A"
        if (selectedFields.includes("passoutYear")) row["Passout Year"] = t.candidate_passout_year || "N/A"
        if (selectedFields.includes("status")) row["RSVP Status"] = t.status || "N/A"
        if (selectedFields.includes("attendance")) row["Attendance Status"] = t.attendance_status === "Present" ? "Present" : "Pending"
        if (selectedFields.includes("date")) row["Registration Date"] = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(t.created_at))
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendees")

      // Auto-fit columns
      const maxLens = Object.keys(exportData[0] || {}).map((key) => {
        const lengths = exportData.map((row: any) => String(row[key] ?? "").length)
        lengths.push(key.length)
        return { wch: Math.max(...lengths) + 3 }
      })
      worksheet["!cols"] = maxLens

      const safeName = eventName.replace(/[^a-zA-Z0-9]/g, "_")
      XLSX.writeFile(workbook, `${safeName}_attendees.xlsx`)
      toast.success("Export successful!")
      setOpen(false)
    } catch (error: any) {
      toast.error("Export failed: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-1.5 h-10 rounded-xl text-xs font-semibold cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Export to Excel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Export Attendees</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the Excel export.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_FIELDS.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`field-${field.id}`}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                />
                <label
                  htmlFor={`field-${field.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                >
                  {field.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleExport} className="rounded-xl gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export {tickets.length} Attendees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
