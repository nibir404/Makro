"use client"

import { useParams, usePathname } from "next/navigation"

export type Mode = "canvas" | "classic"
export const MODES: Mode[] = ["canvas", "classic"]

/** Current UI mode, read from the first URL segment (/canvas/... or /classic/...). */
export function useMode(): Mode {
  const p = useParams<{ mode?: string }>()
  return p?.mode === "classic" ? "classic" : "canvas"
}

/** Build a link inside the current mode: `href("/inbox")` → `/canvas/inbox`. */
export function useHref() {
  const mode = useMode()
  return (path = "") => `/${mode}${path.startsWith("/") || path === "" ? path : `/${path}`}`
}

/** Same page in the other mode — powers the Canvas / Classic toggle. */
export function useSwapModeHref() {
  const pathname = usePathname() ?? "/canvas"
  return (target: Mode) => pathname.replace(/^\/(canvas|classic)/, `/${target}`)
}

/** Path segments after the mode, e.g. ["services","order-service"]. */
export function useSegments() {
  const pathname = usePathname() ?? ""
  return pathname.split("/").filter(Boolean).slice(1)
}
