// app/(dashboard)/(licensed)/companies/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"

// Helper to enforce placement officer/primary admin roles
async function requirePlacementStaff() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (!["institute_primary", "institute_placement_officer", "admin"].includes(profile.account_type)) {
    throw new Error("Unauthorized: Only placement officers or primary admins can perform this action.")
  }
  return profile
}

export async function createCompanyAction(data: {
  name: string
  logo_url?: string | null
  website?: string | null
  description?: string | null
}) {
  const profile = await requirePlacementStaff()
  const supabase = await createClient()

  if (!data.name || !data.name.trim()) {
    throw new Error("Company name is required.")
  }

  const { data: comp, error } = await (supabase as any)
    .from("companies")
    .insert({
      institute_id: profile.institute_id,
      name: data.name.trim(),
      logo_url: data.logo_url || null,
      website: data.website || null,
      description: data.description || null
    })
    .select("id")
    .maybeSingle()

  if (error || !comp) {
    console.error("Error creating company:", error)
    throw new Error(error?.message || "Failed to create company profile.")
  }

  revalidatePath("/companies")
  revalidatePath("/opportunities")
  return { success: true, companyId: comp.id }
}

export async function updateCompanyAction(
  companyId: string,
  data: {
    name: string
    logo_url?: string | null
    website?: string | null
    description?: string | null
  }
) {
  const profile = await requirePlacementStaff()
  const supabase = await createClient()

  if (!data.name || !data.name.trim()) {
    throw new Error("Company name is required.")
  }

  const { error } = await (supabase as any)
    .from("companies")
    .update({
      name: data.name.trim(),
      logo_url: data.logo_url || null,
      website: data.website || null,
      description: data.description || null
    })
    .eq("id", companyId)
    .eq("institute_id", profile.institute_id)

  if (error) {
    console.error("Error updating company:", error)
    throw new Error(error?.message || "Failed to update company profile.")
  }

  revalidatePath("/companies")
  revalidatePath("/opportunities")
  return { success: true }
}

export async function deleteCompanyAction(companyId: string) {
  const profile = await requirePlacementStaff()
  const supabase = await createClient()

  // First, check if there are opportunities referencing this company
  const { count, error: countErr } = await (supabase as any)
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  if (countErr) {
    console.error("Error checking linked opportunities:", countErr)
  } else if (count && count > 0) {
    throw new Error(`Cannot delete company because it is linked to ${count} job posting${count !== 1 ? "s" : ""}. Please delete or update those postings first.`)
  }

  const { error } = await (supabase as any)
    .from("companies")
    .delete()
    .eq("id", companyId)
    .eq("institute_id", profile.institute_id)

  if (error) {
    console.error("Error deleting company:", error)
    throw new Error(error?.message || "Failed to delete company profile.")
  }

  revalidatePath("/companies")
  revalidatePath("/opportunities")
  return { success: true }
}
