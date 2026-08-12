import { AppSidebar } from "@/components/app-sidebar"
import { getUserProfileWithLicense } from "@/lib/supabase/profile"
import { DashboardShell } from "@/components/dashboard-shell"
import { LicenseProvider } from "@/components/license/LicenseProvider"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // getUserProfileWithLicense() handles all redirect cases internally and
    // fetches the profile + institute license in a single Supabase round-trip,
    // saving one sequential DB call vs. the previous two-fetch pattern.
    //   • Revoked session (online 401)  → signs out + redirects
    //   • Token expired offline          → redirects
    //   • Network failure + valid JWT   → returns minimal offline profile
    const result = await getUserProfileWithLicense()
    const profile = result?.profile ?? null
    const license = result?.license ?? null

    return (
        <LicenseProvider
            license={license}
            isAdmin={profile?.account_type === "admin"}
            user={profile}
        >
            <DashboardShell
                sidebar={<AppSidebar user={profile} />}
            >
                {children}
            </DashboardShell>
        </LicenseProvider>
    )
}
