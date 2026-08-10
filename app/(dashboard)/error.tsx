"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { AlertCircle, RotateCcw, RefreshCw } from "lucide-react"

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
    <div className="flex min-h-[50vh] w-full items-center justify-center p-4">
      <Empty className="max-w-sm border-none p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            An error occurred while rendering this section. Try resetting or reloading the page.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap items-center justify-center gap-2 w-auto mx-auto">
          <Button onClick={() => reset()} variant="default" size="sm">
            <RotateCcw data-icon="inline-start" />
            Try again
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            <RefreshCw data-icon="inline-start" />
            Reload
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

