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
  eventId: string
  onCheckIn: (ticketId: string) => void
  tickets: { id: string; attendance_status: string; candidate_name?: string }[]
}

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, UserCheck } from "lucide-react"

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
  video: { objectFit: "cover" as const, transform: "scaleX(-1)" },
}

export function QRCheckInScanner({ eventId, onCheckIn, tickets }: QRCheckInScannerProps) {
  const [open, setOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [showAlreadyPresentOverlay, setShowAlreadyPresentOverlay] = useState(false)
  const [showMoveQrOverlay, setShowMoveQrOverlay] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Use refs for state accessed inside the scan callback to avoid recreating the callback 
  // and restarting the camera feed.
  const isScanningBlockedRef = useRef(false)
  const lastScannedRef = useRef<string | null>(null)
  const clearLastScannedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const ticketsRef = useRef(tickets)
  const onCheckInRef = useRef(onCheckIn)

  const [lastCheckedInName, setLastCheckedInName] = useState<string | null>(null)

  // Keep refs updated
  useEffect(() => {
    ticketsRef.current = tickets
    onCheckInRef.current = onCheckIn
  }, [tickets, onCheckIn])

  const handleScan = useCallback((results: { rawValue: string }[]) => {
    if (results.length === 0) return
    const ticketId = results[0].rawValue?.trim()

    // If we are currently processing or showing an overlay, ignore all camera frames
    if (isScanningBlockedRef.current) return
    isScanningBlockedRef.current = true
    
    // If they hold the exact same QR code there immediately after scanning it
    if (ticketId === lastScannedRef.current) {
      toast.info("Please scan the next candidate's QR code.")
      setShowMoveQrOverlay(true)
      setTimeout(() => { 
        setShowMoveQrOverlay(false)
        isScanningBlockedRef.current = false
      }, 2000)
      return
    }

    lastScannedRef.current = ticketId
    if (clearLastScannedTimeoutRef.current) clearTimeout(clearLastScannedTimeoutRef.current)
    clearLastScannedTimeoutRef.current = setTimeout(() => {
      lastScannedRef.current = null
    }, 10000) // Forget after 10 seconds

    const ticket = ticketsRef.current.find((t) => t.id === ticketId)

    if (ticket && ticket.attendance_status === "Present") {
      toast.error(`${ticket.candidate_name || 'Attendee'} is already checked in!`)
      setLastCheckedInName(ticket.candidate_name || 'Unknown Attendee')
      setShowAlreadyPresentOverlay(true)
      setTimeout(() => { 
        setShowAlreadyPresentOverlay(false)
        isScanningBlockedRef.current = false
      }, 2000)
      return
    }

    // Instantly provide feedback (audio)
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU")
    audio.play().catch(() => {})
    
    // Perform DB update directly, let the server handle event mismatch or not found errors
    startTransition(async () => {
      try {
        const result = await markAttendanceAction(ticketId, eventId)
        
        // Success
        const name = result.candidateName || ticket?.candidate_name || "Unknown Attendee"
        toast.success(`${name} checked in!`)
        setLastCheckedInName(name)
        setShowSuccessOverlay(true)
        onCheckInRef.current(ticketId)
        
      } catch (err: any) {
        const msg = err.message || "Failed to check in on server."
        if (msg.includes("already been checked in") || msg.includes("already")) {
          setLastCheckedInName(ticket?.candidate_name || "Unknown Attendee")
          setShowAlreadyPresentOverlay(true)
          toast.error(`${ticket?.candidate_name || 'Attendee'} is already checked in!`)
        } else {
          toast.error(msg)
        }
      } finally {
        // Remove overlays and unblock scanner after 2 seconds
        setTimeout(() => { 
          setShowSuccessOverlay(false)
          setShowAlreadyPresentOverlay(false)
          isScanningBlockedRef.current = false
        }, 2000)
      }
    })
  }, [eventId]) // Recreate if eventId changes

  const handleError = useCallback((error: any) => {
    const msg = error?.message || error?.name || (typeof error === 'string' ? error : JSON.stringify(error) || "Unknown Error")
    if (msg.includes("NotAllowedError") || msg.includes("permission") || msg.includes("secure context")) {
      console.warn("Camera blocked by browser (expected on local HTTP).", error)
      setCameraError("Camera access blocked! On a mobile phone, browsers require HTTPS (or localhost) to use the camera. To test locally on Android Chrome, go to chrome://flags/#unsafely-treat-insecure-origin-as-secure and add this IP.")
      return
    }
    // Use warn instead of error to prevent Next.js from showing the massive red dev overlay
    console.warn("QR Scanner Issue:", error)
    setCameraError("Camera issue: " + msg)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) {
        isScanningBlockedRef.current = false
        lastScannedRef.current = null
        if (clearLastScannedTimeoutRef.current) clearTimeout(clearLastScannedTimeoutRef.current)
        setLastCheckedInName(null)
        setCameraError(null)
        setShowSuccessOverlay(false)
        setShowAlreadyPresentOverlay(false)
        setShowMoveQrOverlay(false)
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
            
            {cameraError && (
              <div className="absolute inset-0 z-10 bg-black/90 p-6 flex flex-col items-center justify-center text-center">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
                  <AlertTitle className="text-sm font-bold">Camera Blocked</AlertTitle>
                  <AlertDescription className="text-xs mt-2 leading-relaxed">
                    {cameraError}
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {showSuccessOverlay && (
              <div className="absolute inset-0 z-20 bg-emerald-500/95 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4 animate-in fade-in zoom-in duration-300">
                <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="h-14 w-14 text-white" />
                </div>
                <div className="text-center px-6">
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-100 mb-2">Marked Present</p>
                  <p className="text-3xl font-bold font-cirka">{lastCheckedInName}</p>
                </div>
              </div>
            )}

            {showAlreadyPresentOverlay && (
              <div className="absolute inset-0 z-20 bg-amber-500/95 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4 animate-in fade-in zoom-in duration-300">
                <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center">
                  <UserCheck className="h-14 w-14 text-white" />
                </div>
                <div className="text-center px-6">
                  <p className="text-sm font-bold uppercase tracking-widest text-amber-100 mb-2">Already Checked In</p>
                  <p className="text-3xl font-bold font-cirka">{lastCheckedInName}</p>
                </div>
              </div>
            )}

            {showMoveQrOverlay && (
              <div className="absolute inset-0 z-20 bg-blue-500/95 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4 animate-in fade-in zoom-in duration-300">
                <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <QrCode className="h-14 w-14 text-white" />
                </div>
                <div className="text-center px-6">
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-100 mb-2">Success</p>
                  <p className="text-2xl font-bold">Please scan the next QR code.</p>
                </div>
              </div>
            )}
            
            {open && !cameraError && (
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

