import { ResumeAnalyzerClient } from "./ResumeAnalyzerClient"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Resume Analyzer | PlaceTrix",
  description: "AI-powered ATS resume analysis with keyword matching, skill gap identification, and actionable improvements.",
}

export default async function ResumeAnalyzerPage() {
  return <ResumeAnalyzerClient initialDescription="" />
}
