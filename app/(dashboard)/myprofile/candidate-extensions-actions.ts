"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { revalidatePath } from "next/cache";

// Ensure candidate is authenticated and authorized
async function getAuthorizedCandidate() {
  const profile = await getUserProfile();
  if (!profile || profile.account_type !== "institute_candidate") {
    throw new Error("Unauthorized");
  }
  return profile;
}

// ─── Bio Actions ──────────────────────────────────────────────────────────────

export async function updateCandidateBioAction(bio: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_profiles")
    .update({ bio })
    .eq("profile_id", profile.id);

  if (error) {
    console.error("updateCandidateBioAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Education Actions ────────────────────────────────────────────────────────

export async function saveEducationAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  // Enforce profile ownership
  const data = {
    ...payload,
    profile_id: profile.id,
  };

  const { error } = await (supabase as any)
    .from("candidate_education")
    .upsert(data);

  if (error) {
    console.error("saveEducationAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteEducationAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_education")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id); // Protect ownership

  if (error) {
    console.error("deleteEducationAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Experience Actions ───────────────────────────────────────────────────────

export async function saveExperienceAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const data = {
    ...payload,
    profile_id: profile.id,
  };

  const { error } = await (supabase as any)
    .from("candidate_experiences")
    .upsert(data);

  if (error) {
    console.error("saveExperienceAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteExperienceAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_experiences")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("deleteExperienceAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Project Actions ──────────────────────────────────────────────────────────

export async function saveProjectAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const data = {
    ...payload,
    profile_id: profile.id,
  };

  const { error } = await (supabase as any)
    .from("candidate_projects")
    .upsert(data);

  if (error) {
    console.error("saveProjectAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_projects")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("deleteProjectAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Certification Actions ────────────────────────────────────────────────────

export async function saveCertificationAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const data = {
    ...payload,
    profile_id: profile.id,
  };

  const { error } = await (supabase as any)
    .from("candidate_certifications")
    .upsert(data);

  if (error) {
    console.error("saveCertificationAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteCertificationAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_certifications")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("deleteCertificationAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}
