import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/profile";
import { ResumeGeneratorClient } from "./ResumeGeneratorClient";
import type { ResumeFormData } from "./ResumePDFDocument";
import { getCachedGlobalSkills, getCachedCandidateResumePrefill } from "@/lib/supabase/cached-queries";

export const metadata: Metadata = {
  title: "Resume Generator",
  description: "Build a professional LaTeX-style resume from your PlaceTrix profile and download it as a PDF.",
};

export default async function ResumeGeneratorPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/auth/login");
  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") redirect("/tools");

  // ── Parallel cached data fetch ─────────────────────────────────────────────
  const [prefillDataCached, allSkills] = await Promise.all([
    getCachedCandidateResumePrefill(profile.id, profile.institute_id),
    getCachedGlobalSkills(),
  ]);

  const {
    academicDetails,
    candidateEducation,
    candidateExperiences,
    candidateProjects,
    candidateCertifications,
    candidateSkillRows,
    semesterGrades,
    instituteName,
  } = prefillDataCached;

  // ── Course name ───────────────────────────────────────────────────────────
  const courseName: string | null = Array.isArray(academicDetails?.course)
    ? ((academicDetails?.course as any)[0]?.course_name ?? null)
    : ((academicDetails?.course as any)?.course_name ?? null);

  // ── CGPA ──────────────────────────────────────────────────────────────────
  const validSgpas = (semesterGrades ?? [])
    .map((g: any) => (g.sgpa != null ? Number(g.sgpa) : null))
    .filter((v: number | null): v is number => v !== null && !isNaN(v));
  const cgpa = validSgpas.length > 0
    ? validSgpas.reduce((a: number, b: number) => a + b, 0) / validSgpas.length
    : null;

  // ── Education records ─────────────────────────────────────────────────────
  const eduList = candidateEducation ?? [];
  const sscRec = eduList.find((e: any) => e.type === "ssc");
  const hscRec = eduList.find((e: any) => e.type === "hsc");
  const diplomaRec = eduList.find((e: any) => e.type === "diploma");

  function fmtDate(iso?: string | null): string {
    if (!iso) return "";
    try {
      const d = new Date(`${iso}T00:00:00`);
      return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(d);
    } catch { return iso ?? ""; }
  }

  // ── Skills grouped ────────────────────────────────────────────────────────
  const selectedSkillIds = new Set<string>(
    (candidateSkillRows ?? []).map((r: any) => r.skill_id)
  );
  const skillGroups: Record<string, string[]> = {};
  for (const skill of (allSkills ?? [])) {
    if (!selectedSkillIds.has(skill.id)) continue;
    if (!skillGroups[skill.category]) skillGroups[skill.category] = [];
    skillGroups[skill.category].push(skill.name);
  }

  // Build education array for prefill
  const educationPrefill = [
    ...(instituteName && courseName ? [{
      degree: courseName,
      institution: instituteName,
      location: "",
      year: academicDetails?.passout_year ? String(academicDetails.passout_year) : "",
      grade: cgpa != null ? `${cgpa.toFixed(2)} CGPA` : "",
    }] : []),
    ...(diplomaRec ? [{
      degree: "Diploma",
      institution: diplomaRec.institution_name ?? "",
      location: "",
      year: String(diplomaRec.passout_year ?? ""),
      grade: `${Number(diplomaRec.grade_or_percentage).toFixed(2)}%`,
    }] : []),
    ...(hscRec ? [{
      degree: "Class 12 (HSC)",
      institution: hscRec.institution_name ?? "",
      location: "",
      year: String(hscRec.passout_year ?? ""),
      grade: `${Number(hscRec.grade_or_percentage).toFixed(2)}%`,
    }] : []),
    ...(sscRec ? [{
      degree: "Class 10 (SSC)",
      institution: sscRec.institution_name ?? "",
      location: "",
      year: String(sscRec.passout_year ?? ""),
      grade: `${Number(sscRec.grade_or_percentage).toFixed(2)}%`,
    }] : []),
  ];

  // ── Build prefill ─────────────────────────────────────────────────────────
  const prefillData: ResumeFormData = {
    fullName: profile.full_name ??
      [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" "),
    email: profile.email ?? "",
    phone: profile.phone_number ?? "",
    location: profile.current_address ?? "",
    linkedin: profile.linkedin_url ?? "",
    github: profile.github_url ?? "",
    portfolio: (profile.portfolio_links ?? []).filter(Boolean)[0] ?? "",
    summary: profile.bio ?? "",

    education: educationPrefill.length > 0 ? educationPrefill : [
      { degree: "", institution: "", location: "", year: "", grade: "" },
    ],

    experience: (candidateExperiences ?? []).map((e: any) => ({
      title: e.title ?? "",
      company: e.company_name ?? "",
      location: e.location ?? "",
      startDate: fmtDate(e.start_date),
      endDate: fmtDate(e.end_date),
      isCurrent: !!e.is_current,
      bullets: (e.description ?? "")
        .split("\n")
        .map((l: string) => l.replace(/^[-•]\s*/, "").trim())
        .filter(Boolean),
    })).concat(
      (candidateExperiences?.length ?? 0) === 0
        ? [{ title: "", company: "", location: "", startDate: "", endDate: "", isCurrent: false, bullets: [""] }]
        : []
    ),

    projects: (candidateProjects ?? []).map((p: any) => ({
      title: p.title ?? "",
      technologies: Array.isArray(p.skills) ? p.skills.join(", ") : "",
      url: p.project_url ?? "",
      description: p.description ?? "",
    })).concat(
      (candidateProjects?.length ?? 0) === 0
        ? [{ title: "", technologies: "", url: "", description: "" }]
        : []
    ),

    certifications: (candidateCertifications ?? []).map((c: any) => ({
      name: c.name ?? "",
      issuer: c.issuing_org ?? "",
      date: fmtDate(c.issue_date),
      url: c.credential_url ?? "",
    })).concat(
      (candidateCertifications?.length ?? 0) === 0
        ? [{ name: "", issuer: "", date: "", url: "" }]
        : []
    ),

    skillGroups: Object.entries(skillGroups).length > 0
      ? Object.entries(skillGroups).map(([category, names]) => ({
        category,
        skills: names.join(", "),
      }))
      : [
        { category: "Languages", skills: "" },
        { category: "Frameworks", skills: "" },
        { category: "Tools", skills: "" },
      ],
  };

  return <ResumeGeneratorClient prefillData={prefillData} />;
}
