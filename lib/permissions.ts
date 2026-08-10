import type { AccountType } from "@/lib/supabase/profile";

/**
 * Centralized permission helpers for PlaceTrix RBAC.
 *
 * Use these instead of scattering raw `account_type` string comparisons
 * across the codebase. If a role is ever renamed or a new role is added,
 * update it here and everything inherits the change automatically.
 */
export const Permissions = {
  /** Platform super-admin — bypasses all institute/license gates. */
  isAdmin: (t: AccountType): boolean => t === "admin",

  /** Owner of an institute account (can manage staff, students, license). */
  isPrimary: (t: AccountType): boolean => t === "institute_primary",

  /** Teaching / support staff member under an institute. */
  isStaff: (t: AccountType): boolean => t === "institute_staff",

  /** Placement / TPO officer under an institute. */
  isTPO: (t: AccountType): boolean => t === "institute_placement_officer",

  /** Student / candidate registered under an institute. */
  isCandidate: (t: AccountType): boolean => t === "institute_candidate",

  // ── Compound permissions ─────────────────────────────────────────────────

  /**
   * Any member of an institute (primary, staff, TPO, or candidate).
   * Useful for "must belong to an institute" gates.
   */
  isInstituteUser: (t: AccountType): boolean =>
    t === "institute_primary" ||
    t === "institute_staff" ||
    t === "institute_placement_officer" ||
    t === "institute_candidate",

  /**
   * Institute staff-side users (primary + staff + TPO).
   * These are not students — they manage students or content.
   */
  isInstituteStaffSide: (t: AccountType): boolean =>
    t === "institute_primary" ||
    t === "institute_staff" ||
    t === "institute_placement_officer",

  /**
   * Can manage student records (verify, invite, remove).
   * Only the primary account holder can do this.
   */
  canManageStudents: (t: AccountType): boolean => t === "institute_primary",

  /**
   * Can manage placement drives, job postings, and applications.
   * Both primary and TPO roles can do this.
   */
  canManagePlacement: (t: AccountType): boolean =>
    t === "institute_placement_officer" || t === "institute_primary",

  /**
   * Can create and manage tests.
   * Staff-side users — not candidates.
   */
  canManageTests: (t: AccountType): boolean =>
    t === "institute_primary" ||
    t === "institute_staff" ||
    t === "institute_placement_officer",

  /**
   * Platform admin or primary institute owner — top-level management.
   */
  isAdminOrPrimary: (t: AccountType): boolean =>
    t === "admin" || t === "institute_primary",
} as const;
