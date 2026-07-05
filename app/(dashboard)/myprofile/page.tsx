import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { decryptString, maskAadhaar } from "@/lib/encryption"
import { CandidateProfileClient } from "./CandidateProfileClient"
import { InstituteProfileClient } from "./InstituteProfileClient"
import { AdminProfileClient } from "./AdminProfileClient"
import { StaffProfileClient } from "./StaffProfileClient"
import { TpoProfileClient } from "./TpoProfileClient"
export default async function MyProfilePage() {
  const profile = await getUserProfile()
  if (!profile) return null

  const supabase = await createClient()

  if (profile.account_type === "admin") {
    return (
      <AdminProfileClient
        userProfile={profile}
        initialData={null}
      />
    )
  }

  if (profile.account_type === "candidate") {
    const [
      { data: candidateProfile },
      { data: candidateEducation },
      { data: candidateExperiences },
      { data: candidateProjects },
      { data: candidateCertifications },
      { data: eventTickets }
    ] = await Promise.all([
      (supabase as any).from("candidate_profiles").select("*").eq("profile_id", profile.id).maybeSingle(),
      (supabase as any).from("candidate_education").select("*").eq("profile_id", profile.id).order("passout_year", { ascending: false }),
      (supabase as any).from("candidate_experiences").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
      (supabase as any).from("candidate_projects").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
      (supabase as any).from("candidate_certifications").select("*").eq("profile_id", profile.id).order("issue_date", { ascending: false }),
      (supabase as any)
        .from("event_tickets")
        .select(`
          id,
          event:events!inner(
            id,
            title,
            date,
            status
          )
        `)
        .eq("candidate_id", profile.id)
        .eq("attendance_status", "Present")
        .eq("events.status", "Concluded")
    ]);

    const eventCertificates = (eventTickets ?? [])
      .filter((t: any) => t.event)
      .map((t: any) => ({
        ticketId: t.id,
        eventId: t.event.id,
        eventTitle: t.event.title,
        eventDate: t.event.date,
      }));

    if (candidateProfile?.aadhaar_number) {
      try {
        const decrypted = decryptString(candidateProfile.aadhaar_number);
        candidateProfile.aadhaar_number = maskAadhaar(decrypted);
      } catch (err) {
        console.error("Failed to decrypt Aadhaar number for profile", profile.id);
        candidateProfile.aadhaar_number = maskAadhaar(candidateProfile.aadhaar_number);
      }
    }

    return (
      <CandidateProfileClient
        userProfile={profile}
        initialData={candidateProfile ?? null}
        educationData={candidateEducation ?? []}
        experienceData={candidateExperiences ?? []}
        projectsData={candidateProjects ?? []}
        certificationsData={candidateCertifications ?? []}
        eventCertificates={eventCertificates}
      />
    )
  }

  if (profile.account_type === "institute") {
    if (profile.account_subtype === "staff") {
      const { data: staffProfile } = await (supabase as any)
        .from("staff_profiles")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle()
      return <StaffProfileClient userProfile={profile} initialData={staffProfile ?? null} />
    }

    if (profile.account_subtype === "tpo") {
      const { data: tpoProfile } = await (supabase as any)
        .from("tpo_profiles")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle()
      return <TpoProfileClient userProfile={profile} initialData={tpoProfile ?? null} />
    }

    const instituteId = profile.institute_id
    let instituteProfile = null
    if (instituteId) {
      const { data } = await (supabase as any)
        .from("institutes")
        .select("*")
        .eq("id", instituteId)
        .maybeSingle()
      instituteProfile = data
    }

    return (
      <InstituteProfileClient
        userProfile={profile}
        initialData={instituteProfile ?? null}
      />
    )
  }

  redirect("/home")
}

