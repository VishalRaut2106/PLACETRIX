"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Sparkles,
  CheckCheck,
  Trash2,
  ChevronRight,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { useNotifications } from "@/components/notifications/notification-provider"
import { startNavigationProgress } from "@/components/ui/navigation-progress"
import type { NotificationItem } from "@/types/notifications"
import { cn } from "@/lib/utils"

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSec < 45) return "just now"
    if (diffMin < 60) return `${diffMin}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return "1d"
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return "recently"
  }
}

export function NotificationsPopover() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  const viewportRef = React.useRef<HTMLDivElement>(null)
  const observerTarget = React.useRef<HTMLDivElement>(null)

  // Trigger on scroll event
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const reachedBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <= 80
      if (reachedBottom && hasMore && !isLoadingMore && !isLoading) {
        loadMore()
      }
    },
    [hasMore, isLoadingMore, isLoading, loadMore]
  )

  // Infinite scroll trigger with root attached to ScrollArea viewport
  React.useEffect(() => {
    if (!open) return

    const rootEl = viewportRef.current
    const targetEl = observerTarget.current
    if (!targetEl) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore()
        }
      },
      {
        root: rootEl || null,
        rootMargin: "60px",
        threshold: 0.1,
      }
    )

    observer.observe(targetEl)

    return () => {
      observer.disconnect()
    }
  }, [open, hasMore, isLoadingMore, isLoading, loadMore, notifications.length])

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.is_read) {
      markAsRead(notif.id).catch((err) =>
        console.error("[NOTIFICATIONS] Error marking read:", err)
      )
    }
    if (notif.link) {
      setOpen(false)
      if (notif.link.startsWith("http://") || notif.link.startsWith("https://")) {
        window.open(notif.link, "_blank", "noopener,noreferrer")
      } else {
        startNavigationProgress()
        router.push(notif.link)
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 text-muted-foreground hover:text-foreground"
          aria-label="Open notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-foreground" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[calc(100vw-24px)] sm:w-[350px] max-w-[360px] p-0 rounded-2xl overflow-hidden shadow-lg border"
      >
        {/* ── Compact Header ─────────────────────────────────── */}
        <div className="flex h-10 items-center justify-between px-3.5 border-b">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-tight text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">
                ({unreadCount})
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-[11px] font-normal text-muted-foreground hover:text-foreground gap-1"
            >
              <CheckCheck className="size-3" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* ── Content Feed ──────────────────────────────────── */}
        <ScrollArea
          className="h-72"
          viewportRef={viewportRef}
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex h-72 items-center justify-center text-xs text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-72 items-center justify-center p-4">
              <Empty className="border-none p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="size-9 rounded-full mb-1.5 bg-muted">
                    <Sparkles className="size-4 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xs font-medium text-foreground">
                    You're all caught up
                  </EmptyTitle>
                  <EmptyDescription className="text-[11px] text-muted-foreground">
                    No new notifications right now.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "group relative flex flex-col gap-1 p-3 transition-colors cursor-pointer hover:bg-muted/40",
                    !notif.is_read && "bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 pr-5">
                    <span
                      className={cn(
                        "text-xs truncate",
                        !notif.is_read
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground"
                      )}
                    >
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-normal">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pr-5">
                    {notif.message}
                  </p>

                  {notif.link && (
                    <div className="flex items-center gap-0.5 mt-0.5 text-[10px] font-medium text-muted-foreground group-hover:text-foreground hover:underline">
                      View
                      <ChevronRight className="size-2.5" />
                    </div>
                  )}

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <span className="absolute right-3 top-3.5 size-1.5 rounded-full bg-foreground" />
                  )}

                  {/* Quick Delete on hover */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                      }}
                      className="size-6 text-muted-foreground hover:text-foreground"
                      title="Delete notification"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Scroll-to-load sentinel */}
              {hasMore && (
                <div
                  ref={observerTarget}
                  className="py-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  {isLoadingMore && (
                    <>
                      <div className="size-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                      <span>Loading more...</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
