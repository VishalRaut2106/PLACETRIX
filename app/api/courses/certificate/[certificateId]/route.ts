import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { jsPDF } from "jspdf"
import QRCode from "qrcode"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ certificateId: string }>
}

// ─── Font Helpers ─────────────────────────────────────────────────────────────

/** Download a font file from a URL and return it as a base64 string. Returns null on failure. */
async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlaceTrix/1.0)" },
    })
    if (!resp.ok) return null
    return Buffer.from(await resp.arrayBuffer()).toString("base64")
  } catch {
    return null
  }
}

/**
 * Load EB Garamond variants by parsing the Google Fonts CSS API response.
 * Request order: 400 normal → 700 normal → 700 italic.
 * Returns null for any weight that could not be fetched — callers fall back to "times".
 */
async function loadGaramondFonts(): Promise<{
  regular: string | null
  bold: string | null
  boldItalic: string | null
}> {
  const NONE = { regular: null, bold: null, boldItalic: null }
  try {
    const cssUrl =
      "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,700&display=swap"
    const cssResp = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlaceTrix/1.0)" },
    })
    if (!cssResp.ok) return NONE

    const css = await cssResp.text()
    const urlRegex = /src:\s*url\(([^)]+)\)\s*format\(['"']?(?:woff2?|truetype)['"']?\)/g
    const fontUrls: string[] = []
    let m: RegExpExecArray | null
    while ((m = urlRegex.exec(css)) !== null) {
      fontUrls.push(m[1].replace(/['"]/g, ""))
    }

    const [regular, bold, boldItalic] = await Promise.all([
      fontUrls[0] ? fetchFontBase64(fontUrls[0]) : Promise.resolve(null),
      fontUrls[1] ? fetchFontBase64(fontUrls[1]) : Promise.resolve(null),
      fontUrls[2] ? fetchFontBase64(fontUrls[2]) : Promise.resolve(null),
    ])

    return { regular, bold, boldItalic }
  } catch {
    return NONE
  }
}

/** Load Montserrat Bold variant by parsing the Google Fonts CSS API response. */
async function loadMontserratFont(): Promise<string | null> {
  try {
    const cssUrl = "https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap"
    const cssResp = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlaceTrix/1.0)" },
    })
    if (!cssResp.ok) return null

    const css = await cssResp.text()
    const urlRegex = /src:\s*url\(([^)]+)\)\s*format\(['"']?(?:woff2?|truetype)['"']?\)/g
    const m = urlRegex.exec(css)
    if (m && m[1]) {
      const fontUrl = m[1].replace(/['"]/g, "")
      return await fetchFontBase64(fontUrl)
    }
    return null
  } catch {
    return null
  }
}

