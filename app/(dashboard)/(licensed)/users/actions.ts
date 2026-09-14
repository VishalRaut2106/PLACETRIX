"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import { revalidatePath } from "next/cache"

export async function createAccount(params: {
  email: string
  role: "institute_candidate" | "institute_staff" | "institute_placement_officer"
  course_id?: string | null
  passout_year?: number | null
}) {
  const profile = await getUser()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Unauthorized: Only institute primary or placement officer accounts can create users.")
  }

  const supabase = await createClient()

  // Invoke the Supabase Edge Function to create the account
  const { data, error } = await supabase.functions.invoke("create-account", {
    body: params,
  })

  if (error) {
    console.error("Edge Function Invocation Error:", error)
    throw new Error(error.message || "Failed to create account through Edge Function.")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  revalidatePath("/users")

  return data
}

export async function getInstituteCourses() {
  const profile = await getUser()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from("institute_courses")
    .select("id, course_name")
    .eq("institute_id", profile.institute_id)
    .order("course_name", { ascending: true })

  if (error) {
    console.error("Error fetching institute courses:", error)
    throw new Error(error.message)
  }

  return data || []
}
