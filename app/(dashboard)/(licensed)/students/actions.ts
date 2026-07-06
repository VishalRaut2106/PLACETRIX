"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import { revalidatePath } from "next/cache"

export async function toggleStudentVerification(studentId: string, verified: boolean) {
  const profile = await getUser()
  if (!profile || profile.account_type !== "institute_primary") {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()

  // Verify the student belongs to this institute
  const { data: candidateProfile } = await (supabase as any)
    .from("profiles")
    .select("institute_id")
    .eq("id", studentId)
    .maybeSingle();

  if (candidateProfile?.institute_id !== profile.institute_id) {
    throw new Error("Student does not belong to your institute");
  }

  const { data, error } = await (supabase as any)
    .from("profiles")
    .update({ institute_verified: verified })
    .eq("id", studentId)
    .select()

  if (error) {
    console.error("Supabase Error:", error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    console.error("No rows updated. StudentId:", studentId, "InstituteId:", profile.id)
    throw new Error("Action failed. Student profile not found or already in sync.")
  }

  revalidatePath("/students")
}
