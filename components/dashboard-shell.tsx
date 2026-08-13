"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { DashboardTopbar } from "@/components/dashboard-topbar"
import { AppSidebarNav } from "@/components/app-sidebar"
import type { UserProfile } from "@/lib/supabase/profile"


import { NotificationProvider } from "@/components/notifications/notification-provider"

// ─── DashboardShell ───────────────────────────────────────────────────────────

interface DashboardShellProps {
  user: UserProfile | null
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Reset scroll on route change; close mobile sidebar on navigate
  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0)
    }
    setMobileOpen(false)
  }, [pathname])

  return (
    <NotificationProvider user={user}>
      <div className="relative flex h-svh w-full overflow-hidden bg-background">
        {/* ── Sidebar (full screen height on left edge) ── */}
        <AppSidebarNav
          user={user}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* ── Main Column (sits to the right of sidebar) ── */}
        <div className="flex flex-1 flex-col min-w-0 h-svh overflow-hidden md:ml-12">
          {/* ── Topbar ─────────────────────────────────── */}
          <DashboardTopbar
            user={user}
            onMenuClick={() => setMobileOpen((v) => !v)}
            mobileOpen={mobileOpen}
          />

          {/* ── Page content ──────────────────────────── */}
          <main
            ref={contentRef}
            className="flex flex-1 flex-col min-w-0 overflow-y-auto"
          >
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-1 flex-col gap-4">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  )
}

