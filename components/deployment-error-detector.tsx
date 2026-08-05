"use client"

import { useEffect } from "react"
import { isDeploymentError, showDeploymentErrorToast } from "@/lib/errors"

export function DeploymentErrorDetector() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isDeploymentError(event.reason)) {
        showDeploymentErrorToast()
      }
    }

    const handleError = (event: ErrorEvent) => {
      if (isDeploymentError(event.error || event.message)) {
        showDeploymentErrorToast()
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
