"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

function ThemeWireframe({ value }: { value: "light" | "dark" | "system" }) {
  if (value === "system") {
    return (
      <div className="w-full h-36 rounded-lg border border-slate-300 dark:border-slate-800 overflow-hidden relative shadow-2xs flex select-none mb-3 transition-transform duration-200 group-hover:scale-[1.015]">
        {/* Left half: Light theme preview */}
        <div className="w-1/2 h-full bg-slate-100 p-2 border-r border-slate-300 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="size-1.5 rounded-full bg-red-400/80" />
            <div className="size-1.5 rounded-full bg-amber-400/80" />
            <div className="size-1.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex gap-1.5 flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-2/5 bg-white rounded-md p-1.5 border border-slate-200 flex flex-col justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="size-1.5 rounded bg-blue-600 shrink-0" />
                  <div className="h-1 w-6 rounded bg-slate-300" />
                </div>
                <div className="h-1.5 w-full rounded bg-blue-100 flex items-center px-0.5">
                  <div className="h-1 w-3/4 rounded bg-blue-600" />
                </div>
                <div className="h-1.5 w-full rounded bg-slate-100 flex items-center px-0.5">
                  <div className="h-1 w-1/2 rounded bg-slate-300" />
                </div>
              </div>
              <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100">
                <div className="size-2 rounded-full bg-slate-300 shrink-0" />
                <div className="h-1 w-4 rounded bg-slate-400" />
              </div>
            </div>
            {/* Main */}
            <div className="flex-1 flex flex-col gap-1 min-h-0">
              <div className="h-4 bg-white rounded-md border border-slate-200 px-1 flex items-center justify-between">
                <div className="h-1 w-6 rounded bg-slate-400" />
                <div className="size-1.5 rounded-full bg-blue-500" />
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div className="h-7 bg-white rounded-md border border-slate-200 p-1 flex flex-col justify-between">
                  <div className="h-1 w-6 rounded bg-slate-300" />
                  <div className="h-1.5 w-8 rounded bg-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right half: Dark theme preview */}
        <div className="w-1/2 h-full bg-slate-950 p-2 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-end gap-1 mb-1.5">
            <div className="size-1.5 rounded-full bg-slate-700" />
            <div className="size-1.5 rounded-full bg-slate-700" />
          </div>
          <div className="flex gap-1.5 flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-2/5 bg-slate-900 rounded-md p-1.5 border border-slate-800 flex flex-col justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="size-1.5 rounded bg-blue-500 shrink-0" />
                  <div className="h-1 w-6 rounded bg-slate-700" />
                </div>
                <div className="h-1.5 w-full rounded bg-blue-950/60 flex items-center px-0.5">
                  <div className="h-1 w-3/4 rounded bg-blue-400" />
                </div>
                <div className="h-1.5 w-full rounded bg-slate-800 flex items-center px-0.5">
                  <div className="h-1 w-1/2 rounded bg-slate-700" />
                </div>
              </div>
              <div className="flex items-center gap-1 pt-0.5 border-t border-slate-800">
                <div className="size-2 rounded-full bg-slate-700 shrink-0" />
                <div className="h-1 w-4 rounded bg-slate-600" />
              </div>
            </div>
            {/* Main */}
            <div className="flex-1 flex flex-col gap-1 min-h-0">
              <div className="h-4 bg-slate-900 rounded-md border border-slate-800 px-1 flex items-center justify-between">
                <div className="h-1 w-6 rounded bg-slate-600" />
                <div className="size-1.5 rounded-full bg-blue-400" />
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div className="h-7 bg-slate-900 rounded-md border border-slate-800 p-1 flex flex-col justify-between">
                  <div className="h-1 w-6 rounded bg-slate-700" />
                  <div className="h-1.5 w-8 rounded bg-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isDark = value === "dark"

  return (
    <div
      className={cn(
        "w-full h-36 rounded-lg border overflow-hidden p-2 flex flex-col justify-between select-none shadow-2xs mb-3 transition-transform duration-200 group-hover:scale-[1.015]",
        isDark
          ? "bg-slate-950 border-slate-800 text-slate-100"
          : "bg-slate-100 border-slate-200 text-slate-900"
      )}
    >
      {/* App Window Title Bar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-inherit opacity-80">
        <div className="flex items-center gap-1">
          <div className={cn("size-2 rounded-full", isDark ? "bg-red-500/70" : "bg-red-400")} />
          <div className={cn("size-2 rounded-full", isDark ? "bg-amber-500/70" : "bg-amber-400")} />
          <div className={cn("size-2 rounded-full", isDark ? "bg-emerald-500/70" : "bg-emerald-400")} />
        </div>
        <div className={cn("h-1.5 w-20 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200")} />
        <div className={cn("size-2 rounded-full", isDark ? "bg-slate-700" : "bg-slate-300")} />
      </div>

      {/* Main Workspace Layout */}
      <div className="flex gap-2 flex-1 pt-1.5 min-h-0">
        {/* Sidebar Wireframe */}
        <div
          className={cn(
            "w-1/4 rounded-md p-1.5 flex flex-col justify-between border",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <div className="flex flex-col gap-1">
            {/* Logo */}
            <div className="flex items-center gap-1 mb-1">
              <div className={cn("size-2 rounded shrink-0", isDark ? "bg-blue-500" : "bg-blue-600")} />
              <div className={cn("h-1.5 w-8 rounded", isDark ? "bg-slate-700" : "bg-slate-300")} />
            </div>
            {/* Nav items */}
            <div className={cn("h-2 w-full rounded flex items-center px-1", isDark ? "bg-blue-950/60" : "bg-blue-100")}>
              <div className={cn("h-1 w-3/4 rounded", isDark ? "bg-blue-400" : "bg-blue-600")} />
            </div>
            <div className={cn("h-2 w-full rounded flex items-center px-1", isDark ? "bg-slate-800/60" : "bg-slate-100")}>
              <div className={cn("h-1 w-1/2 rounded", isDark ? "bg-slate-700" : "bg-slate-300")} />
            </div>
            <div className={cn("h-2 w-full rounded flex items-center px-1", isDark ? "bg-slate-800/60" : "bg-slate-100")}>
              <div className={cn("h-1 w-2/3 rounded", isDark ? "bg-slate-700" : "bg-slate-300")} />
            </div>
          </div>
          {/* User footer */}
          <div className={cn("flex items-center gap-1 pt-1 border-t", isDark ? "border-slate-800" : "border-slate-100")}>
            <div className={cn("size-2.5 rounded-full shrink-0", isDark ? "bg-slate-700" : "bg-slate-300")} />
            <div className={cn("h-1 w-6 rounded", isDark ? "bg-slate-700" : "bg-slate-400")} />
          </div>
        </div>

        {/* Dashboard Content Area */}
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          {/* Top Header Bar */}
          <div
            className={cn(
              "h-5 rounded-md px-2 flex items-center justify-between border",
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className={cn("h-1.5 w-12 rounded font-medium", isDark ? "bg-slate-600" : "bg-slate-400")} />
            <div className="flex items-center gap-1">
              <div className={cn("size-2 rounded-full", isDark ? "bg-slate-700" : "bg-slate-200")} />
              <div className="size-2 rounded-full bg-blue-500" />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <div
              className={cn(
                "h-10 rounded-md p-1.5 flex flex-col justify-between border",
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className={cn("h-1 w-8 rounded", isDark ? "bg-slate-700" : "bg-slate-300")} />
              <div className="flex items-baseline justify-between">
                <div className={cn("h-2.5 w-6 rounded", isDark ? "bg-blue-400" : "bg-blue-600")} />
                <div className="h-1 w-4 rounded bg-emerald-500" />
              </div>
            </div>
            <div
              className={cn(
                "h-10 rounded-md p-1.5 flex flex-col justify-between border",
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className={cn("h-1 w-10 rounded", isDark ? "bg-slate-700" : "bg-slate-300")} />
              <div className="flex items-baseline justify-between">
                <div className={cn("h-2.5 w-8 rounded", isDark ? "bg-slate-400" : "bg-slate-700")} />
                <div className="h-1 w-3 rounded bg-blue-500" />
              </div>
            </div>
          </div>

          {/* Content Table / Row Placeholder */}
          <div
            className={cn(
              "flex-1 rounded-md p-1.5 flex flex-col gap-1 border min-h-0 justify-center",
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className={cn("h-1.5 w-full rounded flex items-center justify-between px-1", isDark ? "bg-slate-800/80" : "bg-slate-100")}>
              <div className={cn("h-1 w-10 rounded", isDark ? "bg-slate-600" : "bg-slate-400")} />
              <div className="h-1 w-4 rounded bg-emerald-500/80" />
            </div>
            <div className={cn("h-1.5 w-full rounded flex items-center justify-between px-1", isDark ? "bg-slate-800/40" : "bg-slate-50")}>
              <div className={cn("h-1 w-12 rounded", isDark ? "bg-slate-700" : "bg-slate-300")} />
              <div className="h-1 w-4 rounded bg-amber-500/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    description: "Clean, bright interface designed for daylight environments",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Sleek, dark interface optimized for low-light conditions",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Automatically matches your system's appearance setting",
    icon: Monitor,
  },
]

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how PlaceTrix looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how PlaceTrix looks on your device. Select your preferred color mode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon
            const isActive = theme === option.value

            return (
              <div
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border-2 p-3.5 cursor-pointer transition-all duration-200 hover:border-primary/50",
                  isActive
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 bg-card hover:bg-accent/40"
                )}
              >
                {/* Visual Wireframe Preview Box */}
                <ThemeWireframe value={option.value as "light" | "dark" | "system"} />

                {/* Info & Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      {option.label}
                    </span>
                    {isActive && (
                      <span className="flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

