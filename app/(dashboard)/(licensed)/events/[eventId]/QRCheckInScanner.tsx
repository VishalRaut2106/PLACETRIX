"use client"

import React, { useState, useTransition, useCallback } from "react"
import dynamic from "next/dynamic"

const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner), {
  ssr: false,
})
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Loader2 } from "lucide-react"
import { markAttendanceAction } from "../actions"

interface QRCheckInScannerProps {
  onCheckIn: (ticketId: string) => void
  tickets: { id: string; attendance_status: string; candidate_name?: string }[]
}

export function QRCheckInScanner({ onCheckIn, tickets }: QRCheckInScannerProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Prevent scanning the same QR code multiple times continuously
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [lastCheckedInName, setLastCheckedInName] = useState<string | null>(null)

  const handleScan = useCallback(
    (results: { rawValue: string }[]) => {
      if (results.length === 0) return
      const ticketId = results[0].rawValue

      // If we are currently checking in a ticket or we just scanned this one, ignore.
      if (isPending || ticketId === lastScanned) return

      setLastScanned(ticketId)
      
      const ticket = tickets.find((t) => t.id === ticketId)
      if (!ticket) {
        toast.error("Invalid QR code: Ticket not found.")
        setTimeout(() => setLastScanned(null), 2000)
        return
      }

      if (ticket.attendance_status === "Present") {
        toast.error(`${ticket.candidate_name || 'Attendee'} is already checked in!`)
        setTimeout(() => setLastScanned(null), 2000)
        return
      }

      // Instantly provide feedback and keep scanner open for next scan
      const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU")
      audio.play().catch(() => {})
      
      toast.success(`${ticket.candidate_name || 'Attendee'} checked in!`)
      setLastCheckedInName(ticket.candidate_name || "Unknown Attendee")
      onCheckIn(ticketId)
      
      // Allow the next ticket to be scanned after 2 seconds
      setTimeout(() => setLastScanned(null), 2000)

      // Perform the DB update in the background
      startTransition(async () => {
        try {
          await markAttendanceAction(ticketId)
        } catch (err: any) {
          toast.error(err.message || "Failed to check in on server.")
        }
      })
    },
    [isPending, lastScanned, onCheckIn]
  )

  const handleError = useCallback((error: unknown) => {
    // Ignore routine NotAllowedError (user denied camera) or NotFoundError (no camera)
    // The Scanner component displays a fallback message anyway.
    console.error("QR Scanner Error:", error)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) setLastScanned(null)
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-1.5 h-10 rounded-xl text-xs font-semibold">
          <QrCode className="h-4 w-4" />
          Scan QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-none bg-background">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle>Scan Ticket QR</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80">
              Point your camera at the candidate's QR ticket. They will be checked in automatically.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="relative bg-black w-full aspect-square flex items-center justify-center">
          {isPending && (
            <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center text-white gap-3 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-semibold tracking-wide animate-pulse">Processing Ticket...</p>
            </div>
          )}
          
          {open && (
            <Scanner
              onScan={handleScan}
              onError={handleError}
              components={{
                onOff: true, 
                torch: true, 
                zoom: true, 
                finder: true, 
              }}
              styles={{
                container: { width: "100%", height: "100%" },
                video: { objectFit: "cover" },
              }}
            />
          )}

          {lastCheckedInName && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-emerald-500/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-400 flex items-center justify-between animate-in slide-in-from-bottom-5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Last Checked In</span>
                <span className="font-semibold text-sm truncate">{lastCheckedInName}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
