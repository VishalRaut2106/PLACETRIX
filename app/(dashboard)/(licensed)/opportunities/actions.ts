// app/(dashboard)/(licensed)/opportunities/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import type { OpportunityFormData, ApplicationStatus } from "./types"

// Helper to enforce placement officer/primary admin roles
async function requirePlacementStaff() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (!["institute_primary", "institute_placement_officer", "admin"].includes(profile.account_type)) {
    throw new Error("Unauthorized: Only placement officers or primary admins can perform this action.")
  }
  return profile
}

// Helper to enforce candidate role
async function requireCandidate() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (profile.account_type !== "institute_candidate") {
    throw new Error("Only candidates can perform this action.")
  }
  return profile
}

// ─── Staff Actions ────────────────────────────────────────────────────────────

export async function createOpportunityAction(data: OpportunityFormData) {
  const profile = await requirePlacementStaff()
  const supabase = await createClient()

  let finalCompanyId = data.company_id

  // 1. Handle New Company Upsert
  if (data.company_id === "new" && data.new_company_name) {
    const { data: comp, error: compErr } = await (supabase as any)
      .from("companies")
      .insert({
        institute_id: profile.institute_id,
        name: data.new_company_name.trim(),
        logo_url: data.new_company_logo_url || null,
        website: data.new_company_website || null,
        description: data.new_company_description || null
      })
      .select("id")
      .maybeSingle()

    if (compErr || !comp) {
      console.error("Error creating company:", compErr)
      throw new Error(compErr?.message || "Failed to create company profile.")
    }
    finalCompanyId = comp.id
  }

  // 2. Insert Opportunity
  const { data: opp, error } = await (supabase as any)
    .from("opportunities")
    .insert({
      institute_id: profile.institute_id,
      company_id: finalCompanyId,
      title: data.title,
      job_role: data.job_role,
      job_description: data.job_description || null,
      location: data.location || null,
      compensation_type: data.compensation_type,
      ctc_lpa: data.ctc_lpa ?? null,
      stipend_monthly: data.stipend_monthly ?? null,
      bond_details: data.bond_details || null,
      application_link: data.application_link || null,
      deadline: data.deadline,
      status: data.status,
      min_cgpa: data.min_cgpa || 0,
      created_by: profile.id
    })
    .select("id")
    .maybeSingle()

  if (error || !opp) {
    console.error("Error creating opportunity:", error)
    throw new Error(error?.message || "Failed to create opportunity.")
  }

  revalidatePath("/opportunities")
  return { success: true, opportunityId: opp.id }
}

export async function updateOpportunityAction(oppId: string, data: OpportunityFormData) {
  const profile = await requirePlacementStaff()
  const supabase = await createClient()

  let finalCompanyId = data.company_id

  // 1. Handle New Company Upsert
  if (data.company_id === "new" && data.new_company_name) {
    const { data: comp, error: compErr } = await (supabase as any)
      .from("companies")
      .insert({
        institute_id: profile.institute_id,
        name: data.new_company_name.trim(),
        logo_url: data.new_company_logo_url || null,
        website: data.new_company_website || null,
        description: data.new_company_description || null
      })
      .select("id")
      .maybeSingle()

    if (compErr || !comp) {
      console.error("Error creating company:", compErr)
      throw new Error(compErr?.message || "Failed to create company profile.")
    }
    finalCompanyId = comp.id
  }

  // 2. Update Opportunity
  const { error } = await (supabase as any)
    .from("opportunities")
    .update({
      company_id: finalCompanyId,
      title: data.title,
      job_role: data.job_role,
      job_description: data.job_description || null,
      location: data.location || null,
      compensation_type: data.compensation_type,
      ctc_lpa: data.ctc_lpa ?? null,
      stipend_monthly: data.stipend_monthly ?? null,
      bond_details: data.bond_details || null,
      application_link: data.application_link || null,
      deadline: data.deadline,
      status: data.status,
      min_cgpa: data.min_cgpa || 0,
      updated_at: new Date().toISOString()
    })
    .eq("id", oppId)

  if (error) {
    console.error("Error updating opportunity:", error)
    throw new Error(error.message || "Failed to update opportunity.")
  }

  revalidatePath("/opportunities")
  return { success: true }
}

export async function deleteOpportunityAction(oppId: string) {
  await requirePlacementStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("opportunities")
    .delete()
    .eq("id", oppId)

  if (error) {
    console.error("Error deleting opportunity:", error)
    throw new Error(error.message || "Failed to delete opportunity.")
  }

  revalidatePath("/opportunities")
  return { success: true }
}

export async function updateApplicationStatusAction(applicationId: string, status: ApplicationStatus) {
  await requirePlacementStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("opportunity_applications")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", applicationId)

  if (error) {
    console.error("Error updating application status:", error)
    throw new Error(error.message || "Failed to update status.")
  }

  revalidatePath("/opportunities")
  return { success: true }
}

// ─── Candidate Actions ────────────────────────────────────────────────────────

export async function applyToOpportunityAction(oppId: string, resumeUrl: string) {
  const profile = await requireCandidate()
  const supabase = await createClient()

  // 1. Fetch opportunity details
  const { data: opp, error: fetchErr } = await (supabase as any)
    .from("opportunities")
    .select("status, deadline, min_cgpa")
    .eq("id", oppId)
    .maybeSingle()

  if (fetchErr || !opp) throw new Error("Opportunity not found.")
  if (opp.status !== "Published") throw new Error("Opportunity is not accepting applications.")
  if (new Date(opp.deadline) < new Date()) throw new Error("Application deadline has passed.")

  // 2. Validate CGPA eligibility criteria
  if (opp.min_cgpa && opp.min_cgpa > 0) {
    // Fetch grades to compute CGPA
    const { data: grades } = await (supabase as any)
      .from("candidate_semester_grades")
      .select("sgpa")
      .eq("profile_id", profile.id)

    const sgpas = (grades || []).map((g: any) => parseFloat(g.sgpa)).filter((v: number) => !isNaN(v))
    const calculatedCgpa = sgpas.length > 0 ? sgpas.reduce((acc: number, v: number) => acc + v, 0) / sgpas.length : 0

    if (calculatedCgpa < opp.min_cgpa) {
      throw new Error(`You are not eligible: Minimum CGPA required is ${opp.min_cgpa}. Your CGPA is ${calculatedCgpa.toFixed(2)}.`)
    }
  }

  // 3. Insert application
  const { error: insertErr } = await (supabase as any)
    .from("opportunity_applications")
    .insert({
      opportunity_id: oppId,
      candidate_id: profile.id,
      resume_url: resumeUrl,
      status: "Applied"
    })

  if (insertErr) {
    console.error("Error applying to opportunity:", insertErr)
    if (insertErr.code === "23505") {
      throw new Error("You have already applied to this opportunity.")
    }
    throw new Error(insertErr.message || "Failed to apply to opportunity.")
  }

  revalidatePath("/opportunities")
  return { success: true }
}
