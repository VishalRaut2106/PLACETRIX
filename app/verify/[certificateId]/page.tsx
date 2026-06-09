import { createAdminClient } from "@/lib/supabase/admin"
import VerifyCertificateClient from "./VerifyCertificateClient"

interface PageProps {
  params: Promise<{
    certificateId: string
  }>
}

export const metadata = {
  title: "Verify Certificate — PlaceTrix",
  description: "Verify the authenticity of PlaceTrix course completion certificates",
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { certificateId } = await params

  let certificate: any = null
  let errorOccurred = false

  try {
    const supabase = createAdminClient()
    const { data, error } = await (supabase as any)
      .from("course_certificates")
      .select(`
        id,
        issued_at,
        issued_to_name,
        courses(title),
        profiles(display_name)
      `)
      .eq("id", certificateId)
      .maybeSingle()

    if (error || !data) {
      errorOccurred = true
    } else {
      certificate = data
    }
  } catch (err) {
    console.error("Exception checking certificate:", err)
    errorOccurred = true
  }

  return (
    <VerifyCertificateClient
      certificateId={certificateId}
      certificate={certificate}
      errorOccurred={errorOccurred}
    />
  )
}