/** Draw the PlaceTrix logo vectors scaled and positioned on the PDF */
function drawPlaceTrixLogo(doc: jsPDF, x: number, y: number, width: number) {
  const scale = width / 234
  const sx = (px: number) => x + px * scale
  const sy = (py: number) => y + py * scale

  // Use unified dark slate-900 (15, 23, 42) for the brand mark
  doc.setFillColor(15, 23, 42)

  // Path 1
  doc.moveTo(sx(3.78965), sy(131.389))
  doc.lineTo(sx(49.3376), sy(57.9376))
  doc.curveTo(sx(53.1673), sy(51.7618), sx(59.9207), sy(48), sx(67.1876), sy(48))
  doc.lineTo(sx(137.213), sy(48))
  doc.curveTo(sx(140.37), sy(48), sx(142.283), sy(51.4846), sx(140.588), sy(54.1475))
  doc.lineTo(sx(121.179), sy(84.6475))
  doc.curveTo(sx(120.445), sy(85.8013), sx(119.172), sy(86.5), sx(117.804), sy(86.5))
  doc.lineTo(sx(78.2496), sy(86.5))
  doc.curveTo(sx(76.8527), sy(86.5), sx(75.5571), sy(87.2287), sx(74.8315), sy(88.4223))
  doc.lineTo(sx(50.8424), sy(127.888))
  doc.curveTo(sx(47.2146), sy(133.857), sx(40.7363), sy(137.5), sx(33.752), sy(137.5))
  doc.lineTo(sx(7.1871), sy(137.5))
  doc.curveTo(sx(4.05169), sy(137.5), sx(2.13726), sy(134.053), sx(3.78965), sy(131.389))
  doc.close()
  doc.fill()

  // Path 2
  doc.moveTo(sx(57.0333), sy(32.8693))
  doc.lineTo(sx(72.9628), sy(8.65652))
  doc.curveTo(sx(76.107), sy(3.87731), sx(81.4442), sy(1), sx(87.1649), sy(1))
  doc.lineTo(sx(155.75), sy(1))
  doc.lineTo(sx(216.833), sy(1))
  doc.curveTo(sx(223.991), sy(1), sx(228.285), sy(8.95097), sx(224.359), sy(14.9362))
  doc.lineTo(sx(177.535), sy(86.3238))
  doc.curveTo(sx(174.393), sy(91.1143), sx(169.049), sy(94), sx(163.32), sy(94))
  doc.lineTo(sx(133.417), sy(94))
  doc.curveTo(sx(130.233), sy(94), sx(128.326), sy(90.4625), sx(130.074), sy(87.8027))
  doc.lineTo(sx(157.47), sy(46.1296))
  doc.curveTo(sx(159.21), sy(43.4836), sx(157.331), sy(39.9616), sx(154.165), sy(39.9324))
  doc.lineTo(sx(60.3381), sy(39.0676))
  doc.curveTo(sx(57.1712), sy(39.0384), sx(55.2926), sy(35.5152), sx(57.0333), sy(32.8693))
  doc.close()
  doc.fill()
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, props: RouteParams) {
  const { certificateId } = await props.params

  if (!certificateId) {
    return new Response(JSON.stringify({ error: "Certificate ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Bypass RLS — certificates are public documents
  const supabase = createAdminClient()

  const { data: certificate, error } = await (supabase as any)
    .from("course_certificates")
    .select(`
      id,
      issued_at,
      issued_to_name,
      courses(
        title,
        instructor:profiles!courses_instructor_id_fkey(
          display_name,
          signature_path
        )
      ),
      profiles(display_name)
    `)
    .eq("id", certificateId)
    .maybeSingle()

  if (error || !certificate) {
    console.error("Certificate fetch error:", error)
    return new Response(JSON.stringify({ error: "Certificate not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const courseData     = certificate.courses as any
  const recipientName  = (certificate as any).issued_to_name ?? certificate.profiles?.display_name ?? "Candidate"
  const courseTitle    = courseData?.title ?? "Training Track"
  const instructorName = courseData?.instructor?.display_name || "Course Instructor"
  const signaturePath  = courseData?.instructor?.signature_path || null
  const issueDateStr   = new Date(certificate.issued_at).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  })

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://placetrix.app"
  const verifyLink = `${siteUrl}/verify/${certificateId}`

  let signatureBase64: string | null = null
  if (signaturePath) {
    try {
      const { data: storageData } = supabase.storage.from("avatars").getPublicUrl(signaturePath)
      if (storageData?.publicUrl) {
        signatureBase64 = await fetchFontBase64(storageData.publicUrl)
      }
    } catch (e) {
      console.error("Error fetching signature:", e)
    }
  }

  try {
    // ── Generate QR Code Data URL ─────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(verifyLink, {
      margin: 1,
      width: 150,
      color: {
        dark: "#0f172a",  // Slate-900 color matching our redesigned theme
        light: "#ffffff",
      }
    })

    // ── PDF Setup ────────────────────────────────────────────────────────────

    const ownerPassword =
      Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)

    const [garamond, montserrat] = await Promise.all([
      loadGaramondFonts(),
      loadMontserratFont()
    ])
    const hasGaramond = !!garamond.regular

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
      putOnlyUsedFonts: true,
      encryption: {
        userPassword: "",
        ownerPassword,
        userPermissions: ["print"],
      },
    })

    // Register EB Garamond weights
    if (garamond.regular) {
      doc.addFileToVFS("EBGaramond-Regular.ttf", garamond.regular)
      doc.addFont("EBGaramond-Regular.ttf", "EBGaramond", "normal")
    }
    if (garamond.bold) {
      doc.addFileToVFS("EBGaramond-Bold.ttf", garamond.bold)
      doc.addFont("EBGaramond-Bold.ttf", "EBGaramond", "bold")
    }
    if (garamond.boldItalic) {
      doc.addFileToVFS("EBGaramond-BoldItalic.ttf", garamond.boldItalic)
      doc.addFont("EBGaramond-BoldItalic.ttf", "EBGaramond", "bolditalic")
    }

    // Font family (uses EB Garamond, falls back to times if needed)
    const G = hasGaramond ? "EBGaramond" : "times"
    
    if (montserrat) {
      doc.addFileToVFS("Montserrat-Bold.ttf", montserrat)
      doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold")
    }
    const M = montserrat ? "Montserrat" : "helvetica"

    // Helper to sanitize strings to pure ASCII to prevent jsPDF encryption metadata encoding bug
    const toAscii = (str: string) => {
      return str
        .replace(/[\u2014\u2015]/g, "-") // em-dash and en-dash
        .replace(/[\u2018\u2019]/g, "'") // curly single quotes
        .replace(/[\u201c\u201d]/g, '"') // curly double quotes
        .replace(/[^\x00-\x7f]/g, "?")   // fallback for any other non-ASCII chars
    }

    doc.setProperties({
      title:    toAscii(`${courseTitle} - Certificate of Completion`),
      subject:  toAscii("Course Completion Certificate"),
      author:   toAscii(instructorName),
      creator:  toAscii("System"),
      keywords: toAscii("certificate, completion, verification"),
    })

    // ── Dimensions ───────────────────────────────────────────────────────────

    const W  = 841.89   // landscape A4 width  (pt)
    const H  = 595.28   // landscape A4 height (pt)
    const CX = W / 2    // horizontal center
    const CY = H / 2    // vertical center

    // ── Background & Borders ─────────────────────────────────────────────────

    // Dark outer frame (slate-900)
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, W, H, "F")

    // Subtle geometric cross-hatch pattern on the dark blue frame
    doc.setDrawColor(30, 41, 59) // Slate-800 (slightly lighter than background)
    doc.setLineWidth(0.5)
    for (let i = -H; i < W; i += 12) {
      doc.line(i, 0, i + H, H)    // \ diagonal
      doc.line(i, H, i + H, 0)    // / diagonal
    }

    // Ivory/white inner page
    doc.setFillColor(254, 254, 254) // Extremely clean, soft white
    doc.rect(8, 8, W - 16, H - 16, "F")

    // ── Traditional Double Gold Borders & Ornate Corners ───────────────────────
    doc.setDrawColor(197, 160, 89) // Champagne Gold
    doc.setFillColor(197, 160, 89)
    
    // Outer gold border (slightly thicker)
    doc.setLineWidth(1.2)
    doc.rect(16, 16, W - 32, H - 32, "S")

    // Inner gold border
    doc.setLineWidth(0.8)
    doc.rect(22, 22, W - 44, H - 44, "S")

    // Ornate L-bracket accents in corners
    const drawCornerAccent = (cx: number, cy: number, dirX: number, dirY: number) => {
      doc.setDrawColor(197, 160, 89)
      doc.setLineWidth(0.8)
      // Draw L-lines
      doc.line(cx, cy, cx + dirX * 15, cy)
      doc.line(cx, cy, cx, cy + dirY * 15)
      
      // Draw a small decorative filled diamond at the corner intersection
      const size = 3
      doc.triangle(cx, cy - size, cx - size, cy, cx + size, cy, "F")
      doc.triangle(cx, cy + size, cx - size, cy, cx + size, cy, "F")
    }

    drawCornerAccent(28, 28, 1, 1)         // Top-Left
    drawCornerAccent(W - 28, 28, -1, 1)     // Top-Right
    drawCornerAccent(28, H - 28, 1, -1)     // Bottom-Left
    drawCornerAccent(W - 28, H - 28, -1, -1) // Bottom-Right

    // ── Concentric Security Watermark ─────────────────────────────────────────
    // Centered in the middle of the certificate
    const drawWatermark = (cx: number, cy: number, r1: number, r2: number, points: number) => {
      doc.setDrawColor(254, 243, 199) // Very light amber-100/gold
      doc.setLineWidth(0.3)
      const firstX = cx + r1
      const firstY = cy
      doc.moveTo(firstX, firstY)
      for (let i = 0; i <= points; i++) {
        const angle = (i * 2 * Math.PI) / points
        const r = i % 2 === 0 ? r1 : r2
        doc.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      }
      doc.stroke()
    }
    drawWatermark(CX, CY, 180, 195, 48)
    drawWatermark(CX, CY, 140, 155, 36)
    drawWatermark(CX, CY, 100, 115, 24)

    // ── Centered Content Layout ───────────────────────────────────────────────

    // 0. Top Branding (Logo + Text side-by-side)
    const logoWidth = 24
    const gap = 8
    doc.setFont(M, "bold")
    doc.setFontSize(16)
    const brandTextWidth = doc.getTextWidth("PlaceTrix")
    const totalBrandingWidth = logoWidth + gap + brandTextWidth
    const brandingStartX = CX - totalBrandingWidth / 2
    const brandingY = 65

    drawPlaceTrixLogo(doc, brandingStartX, brandingY, logoWidth)

    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text("PlaceTrix", brandingStartX + logoWidth + gap, brandingY + 12.5)

    // 1. Certificate title (Moved down from 138 to 165)
    doc.setFont(G, "bold")
    doc.setFontSize(28)
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text("CERTIFICATE OF COMPLETION", CX, 165, { align: "center" })

    // Decorative divider line with center diamond under title (Moved down from 154 to 182)
    doc.setDrawColor(197, 160, 89) // Champagne Gold
    doc.setLineWidth(0.8)
    doc.line(CX - 130, 182, CX + 130, 182)

    // Center Diamond ornament
    doc.setFillColor(197, 160, 89)
    doc.triangle(CX, 179, CX - 4, 182, CX + 4, 182, "F")
    doc.triangle(CX, 185, CX - 4, 182, CX + 4, 182, "F")

    // 2. Presentation label (Moved down from 188 to 216)
    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(12.5)
    doc.setTextColor(71, 85, 105) // Slate-600
    doc.text("This certificate is proudly presented to", CX, 216, { align: "center" })

    // 3. Recipient name (Moved down from 236 to 264)
    doc.setFont(G, "normal")
    doc.setFontSize(35)
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text(recipientName, CX, 264, { align: "center" })

    // Gold line under name (Moved down from 248 to 276)
    const nameWidth = doc.getTextWidth(recipientName)
    const underlineHalf = Math.min(nameWidth / 2 + 18, 200)
    doc.setDrawColor(197, 160, 89) // Champagne Gold
    doc.setLineWidth(1.0)
    doc.line(CX - underlineHalf, 276, CX + underlineHalf, 276)

    // 4. Completion description (Moved down from 286 to 314)
    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(12.5)
    doc.setTextColor(71, 85, 105) // Slate-600
    doc.text("for successfully completing the curriculum and requirements for", CX, 314, { align: "center" })

    // 5. Course title (Moved down from 325 to 350)
    doc.setFont(M, "bold")
    doc.setFontSize(20)
    doc.setTextColor(15, 23, 42) // Slate-900
    const wrappedTitle = doc.splitTextToSize(courseTitle, W - 210)
    doc.text(wrappedTitle, CX, 350, { align: "center" })

    const titleBlockBottom = 350 + (wrappedTitle.length - 1) * 24

    // 6. Issue date
    doc.setFont(G, "normal")
    doc.setFontSize(10.5)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text(`Issued on ${issueDateStr}`, CX, titleBlockBottom + 35, { align: "center" })

    // ── 8. Symmetrical Footer Layout (Signatures & Verification) ──────────────
    const sigY = 485
    const leftX = 210
    const rightX = W - 210

    // Left Column: Signature of Instructor
    if (signatureBase64) {
      try {
        const sigWidth = 100
        const sigHeight = 30
        const sigX = leftX - sigWidth / 2
        const sigYAdjusted = sigY - sigHeight - 5

        let format = "PNG"
        if (signaturePath && (signaturePath.endsWith(".jpg") || signaturePath.endsWith(".jpeg"))) {
          format = "JPEG"
        } else if (signaturePath && signaturePath.endsWith(".webp")) {
          format = "WEBP"
        }

        doc.addImage(signatureBase64, format, sigX, sigYAdjusted, sigWidth, sigHeight)
      } catch (err) {
        console.error("Failed to add signature image, falling back to text:", err)
        // Fallback to "Digitally Signed" text
        doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139) // Slate-500
        doc.text("Digitally Signed", leftX, sigY - 12, { align: "center" })
      }
    } else {
      // Fallback to "Digitally Signed" text
      doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139) // Slate-500
      doc.text("Digitally Signed", leftX, sigY - 12, { align: "center" })
    }

    // Signature line
    doc.setDrawColor(203, 213, 225) // Slate-300
    doc.setLineWidth(0.8)
    doc.line(leftX - 80, sigY, leftX + 80, sigY)

    // Instructor details
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text(instructorName, leftX, sigY + 14, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text("Course Instructor", leftX, sigY + 24, { align: "center" })

    // Right Column: QR Code & Verification (Centered symmetrically)
    const qrSize = 46
    const qrX = rightX - qrSize / 2
    const qrY = sigY - qrSize - 5

    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139) // Slate-500
    
    doc.text(`Verify at: ${verifyLink}`, rightX, sigY + 14, { align: "center" })
    doc.text(`Certificate ID: ${certificateId}`, rightX, sigY + 24, { align: "center" })

    // ── Emit PDF ──────────────────────────────────────────────────────────────

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate_${certificateId.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    })
  } catch (err: any) {
    console.error("PDF generation error:", err)
    return new Response(JSON.stringify({ error: "Failed to generate certificate PDF." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
