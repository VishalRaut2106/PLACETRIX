// app/(dashboard)/(licensed)/opportunities/types.ts

export type OpportunityStatus = "Draft" | "Published" | "Concluded"
export type OpportunityType = "on_campus" | "off_campus" | "internship" | "ppo" | "freelance"
export type ApplicationStatus = "Applied" | "Shortlisted" | "Interviewing" | "Offered" | "Rejected"
export type CompensationType = "full_time" | "internship" | "stipend_with_ppo" | "freelance"

export interface CompanyProfile {
  id: string
  institute_id: string
  name: string
  logo_url: string | null
  website: string | null
  description: string | null
  created_at?: string
  updated_at?: string
}

export interface OpportunityListItem {
  id: string
  institute_id: string
  company_id: string
  company?: CompanyProfile | null // Joined relation
  title: string
  job_role: string
  job_description: string | null
  location: string | null
  
  // Compensation details
  compensation_type: CompensationType
  ctc_lpa: number | null
  stipend_monthly: number | null
  bond_details: string | null
  
  application_link: string | null
  deadline: string // ISO string
  status: OpportunityStatus
  min_cgpa: number
  
  created_at: string
  updated_at: string
  created_by: string | null
  applications_count?: number
}

export interface OpportunityApplication {
  id: string
  opportunity_id: string
  candidate_id: string
  resume_url: string
  status: ApplicationStatus
  created_at: string
  updated_at: string
  // Joined from profiles
  candidate_name?: string
  candidate_email?: string
  candidate_phone?: string | null
  candidate_course?: string | null
  candidate_passout_year?: number | null
  candidate_cgpa?: number | null
}

export interface CandidateOpportunityListItem extends OpportunityListItem {
  my_application_id: string | null
  my_application_status: ApplicationStatus | null
  my_application_resume_url: string | null
}

export interface OpportunityFormData {
  company_id: string // selected company UUID or "new"
  new_company_name?: string // if company_id === "new"
  new_company_logo_url?: string | null
  new_company_website?: string | null
  new_company_description?: string | null
  
  title: string
  job_role: string
  job_description: string
  location: string
  
  compensation_type: CompensationType
  ctc_lpa: number | null
  stipend_monthly: number | null
  bond_details: string | null
  
  application_link: string | null
  deadline: string
  status: OpportunityStatus
  min_cgpa: number
}
