"use client"

import React, { useState, useTransition, useCallback } from "react"
import { Scanner } from "@yudiel/react-qr-scanner"
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
}

export function QRCheckInScanner({ onCheckIn }: QRCheckInScannerProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Prevent scanning the same QR code multiple times continuously
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const handleScan = useCallback(
    (results: { rawValue: string }[]) => {
      if (results.length === 0) return
      const ticketId = results[0].rawValue

      // If we are currently checking in a ticket or we just scanned this one, ignore.
      if (isPending || ticketId === lastScanned) return

      setLastScanned(ticketId)
      
      // Instantly provide feedback and close the scanner for maximum speed
      const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU")
      audio.play().catch(() => {})
      
      toast.success("Attendee checked in successfully!")
      onCheckIn(ticketId)
      setOpen(false)
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
