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
  ChangelogCategoryType
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

export function WhatsNewModal() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const lastSeen = localStorage.getItem(STORAGE_KEY_LAST_SEEN_VERSION)
      if (lastSeen !== LATEST_VERSION) {
        setOpen(true)
      }
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LAST_SEEN_VERSION, LATEST_VERSION)
    }
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">v{release.version}</span>
                    <span className="text-sm font-medium text-muted-foreground">{release.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>

                <div className="flex flex-col gap-3 pl-2">
                  {release.categories.map((cat, catIdx) => (
                    <div key={catIdx} className="flex flex-col gap-1.5">
                      <div>
                        <CategoryBadge type={cat.type} />
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-1">
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

        <DialogFooter className="sm:justify-end items-center gap-2 border-t pt-4">
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
