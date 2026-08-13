"use client"

import * as React from "react"
import { Bell, Sparkles } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export function NotificationsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Open notifications"
        >
          <Bell className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-xl shadow-xl border-border bg-popover"
      >
        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Notifications</span>
        </div>

        {/* ── Empty State ──────────────────────────────── */}
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">You're all caught up!</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No new notifications right now.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
