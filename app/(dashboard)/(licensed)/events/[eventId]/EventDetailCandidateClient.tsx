"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/events/[eventId]/EventDetailCandidateClient.tsx
// Candidate view: QR ticket, event info, live Q&A
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import QRCode from "qrcode"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Hourglass,
  QrCode,
  MessageSquare,
  ThumbsUp,
  Send,
  Loader2,
  Ticket,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { EventStatus, TicketStatus, AttendanceStatus } from "../types"


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}


// ─── Types ────────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string
  title: string
  description: string | null
  date: string
  venue: string
  capacity: number
  status: EventStatus
}

interface TicketInfo {
  id: string
  status: TicketStatus
  attendance_status: AttendanceStatus
}

interface Question {
  id: string
  candidate_id: string
  question: string
  upvotes_count: number
  is_answered: boolean
  created_at: string
}


// ─── QR Ticket Card ──────────────────────────────────────────────────────────

function QRTicketCard({
  ticket,
  candidateName,
  eventTitle,
}: {
  ticket: TicketInfo
  candidateName: string
  eventTitle: string
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(ticket.id, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl)
  }, [ticket.id])

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center">
          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            {ticket.status === "Confirmed" ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                <Hourglass className="mr-1 h-3 w-3" /> Waitlisted
              </Badge>
            )}
            {ticket.attendance_status === "Present" && (
              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30">
                <UserCheck className="mr-1 h-3 w-3" /> Checked In
              </Badge>
            )}
          </div>

          {/* QR Code */}
          {ticket.status === "Confirmed" && qrDataUrl && (
            <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
              <img src={qrDataUrl} alt="QR Ticket" className="w-48 h-48" />
            </div>
          )}

          {ticket.status === "Waitlisted" && (
            <div className="bg-muted rounded-xl p-8 mb-3 flex flex-col items-center gap-2">
              <Hourglass className="h-10 w-10 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Your QR ticket will appear here once you're confirmed.
              </p>
            </div>
          )}

          {/* Details */}
          <p className="font-semibold text-sm">{candidateName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{eventTitle}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono break-all">
            Ticket: {ticket.id}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}


// ─── Live Q&A Section ─────────────────────────────────────────────────────────

function LiveQASection({ eventId }: { eventId: string }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState("")
  const [isPending, startTransition] = useTransition()
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set())

  // Fetch initial questions
  useEffect(() => {
    const fetchQuestions = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from("event_questions")
        .select("*")
        .eq("event_id", eventId)
        .order("upvotes_count", { ascending: false })

      if (data) setQuestions(data)

      // Fetch my upvotes
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: upvotes } = await (supabase as any)
          .from("event_question_upvotes")
          .select("question_id")
          .eq("candidate_id", user.id)

        if (upvotes) {
          setMyUpvotes(new Set(upvotes.map((u: any) => u.question_id)))
        }
      }
    }
    fetchQuestions()
  }, [eventId])

  // Subscribe to real-time changes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`event-qa-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_questions", filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [...prev, payload.new as Question])
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) =>
              prev.map((q) => (q.id === (payload.new as Question).id ? (payload.new as Question) : q))
            )
          } else if (payload.eventType === "DELETE") {
            setQuestions((prev) => prev.filter((q) => q.id !== (payload.old as any).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const handleSubmitQuestion = () => {
    if (!newQuestion.trim()) return

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to ask a question.")
        return
      }

      const { error } = await (supabase as any)
        .from("event_questions")
        .insert({
          event_id: eventId,
          candidate_id: user.id,
          question: newQuestion.trim(),
        })

      if (error) {
        toast.error(error.message)
      } else {
        setNewQuestion("")
        toast.success("Question submitted!")
      }
    })
  }

  const handleUpvote = async (questionId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hasUpvoted = myUpvotes.has(questionId)

    if (hasUpvoted) {
      // Remove upvote
      await (supabase as any)
        .from("event_question_upvotes")
        .delete()
        .eq("question_id", questionId)
        .eq("candidate_id", user.id)

      // Decrement count
      const q = questions.find((q) => q.id === questionId)
      if (q) {
        await (supabase as any)
          .from("event_questions")
          .update({ upvotes_count: Math.max(0, q.upvotes_count - 1) })
          .eq("id", questionId)
      }

      setMyUpvotes((prev) => {
        const next = new Set(prev)
        next.delete(questionId)
        return next
      })
    } else {
      // Add upvote
      await (supabase as any)
        .from("event_question_upvotes")
        .insert({ question_id: questionId, candidate_id: user.id })

      // Increment count
      const q = questions.find((q) => q.id === questionId)
      if (q) {
        await (supabase as any)
          .from("event_questions")
          .update({ upvotes_count: q.upvotes_count + 1 })
          .eq("id", questionId)
      }

      setMyUpvotes((prev) => new Set(prev).add(questionId))
    }
  }

  const sortedQuestions = [...questions].sort((a, b) => b.upvotes_count - a.upvotes_count)

  return (
    <Card id="qa">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Live Q&A
        </CardTitle>
        <CardDescription>
          Ask questions and upvote the ones you want answered most.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Submit Question */}
        <div className="flex gap-2 mb-4">
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question..."
            onKeyDown={(e) => e.key === "Enter" && handleSubmitQuestion()}
            className="flex-1"
          />
          <Button onClick={handleSubmitQuestion} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Questions List */}
        <div className="space-y-2">
          {sortedQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No questions yet. Be the first to ask!
            </div>
          ) : (
            sortedQuestions.map((q) => (
              <div
                key={q.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  q.is_answered && "bg-emerald-500/5 border-emerald-500/20"
                )}
              >
                {/* Upvote */}
                <button
                  onClick={() => handleUpvote(q.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 min-w-[40px] pt-0.5 transition-colors",
                    myUpvotes.has(q.id)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ThumbsUp className={cn("h-4 w-4", myUpvotes.has(q.id) && "fill-current")} />
                  <span className="text-xs font-medium tabular-nums">{q.upvotes_count}</span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {q.is_answered && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                        Answered
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(q.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  event: EventInfo
  ticket: TicketInfo | null
  candidateName: string
}

export function EventDetailCandidateClient({ event, ticket, candidateName }: Props) {
  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Back */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Events
      </Link>

      {/* Event Info */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground mt-3">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {formatDateTime(event.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {event.venue}
          </span>
        </div>
      </div>

      {/* Ticket */}
      {ticket ? (
        <QRTicketCard
          ticket={ticket}
          candidateName={candidateName}
          eventTitle={event.title}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Ticket className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No ticket yet</p>
            <p className="text-sm text-muted-foreground/80 mt-1">
              RSVP from the Events page to get your QR ticket.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Live Q&A */}
      <LiveQASection eventId={event.id} />
    </div>
  )
}
