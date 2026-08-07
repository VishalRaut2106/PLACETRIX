"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RotateCw, AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary Captured]:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 bg-background select-none">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            Unable to Load Page
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A network glitch or server issue occurred while loading this section. Please try again.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <Button onClick={() => reset()} className="w-full">
            <RotateCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  )
}
