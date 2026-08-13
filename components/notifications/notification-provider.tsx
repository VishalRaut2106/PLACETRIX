"use client"

import * as React from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  fetchNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
  deleteAllNotificationsAction,
} from "@/app/actions/notifications"
import type { NotificationItem, NotificationFilter } from "@/types/notifications"
import type { UserProfile } from "@/lib/supabase/profile"
import { Bell } from "lucide-react"

const PAGE_SIZE = 5

interface NotificationContextValue {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  filter: NotificationFilter
  setFilter: (filter: NotificationFilter) => void
  loadMore: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
  refresh: () => Promise<void>
  requestBrowserPermission: () => Promise<NotificationPermission>
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  user: UserProfile | null
  children: React.ReactNode
}

export function NotificationProvider({ user, children }: NotificationProviderProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  const [totalCount, setTotalCount] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false)
  const [filter, setFilter] = React.useState<NotificationFilter>("all")

  const hasMore = notifications.length < totalCount

  // Load initial 5 notifications
  const loadNotifications = React.useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setTotalCount(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const res = await fetchNotificationsAction(filter, PAGE_SIZE, 0)
      setNotifications(res.data)
      setUnreadCount(res.unreadCount)
      setTotalCount(res.totalCount)
    } catch (err) {
      console.error("[NOTIFICATION_PROVIDER] Error loading notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, filter])

  // Load next 5 notifications on scroll
  const loadMore = React.useCallback(async () => {
    if (!user?.id || isLoadingMore || !hasMore || isLoading) return

    try {
      setIsLoadingMore(true)
      const offset = notifications.length
      const res = await fetchNotificationsAction(filter, PAGE_SIZE, offset)

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const incoming = res.data.filter((n) => !existingIds.has(n.id))
        return [...prev, ...incoming]
      })
      setTotalCount(res.totalCount)
      setUnreadCount(res.unreadCount)
    } catch (err) {
      console.error("[NOTIFICATION_PROVIDER] Error loading more notifications:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [user?.id, isLoadingMore, hasMore, isLoading, filter, notifications.length])

  React.useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Real-time Supabase subscription
  React.useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channelName = `realtime-notifications-${user.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])
          setUnreadCount((prev) => prev + 1)
          setTotalCount((prev) => prev + 1)

          // Show Toast notification
          toast(newNotif.title, {
            description: newNotif.message,
            icon: <Bell className="size-4 text-foreground animate-bounce" />,
            action: newNotif.link
              ? {
                  label: "View",
                  onClick: () => {
                    if (typeof window !== "undefined") {
                      if (newNotif.link!.startsWith("http://") || newNotif.link!.startsWith("https://")) {
                        window.open(newNotif.link!, "_blank", "noopener,noreferrer")
                      } else {
                        window.location.href = newNotif.link!
                      }
                    }
                  },
                }
              : undefined,
          })

          // Trigger native Web Desktop Notification if permitted
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            try {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: "/favicon.ico",
              })
            } catch {
              // Ignore native notification errors
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem
          setNotifications((prev) => {
            const prevItem = prev.find((n) => n.id === updated.id)
            if (prevItem && !prevItem.is_read && updated.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1))
            } else if (prevItem && prevItem.is_read && !updated.is_read) {
              setUnreadCount((c) => c + 1)
            }
            return prev.map((n) => (n.id === updated.id ? updated : n))
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id
          if (deletedId) {
            setNotifications((prev) => {
              const item = prev.find((n) => n.id === deletedId)
              if (item && !item.is_read) {
                setUnreadCount((c) => Math.max(0, c - 1))
              }
              return prev.filter((n) => n.id !== deletedId)
            })
            setTotalCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const markAsRead = React.useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) => {
      if (filter === "unread") {
        return prev.filter((n) => n.id !== id)
      }
      return prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    })
    if (filter === "unread") {
      setTotalCount((prev) => Math.max(0, prev - 1))
    }
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const res = await markNotificationAsReadAction(id)
      if (!res.success) {
        console.error("[NOTIFICATIONS] Failed to mark as read:", res.error)
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] Exception marking as read:", err)
    }
  }, [filter])

  const markAllAsRead = React.useCallback(async () => {
    // Snapshot for rollback in case of network/server error
    const prevNotifications = notifications
    const prevUnreadCount = unreadCount
    const prevTotalCount = totalCount

    // Optimistic UI update across all visible items
    if (filter === "unread") {
      setNotifications([])
      setTotalCount(0)
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))
      )
    }
    setUnreadCount(0)

    try {
      const res = await markAllNotificationsAsReadAction()
      if (!res.success) {
        // Rollback on failure
        setNotifications(prevNotifications)
        setUnreadCount(prevUnreadCount)
        setTotalCount(prevTotalCount)
        toast.error(res.error || "Failed to mark all as read")
        return
      }
      toast.success("All notifications marked as read")
    } catch (err) {
      // Rollback on exception
      setNotifications(prevNotifications)
      setUnreadCount(prevUnreadCount)
      setTotalCount(prevTotalCount)
      toast.error("Failed to mark all as read")
    }
  }, [filter, notifications, unreadCount, totalCount])

  const deleteNotification = React.useCallback(async (id: string) => {
    const itemToDelete = notifications.find((n) => n.id === id)
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))
    if (itemToDelete && !itemToDelete.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    await deleteNotificationAction(id)
  }, [notifications])

  const deleteAllNotifications = React.useCallback(async () => {
    const prevNotifications = notifications
    const prevUnreadCount = unreadCount
    const prevTotalCount = totalCount

    // Optimistic clear
    setNotifications([])
    setUnreadCount(0)
    setTotalCount(0)

    try {
      const res = await deleteAllNotificationsAction()
      if (!res.success) {
        setNotifications(prevNotifications)
        setUnreadCount(prevUnreadCount)
        setTotalCount(prevTotalCount)
        toast.error(res.error || "Failed to delete all notifications")
        return
      }
      toast.success("All notifications deleted")
    } catch {
      setNotifications(prevNotifications)
      setUnreadCount(prevUnreadCount)
      setTotalCount(prevTotalCount)
      toast.error("Failed to delete all notifications")
    }
  }, [notifications, unreadCount, totalCount])

  const requestBrowserPermission = React.useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied"
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        toast.success("Desktop notifications enabled!")
      }
      return permission
    } catch {
      return "denied"
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        filter,
        setFilter,
        loadMore,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        refresh: loadNotifications,
        requestBrowserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
