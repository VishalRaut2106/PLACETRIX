import { getTicketAction } from "../../actions";
import TicketChatClient from "./TicketChatClient";
import { notFound } from "next/navigation";

export default async function TicketPage(props: { params: Promise<{ ticketId: string }> }) {
  const params = await props.params;
  
  // Validate ticketId is a UUID to prevent malformed requests
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.ticketId)) {
    return notFound();
  }

  const data = await getTicketAction(params.ticketId);
  if (!data) return notFound();

  return <TicketChatClient initialTicket={data.ticket} initialMessages={data.messages} />;
}
