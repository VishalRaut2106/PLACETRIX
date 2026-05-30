"use client";

import React from "react";
import { format } from "date-fns";
import { SendIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { addTicketMessageAction } from "../../actions";
import { getTicketAction } from "../../actions";

export default function TicketChatClient({
  initialTicket,
  initialMessages,
}: {
  initialTicket: any;
  initialMessages: any[];
}) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [newMessage, setNewMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await addTicketMessageAction(initialTicket.id, newMessage);
      setNewMessage("");
      // Optimistically add message or refetch
      const data = await getTicketAction(initialTicket.id);
      if (data) {
        setMessages(data.messages);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      case "in_progress": return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
      case "resolved": return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
      case "closed": return "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400";
      default: return "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400";
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black text-zinc-950 dark:text-white">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-black/80">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/help-center">
            <ArrowLeftIcon className="size-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-between min-w-0">
          <div className="flex flex-col min-w-0">
            <h1 className="truncate text-base font-semibold">{initialTicket.title}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{initialTicket.ticket_number}</p>
          </div>
          <div className={cn("ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", getStatusColor(initialTicket.status))}>
            {initialTicket.status.replace("_", " ")}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col mx-auto w-full p-4 md:p-6 gap-6">
        <Card className="p-4 md:p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="size-10 border">
              <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {initialTicket.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{initialTicket.email}</p>
              <p className="text-xs text-zinc-500">
                {format(new Date(initialTicket.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {initialTicket.description}
          </div>
        </Card>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {messages.map((msg) => {
            const isUser = msg.sender_type === "user";
            return (
              <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "")}>
                <Avatar className="size-8 border shrink-0 mt-1">
                  <AvatarFallback className={cn(isUser ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>
                    {isUser ? "U" : "S"}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
                  <div className="flex items-baseline gap-2 mx-1">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {isUser ? "You" : "Support Team"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {format(new Date(msg.created_at), "h:mm a")}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
                    isUser 
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black rounded-tr-sm" 
                      : "bg-white border border-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 rounded-tl-sm"
                  )}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="shrink-0 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto w-full relative">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[52px] w-full resize-none rounded-xl pr-14 py-3 border-zinc-300 dark:border-zinc-700 focus-visible:ring-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim() || isSubmitting}
              className="absolute right-2 bottom-2 size-9 rounded-lg"
            >
              <SendIcon className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <p className="text-center text-[10px] text-zinc-500 mt-2">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}
