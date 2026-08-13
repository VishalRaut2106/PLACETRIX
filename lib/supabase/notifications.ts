import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { CreateNotificationInput, NotificationItem, NotificationFilter } from "@/types/notifications"

/**
 * Creates an in-app notification for a specific user.
 * Uses the admin client to guarantee delivery from server actions, background tasks, or webhooks.
 */
export async function createNotification(input: CreateNotificationInput): Promise<{ success: boolean; data?: NotificationItem; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: input.userId,
        title: input.title,
        message: input.message,
        link: input.link || null,
        metadata: input.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error("[NOTIFICATIONS] Failed to create notification:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as NotificationItem }
  } catch (err: any) {
    console.error("[NOTIFICATIONS] Exception in createNotification:", err)
    return { success: false, error: err.message || "Unknown error creating notification" }
  }
}

/**
 * Broadcasts a notification to multiple users simultaneously in a single batch insert.
 */
export async function broadcastNotification({
  userIds,
  title,
  message,
  link = null,
  metadata = {},
}: {
  userIds: string[]
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, any>
}): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!userIds || userIds.length === 0) {
    return { success: true, count: 0 }
  }

  try {
    const supabase = createAdminClient()
    const rows = userIds.map((userId) => ({
      user_id: userId,
      title,
      message,
      link,
      metadata,
    }))

    const { error, count } = await (supabase as any)
      .from("notifications")
      .insert(rows)

    if (error) {
      console.error("[NOTIFICATIONS] Failed to broadcast notifications:", error)
      return { success: false, error: error.message }
    }

    return { success: true, count: count ?? rows.length }
  } catch (err: any) {
    console.error("[NOTIFICATIONS] Exception in broadcastNotification:", err)
    return { success: false, error: err.message || "Unknown error broadcasting notifications" }
  }
}

/**
 * Fetches notifications for the currently authenticated session user.
 */
export async function getUserNotifications(options?: {
  limit?: number
  offset?: number
  filter?: NotificationFilter
}): Promise<{ data: NotificationItem[]; totalCount: number; unreadCount: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: [], totalCount: 0, unreadCount: 0 }
    }

    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0
    const filter = options?.filter ?? "all"

    let query = (supabase as any)
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (filter === "unread") {
      query = query.eq("is_read", false)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[NOTIFICATIONS] Error fetching notifications:", error)
      return { data: [], totalCount: 0, unreadCount: 0 }
    }

    // Also get unread count
    const { count: unreadCount } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    return {
      data: (data || []) as NotificationItem[],
      totalCount: count ?? 0,
      unreadCount: unreadCount ?? 0,
    }
  } catch (err) {
    console.error("[NOTIFICATIONS] Error in getUserNotifications:", err)
    return { data: [], totalCount: 0, unreadCount: 0 }
  }
}
