"use server";

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { createClient } from "@/lib/supabase/server";

// We need an admin client to fetch/update tickets for guests via URL (bypassing RLS)
function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

export async function createTicketAction(data: { title: string; description: string; email: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const adminSupabase = createAdminClient();

  const { data: ticket, error } = await adminSupabase
    .from("tickets")
    .insert({
      title: data.title,
      description: data.description,
      email: data.email,
      user_id: userId || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return ticket;
}

export async function getTicketAction(ticketId: string) {
  const adminSupabase = createAdminClient();

  const { data: ticket, error: ticketError } = await adminSupabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return null;
  }

  const { data: messages, error: messagesError } = await adminSupabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  return { ticket, messages };
}

export async function addTicketMessageAction(ticketId: string, message: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const adminSupabase = createAdminClient();

  // Verify the ticket exists
  const { data: ticket, error: ticketError } = await adminSupabase
    .from("tickets")
    .select("id")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    throw new Error("Ticket not found");
  }

  const { error } = await adminSupabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      message,
      sender_type: "user",
      user_id: userId || null,
    });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function validateTicketAction(ticketInput: string) {
  const adminSupabase = createAdminClient();
  const input = ticketInput.trim();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

  const query = adminSupabase.from("tickets").select("id").limit(1);
  if (isUuid) {
    query.eq("id", input);
  } else {
    query.eq("ticket_number", input);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error("Invalid Ticket ID or Number. Please check and try again.");
  }

  return data.id;
}
