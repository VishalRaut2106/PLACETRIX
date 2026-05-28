import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CreateEventClient } from "./_components/CreateEventClient"
import {
  saveEventAction,
  publishEventAction,
  loadEventAction,
} from "../actions"

interface Props {
  params: Promise<{ eventId: string }>
}

export default async function EventEditorPage({ params }: Props) {
  const { eventId } = await params
  const supabase = await createClient()

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) redirect("/auth/login")

  // ── Account-type guard (must be institute) ──────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.sub)
    .single()

  if (profile?.account_type !== "institute") redirect("/~/events")

  // ── Load existing event data if editing ─────────────────────────────────────
  const isNew = eventId === "new"

  const initialData = isNew
    ? null
    : await loadEventAction(eventId, user.sub as string)

  // Bounce if editing an event that doesn't exist or belongs to someone else
  if (!isNew && !initialData) redirect("/~/events")

  return (
    <CreateEventClient
      eventId={isNew ? undefined : eventId}
      initialData={initialData ?? undefined}
      onSaveDraft={saveEventAction}
      onPublish={publishEventAction}
    />
  )
}
