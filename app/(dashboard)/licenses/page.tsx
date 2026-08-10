import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import { getAllInstitutesAndLicenses } from "@/lib/supabase/license";
import { LicensesClient } from "./LicensesClient";

export const metadata = {
  title: "License Management | PlaceTrix Admin",
  description: "Manage PlaceTrix licenses and plans for colleges.",
};

export default async function LicensesPage() {
  const profile = await getUserProfile();

  // Guard: Only platform admins can access the license dashboard
  if (!profile || profile.account_type !== "admin") {
    redirect("/home");
  }

  const institutes = await getAllInstitutesAndLicenses();

  // Normalize structure for client consumption
  const normalizedInstitutes = (institutes || []).map((inst: any) => {
    const lic = Array.isArray(inst.institute_licenses)
      ? inst.institute_licenses[0]
      : inst.institute_licenses || null;

    const now = new Date();
    const endsAt = lic?.ends_at ? new Date(lic.ends_at) : null;
    const effectiveStatus =
      lic?.status === "active" && endsAt && endsAt < now
        ? "expired"
        : (lic?.status || null);

    return {
      id: inst.id,
      institute_name: inst.institute_name,
      logo_path: inst.logo_path || null,
      license: lic
        ? {
          id: lic.id,
          status: effectiveStatus,
          plan_name: lic.plan_name,
          starts_at: lic.starts_at,
          ends_at: lic.ends_at,
          notes: lic.notes,
        }
        : null,
    };
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          License Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Assign, extend, and manage B2B college licenses and subscriptions.
        </p>
      </div>

      <LicensesClient initialInstitutes={normalizedInstitutes} />
    </div>
  );
}
