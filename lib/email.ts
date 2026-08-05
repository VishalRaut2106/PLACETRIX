import nodemailer from "nodemailer"
import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/admin"

export async function sendTicketEmail(ticketId: string): Promise<{ success: boolean; data?: any; error?: string; mock?: boolean }> {
  try {
    // 1. Initialize Supabase Admin Client
    const supabase = createAdminClient()

    // 2. Fetch the ticket with event details
    const { data: ticket, error: ticketError } = await (supabase as any)
      .from("event_tickets")
      .select(`
        id,
        status,
        candidate_id,
        event_id,
        events (
          title,
          date,
          venue,
          description,
          duration_minutes,
          speaker_name
        )
      `)
      .eq("id", ticketId)
      .maybeSingle()

    if (ticketError || !ticket) {
      console.error("Error fetching ticket for email:", ticketError)
      return { success: false, error: ticketError?.message || "Ticket not found" }
    }

    const ticketData = ticket as any

    // Fetch candidate profile details
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .eq("id", ticketData.candidate_id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error("Error fetching profile for ticket email:", profileError)
      return { success: false, error: profileError?.message || "Candidate profile not found" }
    }

    const profileData = profile as any
    const event = ticketData.events as any
    if (!event) {
      console.error("Event details not found for ticket:", ticketId)
      return { success: false, error: "Event details not found" }
    }

    const isConfirmed = ticketData.status === "Confirmed"
    
    // Generate QR Code as Data URL (base64)
    let qrCodeDataUrl: string | null = null
    if (isConfirmed) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
          width: 250,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        })
      } catch (qrErr) {
        console.error("Failed to generate QR Code for ticket email:", qrErr)
      }
    }

    // Emails are server-rendered; use a fixed, explicit timezone so the
    // displayed time is unambiguous for all recipients.
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(event.date))

    const subject = isConfirmed 
      ? `🎫 Ticket Confirmed: ${event.title}`
      : `⏳ Waitlisted: ${event.title}`

    const recipientName = profileData.full_name || `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "Attendee"

    const html = `
      <!DOCTYPE html>
      <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>${subject}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body, html { width: 100%; }
          body {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            background-color: #f5f5f5;
            font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0a0a0a;
          }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          a { text-decoration: none; }
          .wrapper { width: 100%; background-color: #f5f5f5; padding: 40px 16px; }
          .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            border: 1px solid #e0e0e0;
            overflow: hidden;
            box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.10), 0 2px 8px -1px rgba(0, 0, 0, 0.06);
          }
          .hdr { background: #0a0a0a; padding: 32px 40px 28px; text-align: center; }
          .logo-wrap { display: inline-flex; align-items: center; gap: 10px; }
          .logo-svg { width: 40px; height: auto; }
          .brand { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
          .badge {
            background: #f0f0f0;
            border-bottom: 1px solid #e0e0e0;
            padding: 12px 40px;
            text-align: center;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #666666;
          }
          .body { padding: 40px 40px 32px; }
          .body h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0a0a0a;
            line-height: 1.3;
            margin-bottom: 12px;
            letter-spacing: -0.4px;
          }
          .body p { font-size: 15px; line-height: 1.7; color: #444444; margin-bottom: 16px; }
          .info-block {
            background: #fafafa;
            border: 1px solid #ebebeb;
            border-radius: 14px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
          }
          .info-row:last-child { border-bottom: none; padding-bottom: 0; }
          .info-key { color: #888888; font-weight: 500; }
          .info-val { color: #0a0a0a; font-weight: 600; text-align: right; }
          .alert-banner {
            background: #fff8e6;
            border: 1px solid #ffe199;
            border-radius: 12px;
            padding: 14px 18px;
            margin: 20px 0;
            font-size: 13px;
            color: #7a5800;
            line-height: 1.6;
          }
          .divider { border: none; border-top: 1px solid #ebebeb; margin: 28px 0; }
          .footer { background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 24px 40px; text-align: center; }
          .footer p { font-size: 12px; color: #aaaaaa; line-height: 1.6; margin-bottom: 6px; }
          .footer p:last-child { margin-bottom: 0; }
          .footer a { color: #666666; text-decoration: underline; }
          @media only screen and (max-width:600px) {
            .body { padding: 28px 24px 24px; }
            .hdr { padding: 24px 24px 20px; }
            .badge { padding: 10px 24px; }
            .footer { padding: 20px 24px; }
            .body h1 { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div class="card">
                  <!-- Header -->
                  <div class="hdr">
                    <div class="logo-wrap">
                      <svg class="logo-svg" viewBox="0 0 234 139" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.78965 131.389L49.3376 57.9376C53.1673 51.7618 59.9207 48 67.1876 48H137.213C140.37 48 142.283 51.4846 140.588 54.1475L121.179 84.6475C120.445 85.8013 119.172 86.5 117.804 86.5H78.2496C76.8527 86.5 75.5571 87.2287 74.8315 88.4223L50.8424 127.888C47.2146 133.857 40.7363 137.5 33.752 137.5H7.1871C4.05169 137.5 2.13726 134.053 3.78965 131.389Z" fill="white" stroke="white" stroke-width="2" />
                        <path d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z" fill="#888888" />
                        <path d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z" fill="white" />
                        <path d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z" stroke="white" stroke-width="2" />
                      </svg>
                      <span class="brand">PlaceTrix</span>
                    </div>
                  </div>

                  <!-- Badge -->
                  <div class="badge">${isConfirmed ? "RSVP Confirmed" : "RSVP Waitlisted"}</div>

                  <!-- Body -->
                  <div class="body">
                    <h1>${isConfirmed ? "Your Event Ticket is Ready!" : "You're on the Waitlist"}</h1>
                    <p>Hi <strong>${recipientName}</strong>,</p>
                    <p>
                      ${isConfirmed 
                        ? `Your registration for <strong>${event.title}</strong> has been confirmed. Below are your event details and entry QR code.`
                        : `You have been added to the waitlist for <strong>${event.title}</strong>. If a seat becomes available due to a cancellation, you will be automatically promoted and notified via email.`
                      }
                    </p>

                    <!-- Info block -->
                    <div class="info-block">
                      <div class="info-row">
                        <span class="info-key">Event</span>
                        <span class="info-val">${event.title}</span>
                      </div>
                      ${event.speaker_name ? `
                      <div class="info-row">
                        <span class="info-key">Speaker</span>
                        <span class="info-val">${event.speaker_name}</span>
                      </div>
                      ` : ""}
                      <div class="info-row">
                        <span class="info-key">Date &amp; Time</span>
                        <span class="info-val">${formattedDate}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-key">Venue</span>
                        <span class="info-val">${event.venue}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-key">Ticket ID</span>
                        <span class="info-val" style="font-family:monospace;font-size:12px;">${ticketData.id}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-key">Status</span>
                        <span class="info-val" style="color:${isConfirmed ? "#10b981" : "#f59e0b"};">${ticketData.status}</span>
                      </div>
                    </div>

                    ${isConfirmed && qrCodeDataUrl ? `
                    <!-- QR Code Card -->
                    <div style="text-align: center; margin: 28px 0 16px;">
                      <p style="font-size: 13px; color: #666666; margin-bottom: 12px; font-weight: 500;">Present this QR code at entry for check-in:</p>
                      <div style="display: inline-block; padding: 16px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                        <img src="cid:ticket_qr" alt="Ticket QR Code" width="200" height="200" style="display: block; width: 200px; height: 200px; border-radius: 8px;" />
                      </div>
                    </div>
                    ` : ""}

                    ${!isConfirmed ? `
                    <div class="alert-banner">
                      <strong>Waitlist Notice:</strong> You will receive an automated email with your QR entry ticket as soon as a spot opens up.
                    </div>
                    ` : ""}

                    <hr class="divider" />
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <p>This email was sent by <strong>PlaceTrix</strong> &middot; Campus Placement &amp; Training Platform</p>
                    <p>If you didn't request this or have questions, please contact support.</p>
                    <p>
                      <a href="https://placetrix.app/privacy-policy">Privacy Policy</a>
                      &nbsp;&middot;&nbsp;
                      <a href="https://placetrix.app/terms-of-service">Terms of Service</a>
                    </p>
                  </div>

                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "PlaceTrix"
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || "noreply@placetrix.app"

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ [EMAIL SERVICE] SMTP configuration is incomplete in environment variables.")
      console.log("------------------ MOCK EMAIL LOG (SMTP FALLBACK) ------------------")
      console.log(`To: ${profileData.email}`)
      console.log(`Subject: ${subject}`)
      console.log(`Status: ${ticketData.status}`)
      console.log(`Event: ${event.title}`)
      console.log(`Attendee: ${recipientName}`)
      console.log(`Ticket ID: ${ticketData.id}`)
      console.log("--------------------------------------------------------------------")
      return { success: true, mock: true }
    }

    // 3. Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // True for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    // Setup attachments (CID inline image for QR code)
    const attachments: any[] = []
    if (isConfirmed && qrCodeDataUrl) {
      const base64Data = qrCodeDataUrl.split(",")[1]
      attachments.push({
        filename: "qrcode.png",
        content: Buffer.from(base64Data, "base64"),
        cid: "ticket_qr",
      })
    }

    // 4. Send email
    const mailOptions = {
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: profileData.email,
      subject,
      html,
      attachments,
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, data: info }
  } catch (err: any) {
    console.error("Failed to send email via SMTP:", err)
    return { success: false, error: err.message || "Internal error in sendTicketEmail via SMTP" }
  }
}

export async function sendNewSupportTicketNotification(ticket: {
  id: string;
  title: string;
  description: string;
  email: string;
  userName?: string;
}): Promise<{ success: boolean; error?: string; mock?: boolean }> {
  try {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "PlaceTrix"
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || "noreply@placetrix.app"

    const subject = `🎫 New Support Ticket: ${ticket.title}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f4f7;
              color: #333333;
              margin: 0;
              padding: 0;
              width: 100% !important;
            }
            .wrapper { width: 100%; background-color: #f4f4f7; padding: 24px 0; }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              border: 1px solid #e1e4e8;
            }
            .header {
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              color: #ffffff;
              padding: 28px 28px 24px;
            }
            .header-badge {
              display: inline-block;
              background: rgba(255,255,255,0.12);
              border: 1px solid rgba(255,255,255,0.18);
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              padding: 4px 10px;
              border-radius: 9999px;
              margin-bottom: 12px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: -0.3px;
              line-height: 1.3;
            }
            .header p {
              margin: 6px 0 0;
              font-size: 13px;
              opacity: 0.65;
            }
            .content { padding: 28px; }
            .field {
              margin-bottom: 18px;
            }
            .field-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #64748b;
              margin-bottom: 5px;
            }
            .field-value {
              font-size: 14px;
              color: #0f172a;
              line-height: 1.55;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              word-break: break-word;
            }
            .ticket-id {
              font-family: monospace;
              font-size: 12px;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 12px;
              color: #475569;
              margin-bottom: 20px;
              display: block;
            }
            .cta {
              text-align: center;
              margin: 24px 0 8px;
            }
            .cta a {
              display: inline-block;
              background: #0f172a;
              color: #fff;
              text-decoration: none;
              font-size: 14px;
              font-weight: 600;
              padding: 12px 28px;
              border-radius: 9999px;
              letter-spacing: 0.01em;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              padding: 20px 28px;
              border-top: 1px solid #f1f5f9;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="header-badge">Support Ticket</div>
                <h1>New ticket submitted</h1>
                <p>A user has opened a new support request on PlaceTrix.</p>
              </div>
              <div class="content">
                <span class="ticket-id">Ticket ID: ${ticket.id}</span>

                <div class="field">
                  <div class="field-label">Subject</div>
                  <div class="field-value">${ticket.title}</div>
                </div>

                <div class="field">
                  <div class="field-label">Description</div>
                  <div class="field-value">${ticket.description.replace(/\n/g, "<br>")}</div>
                </div>

                <div class="field">
                  <div class="field-label">Submitted By</div>
                  <div class="field-value">${ticket.userName ? `${ticket.userName} &lt;${ticket.email}&gt;` : ticket.email}</div>
                </div>

                <div class="field">
                  <div class="field-label">Submitted At</div>
                  <div class="field-value">${new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(new Date())} UTC</div>
                </div>

                <div class="cta">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://placetrix.app"}/support/${ticket.id}">View Ticket in Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p>This is an automated notification from PlaceTrix Support System.</p>
                <p>&copy; ${new Date().getFullYear()} PlaceTrix. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ [EMAIL SERVICE] SMTP configuration is incomplete. Skipping notification email.")
      console.log("[MOCK] New support ticket notification:")
      console.log(`  To: 4grid.tech@gmail.com`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Ticket ID: ${ticket.id}`)
      return { success: true, mock: true }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: "4grid.tech@gmail.com",
      subject,
      html,
    })

    return { success: true }
  } catch (err: any) {
    console.error("[EMAIL SERVICE] Failed to send new ticket notification:", err)
    return { success: false, error: err.message || "Internal error in sendNewSupportTicketNotification" }
  }
}

export async function sendTicketCreatorConfirmation(ticket: {
  id: string;
  title: string;
  description: string;
  email: string;
  userName?: string;
}): Promise<{ success: boolean; error?: string; mock?: boolean }> {
  try {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "PlaceTrix"
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || "noreply@placetrix.app"
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://placetrix.app"

    const recipientName = ticket.userName || "there"
    const subject = `✅ Support Ticket Received – ${ticket.title}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f4f7;
              color: #333333;
              margin: 0;
              padding: 0;
              width: 100% !important;
            }
            .wrapper { width: 100%; background-color: #f4f4f7; padding: 24px 0; }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              border: 1px solid #e1e4e8;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: #ffffff;
              padding: 28px 28px 24px;
            }
            .header-badge {
              display: inline-block;
              background: rgba(255,255,255,0.15);
              border: 1px solid rgba(255,255,255,0.25);
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              padding: 4px 10px;
              border-radius: 9999px;
              margin-bottom: 12px;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.3px;
              line-height: 1.3;
            }
            .header p {
              margin: 6px 0 0;
              font-size: 13px;
              opacity: 0.75;
            }
            .content { padding: 28px; }
            .greeting {
              font-size: 15px;
              color: #334155;
              line-height: 1.6;
              margin: 0 0 20px;
            }
            .greeting strong { color: #0f172a; }
            .info-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 18px 20px;
              margin-bottom: 20px;
            }
            .info-box .ticket-id-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #64748b;
              margin-bottom: 4px;
            }
            .info-box .ticket-id-value {
              font-family: monospace;
              font-size: 13px;
              color: #0f172a;
              font-weight: 600;
            }
            .divider {
              border: none;
              border-top: 1px solid #e2e8f0;
              margin: 14px 0;
            }
            .field-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #64748b;
              margin-bottom: 3px;
            }
            .field-value {
              font-size: 14px;
              color: #0f172a;
              line-height: 1.55;
              word-break: break-word;
              margin-bottom: 14px;
            }
            .note {
              font-size: 13px;
              color: #475569;
              line-height: 1.6;
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 24px;
            }
            .cta {
              text-align: center;
              margin: 4px 0 12px;
            }
            .cta a {
              display: inline-block;
              background: #10b981;
              color: #fff;
              text-decoration: none;
              font-size: 14px;
              font-weight: 600;
              padding: 12px 28px;
              border-radius: 9999px;
              letter-spacing: 0.01em;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              padding: 20px 28px;
              border-top: 1px solid #f1f5f9;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="header-badge">Ticket Received</div>
                <h1>We've got your request!</h1>
                <p>Our support team will get back to you shortly.</p>
              </div>
              <div class="content">
                <p class="greeting">Hi <strong>${recipientName}</strong>,</p>
                <p class="greeting">
                  Thank you for reaching out. Your support ticket has been successfully created and is now in our queue.
                  We'll review it and respond as soon as possible.
                </p>

                <div class="info-box">
                  <div class="ticket-id-label">Ticket Reference</div>
                  <div class="ticket-id-value">${ticket.id}</div>
                  <hr class="divider">
                  <div class="field-label">Subject</div>
                  <div class="field-value">${ticket.title}</div>
                  <div class="field-label">Your Message</div>
                  <div class="field-value">${ticket.description.replace(/\n/g, "<br>")}</div>
                </div>

                <div class="note">
                  💡 You can track the status of your ticket and read any replies from our team by visiting your dashboard.
                </div>

                <div class="cta">
                  <a href="${siteUrl}/gethelp/${ticket.id}">Track Your Ticket</a>
                </div>
              </div>
              <div class="footer">
                <p>This is an automated confirmation from PlaceTrix Support.</p>
                <p>Please do not reply directly to this email.</p>
                <p>&copy; ${new Date().getFullYear()} PlaceTrix. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("⚠️ [EMAIL SERVICE] SMTP configuration is incomplete. Skipping creator confirmation email.")
      console.log("[MOCK] Ticket creator confirmation:")
      console.log(`  To: ${ticket.email}`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Ticket ID: ${ticket.id}`)
      return { success: true, mock: true }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: ticket.email,
      subject,
      html,
    })

    return { success: true }
  } catch (err: any) {
    console.error("[EMAIL SERVICE] Failed to send ticket creator confirmation:", err)
    return { success: false, error: err.message || "Internal error in sendTicketCreatorConfirmation" }
  }
}
