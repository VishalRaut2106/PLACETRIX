export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  metadata: Record<string, any> | null
  created_at: string
}

export interface CreateNotificationInput {
  userId: string
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, any>
}

export type NotificationFilter = "all" | "unread"

