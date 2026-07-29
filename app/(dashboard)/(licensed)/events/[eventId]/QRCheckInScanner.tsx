"use client"

import React, { useState, useTransition, useCallback, useRef, useEffect } from "react"
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

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

// Extract static objects to prevent Scanner re-renders
const SCANNER_COMPONENTS = {
  audio: false,
  onOff: false, // Hides the camera switch button that was pushing the red ring left
  torch: false,
  zoom: false,
  finder: true,
}

const SCANNER_STYLES = {
  container: { width: "100%", height: "100%", margin: "0 auto" },
  video: { objectFit: "cover" as const },
}

export function QRCheckInScanner({ onCheckIn, tickets }: QRCheckInScannerProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Use refs for state accessed inside the scan callback to avoid recreating the callback 
  // and restarting the camera feed.
  const lastScannedRef = useRef<string | null>(null)
  const isPendingRef = useRef(false)
  const ticketsRef = useRef(tickets)
  const onCheckInRef = useRef(onCheckIn)

  const [lastCheckedInName, setLastCheckedInName] = useState<string | null>(null)

  // Keep refs updated
  useEffect(() => {
    ticketsRef.current = tickets
    onCheckInRef.current = onCheckIn
    isPendingRef.current = isPending
  }, [tickets, onCheckIn, isPending])

  const handleScan = useCallback((results: { rawValue: string }[]) => {
    if (results.length === 0) return
    const ticketId = results[0].rawValue

    // Check refs instead of state
    if (isPendingRef.current || ticketId === lastScannedRef.current) return

    lastScannedRef.current = ticketId
    
    const ticket = ticketsRef.current.find((t) => t.id === ticketId)
    if (!ticket) {
      toast.error("Invalid QR code: Ticket not found.")
      setTimeout(() => { lastScannedRef.current = null }, 2000)
      return
    }

    if (ticket.attendance_status === "Present") {
      toast.error(`${ticket.candidate_name || 'Attendee'} is already checked in!`)
      setTimeout(() => { lastScannedRef.current = null }, 2000)
      return
    }

    // Instantly provide feedback
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU")
    audio.play().catch(() => {})
    
    toast.success(`${ticket.candidate_name || 'Attendee'} checked in!`)
    setLastCheckedInName(ticket.candidate_name || "Unknown Attendee")
    onCheckInRef.current(ticketId)
    
    // Allow the next ticket to be scanned after 2 seconds
    setTimeout(() => { lastScannedRef.current = null }, 2000)

    // Perform DB update
    startTransition(async () => {
      try {
        await markAttendanceAction(ticketId)
      } catch (err: any) {
        toast.error(err.message || "Failed to check in on server.")
      }
    })
  }, []) // Empty dependencies = stable callback!

  const handleError = useCallback((error: unknown) => {
    const msg = String(error)
    if (msg.includes("NotAllowedError") || msg.includes("permission") || msg.includes("secure context")) {
      console.warn("Camera blocked by browser (expected on local HTTP).", error)
      return
    }
    // Use warn instead of error to prevent Next.js from showing the massive red dev overlay
    console.warn("QR Scanner Issue:", error)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) {
        lastScannedRef.current = null
        setLastCheckedInName(null)
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-1.5 h-10 rounded-xl text-xs font-semibold">
          <QrCode className="h-4 w-4" />
          Scan QR
        </Button>
      </DialogTrigger>
      {/* Standard modal sizing, not fullscreen */}
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[95vh] rounded-2xl overflow-y-auto overflow-x-hidden p-0 bg-background flex flex-col gap-0 border shadow-2xl">
        
        {/* Standard Header */}
        <div className="p-4 sm:p-5 border-b bg-muted/20 shrink-0">
          <DialogHeader className="text-left sm:text-left">
            <DialogTitle className="text-foreground text-base font-semibold">Scan QR Ticket</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Point your camera at the candidate's QR ticket.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Main Content Area */}
        <div className="flex flex-col w-full bg-muted/10">
          
          {/* Scanner Box - Forced to a perfect square to fix red ring */}
          <div className="relative bg-black w-full aspect-square flex-shrink-0 overflow-hidden shadow-inner">
            {isPending && (
              <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center text-white gap-3 backdrop-blur-sm transition-all">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-semibold tracking-wide animate-pulse">Processing...</p>
              </div>
            )}
            
            {open && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                components={SCANNER_COMPONENTS}
                styles={SCANNER_STYLES}
              />
            )}
          </div>

          {/* Results Area - Below the scanner box */}
          <div className="w-full p-4 sm:p-5 min-h-[100px] flex items-center justify-start border-t bg-background shrink-0">
            {lastCheckedInName ? (
              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm mr-2 text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1 pr-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 opacity-80 mb-0.5">
                    Successfully Checked In
                  </span>
                  <span className="font-semibold text-base text-foreground truncate block">
                    {lastCheckedInName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-start gap-3 text-muted-foreground animate-pulse p-2 text-left mr-2">
                <QrCode className="h-5 w-5 shrink-0 opacity-50" />
                <p className="text-sm">Ready to scan. Waiting for QR...</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

