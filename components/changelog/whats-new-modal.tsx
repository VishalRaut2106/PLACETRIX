"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CHANGELOG_DATA,
  LATEST_VERSION,
  STORAGE_KEY_LAST_SEEN_VERSION,
  ChangelogCategoryType,
  markChangelogAsRead
} from "@/lib/changelog"

function CategoryBadge({ type }: { type: ChangelogCategoryType }) {
  switch (type) {
    case "added":
      return <Badge variant="default" className="capitalize">Added</Badge>
    case "improved":
      return <Badge variant="secondary" className="capitalize">Improved</Badge>
    case "fixed":
      return <Badge variant="outline" className="capitalize">Fixed</Badge>
    case "security":
      return <Badge variant="destructive" className="capitalize">Security</Badge>
  }
}

export function WhatsNewModal({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const handleClose = () => {
    markChangelogAsRead()
    onOpenChange?.(false)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose()
    }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>What's New in Placetrix</DialogTitle>
            <Badge variant="secondary">v{LATEST_VERSION}</Badge>
          </div>
          <DialogDescription>
            Recent updates, features, and fixes in version {LATEST_VERSION}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="flex flex-col gap-6 py-2">
            {CHANGELOG_DATA.map((release, releaseIdx) => (
              <div key={release.version} className="flex flex-col gap-3">
                {releaseIdx > 0 && <Separator className="my-1" />}

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">v{release.version}</span>
                    <span className="text-xs text-muted-foreground">{release.date}</span>
                  </div>
                  <h4 className="text-sm font-medium text-foreground">{release.title}</h4>
                </div>

                <div className="flex flex-col gap-3">
                  {release.categories.map((cat, catIdx) => (
                    <div key={catIdx} className="flex flex-col gap-1.5">
                      <div>
                        <CategoryBadge type={cat.type} />
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {cat.items.map((item, itemIdx) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-end items-center gap-2 pt-2">
          <DialogClose asChild>
            <Button size="sm" onClick={handleClose}>
              Got it
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
