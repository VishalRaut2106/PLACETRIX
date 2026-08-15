"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export type TransitionVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "rectangle"
  | "star"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
  variant?: TransitionVariant
  fromCenter?: boolean
}

function polygonCollapsed(point: string, vertexCount: number): string {
  const pairs = Array.from({ length: vertexCount }, () => point).join(", ")
  return `polygon(${pairs})`
}

function getThemeTransitionClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`
  const point = (x: number, y: number) => `${toX(x)} ${toY(y)}`
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`

  switch (variant) {
    case "circle":
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx)
      const halfH = Math.max(cy, viewportHeight - cy)
      const halfSide = Math.max(halfW, halfH) * 1.05
      const end = [
        point(cx - halfSide, cy - halfSide),
        point(cx + halfSide, cy - halfSide),
        point(cx + halfSide, cy + halfSide),
        point(cx - halfSide, cy + halfSide),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case "triangle": {
      const scale = maxRadius * 2.2
      const dx = (Math.sqrt(3) / 2) * scale
      const verts = [
        point(cx, cy - scale),
        point(cx + dx, cy + 0.5 * scale),
        point(cx - dx, cy + 0.5 * scale),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 3), `polygon(${verts})`]
    }
    case "diamond": {
      const R = maxRadius * Math.SQRT2
      const end = [
        point(cx, cy - R),
        point(cx + R, cy),
        point(cx, cy + R),
        point(cx - R, cy),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case "hexagon": {
      const R = maxRadius * Math.SQRT2
      const verts: string[] = []
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3
        verts.push(point(cx + R * Math.cos(a), cy + R * Math.sin(a)))
      }
      return [
        polygonCollapsed(point(cx, cy), 6),
        `polygon(${verts.join(", ")})`,
      ]
    }
    case "rectangle": {
      const halfW = Math.max(cx, viewportWidth - cx)
      const halfH = Math.max(cy, viewportHeight - cy)
      const end = [
        point(cx - halfW, cy - halfH),
        point(cx + halfW, cy - halfH),
        point(cx + halfW, cy + halfH),
        point(cx - halfW, cy + halfH),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case "star": {
      const R = maxRadius * Math.SQRT2 * 1.03
      const innerRatio = 0.42
      const starPolygon = (radius: number) => {
        const verts: string[] = []
        for (let i = 0; i < 5; i++) {
          const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5
          verts.push(
            point(
              cx + radius * Math.cos(outerA),
              cy + radius * Math.sin(outerA)
            )
          )
          const innerA = outerA + Math.PI / 5
          verts.push(
            point(
              cx + radius * innerRatio * Math.cos(innerA),
              cy + radius * innerRatio * Math.sin(innerA)
            )
          )
        }
        return `polygon(${verts.join(", ")})`
      }
      const startR = Math.max(2, R * 0.025)
      return [starPolygon(startR), starPolygon(R)]
    }
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
  }
}

export const AnimatedThemeToggler = React.forwardRef<
  HTMLButtonElement,
  AnimatedThemeTogglerProps
>(
  (
    {
      className,
      duration = 400,
      variant = "circle",
      fromCenter = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const internalRef = useRef<HTMLButtonElement | null>(null)
    const isTransitioningRef = useRef(false)
    const activeAnimRef = useRef<Animation | null>(null)

    // Merged ref handler so internalRef is always populated even when wrapped in Radix TooltipTrigger asChild
    const setButtonRef = useCallback(
      (node: HTMLButtonElement | null) => {
        internalRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref && typeof ref === "object") {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
        }
      },
      [ref]
    )

    useEffect(() => {
      setMounted(true)
    }, [])

    const cancelAnim = useCallback(() => {
      activeAnimRef.current?.cancel()
      activeAnimRef.current = null
    }, [])

    useEffect(() => {
      return () => {
        cancelAnim()
        const root = document.documentElement
        if (root.dataset.magicuiThemeVt !== "active") return
        delete root.dataset.magicuiThemeVt
        root.style.removeProperty("--magicui-theme-toggle-vt-duration")
        root.style.removeProperty("--magicui-theme-vt-clip-from")
      }
    }, [cancelAnim])

    const isDark = resolvedTheme === "dark"

    const toggleTheme = useCallback(
      (e?: React.MouseEvent<HTMLButtonElement>) => {
        const button =
          (e?.currentTarget as HTMLButtonElement | null) ||
          internalRef.current ||
          (typeof ref === "object" && ref ? ref.current : null)

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let x: number
        let y: number
        if (fromCenter || !button) {
          x = viewportWidth / 2
          y = viewportHeight / 2
        } else {
          const { top, left, width, height } = button.getBoundingClientRect()
          x = left + width / 2
          y = top + height / 2
        }

        const maxRadius = Math.hypot(
          Math.max(x, viewportWidth - x),
          Math.max(y, viewportHeight - y)
        )

        const nextTheme = isDark ? "light" : "dark"

        const applyTheme = () => {
          setTheme(nextTheme)
        }

        if (typeof document.startViewTransition !== "function") {
          applyTheme()
          return
        }

        if (isTransitioningRef.current || document.documentElement.dataset.magicuiThemeVt === "active") {
          applyTheme()
          return
        }

        const clipPath = getThemeTransitionClipPaths(
          variant,
          x,
          y,
          maxRadius,
          viewportWidth,
          viewportHeight
        )

        const root = document.documentElement
        root.dataset.magicuiThemeVt = "active"
        root.style.setProperty(
          "--magicui-theme-toggle-vt-duration",
          `${duration}ms`
        )
        root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0])

        const cleanup = () => {
          isTransitioningRef.current = false
          delete root.dataset.magicuiThemeVt
          root.style.removeProperty("--magicui-theme-toggle-vt-duration")
          root.style.removeProperty("--magicui-theme-vt-clip-from")
          cancelAnim()
        }

        isTransitioningRef.current = true
        const transition = document.startViewTransition(() => {
          flushSync(applyTheme)
        })

        if (typeof transition?.finished?.finally === "function") {
          transition.finished.finally(cleanup).catch(() => {})
        } else {
          cleanup()
        }

        const ready = transition?.ready
        if (ready && typeof ready.then === "function") {
          ready
            .then(() => {
              const anim = document.documentElement.animate(
                {
                  clipPath,
                },
                {
                  duration,
                  easing: variant === "star" ? "linear" : "ease-in-out",
                  fill: "forwards",
                  pseudoElement: "::view-transition-new(root)",
                }
              )
              activeAnimRef.current = anim
            })
            .catch(() => {})
        }
      },
      [variant, fromCenter, duration, isDark, setTheme, cancelAnim, ref]
    )

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      toggleTheme(e)
      onClick?.(e)
    }

    if (!mounted) {
      return (
        <button
          type="button"
          ref={setButtonRef}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer",
            className
          )}
          {...props}
          onClick={handleClick}
        >
          <Sun className="size-4" />
          <span className="sr-only">Toggle theme</span>
        </button>
      )
    }

    return (
      <button
        type="button"
        ref={setButtonRef}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer",
          className
        )}
        {...props}
        onClick={handleClick}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        <span className="sr-only">Toggle theme</span>
      </button>
    )
  }
)

AnimatedThemeToggler.displayName = "AnimatedThemeToggler"
