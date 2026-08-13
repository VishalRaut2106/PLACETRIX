"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserNotifications } from "@/lib/supabase/notifications"
import type { NotificationFilter, NotificationItem } from "@/types/notifications"

export async function fetchNotificationsAction(filter: NotificationFilter = "all", limit = 30, offset = 0) {
  try {
    return await getUserNotifications({ filter, limit, offset })
  } catch (err: any) {
    console.error("[ACTIONS] fetchNotificationsAction error:", err)
    return { data: [], totalCount: 0, unreadCount: 0 }
  }
}

export async function fetchUnreadCountAction(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    if (error) {
      console.error("[ACTIONS] fetchUnreadCountAction error:", error)
      return 0
    }

    return count ?? 0
  } catch (err) {
    console.error("[ACTIONS] fetchUnreadCountAction exception:", err)
    return 0
  }
}

export async function markNotificationAsReadAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[ACTIONS] markNotificationAsReadAction error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark as read" }
  }
}

export async function markAllNotificationsAsReadAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    if (error) {
      console.error("[ACTIONS] markAllNotificationsAsReadAction error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark all as read" }
  }
}

export async function deleteNotificationAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { error } = await (supabase as any)
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[ACTIONS] deleteNotificationAction error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete notification" }
  }
}

export async function clearAllReadNotificationsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { error } = await (supabase as any)
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true)

    if (error) {
      console.error("[ACTIONS] clearAllReadNotificationsAction error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to clear read notifications" }
  }
}
