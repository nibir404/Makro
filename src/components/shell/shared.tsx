"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMode, useSwapModeHref, type Mode } from "@/lib/mode"
import { Kbd } from "@/components/idp/kit"

/* ------------------------------------------------------------------ */
/* Canvas / Classic toggle                                             */
/* ------------------------------------------------------------------ */

export function ModeToggle({ variant = "canvas" }: { variant?: "canvas" | "classic" }) {
  const mode = useMode()
  const swap = useSwapModeHref()
  const router = useRouter()
  const opts: Mode[] = ["canvas", "classic"]
  return (
    <div
      className={cn(
        "relative flex items-center gap-0.5 rounded-[8px] border",
        variant === "canvas" ? "border-line-2 p-0.5" : "border-line-3 p-0.75",
      )}
      role="tablist"
      aria-label="Layout mode"
    >
      {opts.map((m) => {
        const active = m === mode
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                try {
                  localStorage.setItem("idp-mode", m)
                } catch {}
                router.push(swap(m))
              }
            }}
            className={cn(
              "relative z-10 flex h-6 items-center rounded-sm px-2.25 text-xs capitalize transition-colors",
              active ? "font-medium text-foreground" : "text-subtle hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`mode-pill-${variant}`}
                className="absolute inset-0 -z-10 rounded-sm bg-surface-2"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {m}
          </button>
        )
      })}
    </div>
  )
}

export { CommandMenuProvider, useCommandMenu, PlatformMenu, PLATFORM_MODULES, AvatarMenu, NotificationsButton } from "./overlays"
import { useCommandMenu } from "./overlays"

export function SearchTrigger({ variant }: { variant: "canvas" | "classic" }) {
  const { open } = useCommandMenu()
  if (variant === "canvas")
    return (
      <button
        onClick={() => open()}
        className="flex h-7.5 items-center gap-2 rounded-[8px] border border-line-2 px-2.5 text-subtle transition-colors hover:border-line-3 hover:text-foreground"
      >
        <Search className="size-3.5" />
        <Kbd>⌘K</Kbd>
      </button>
    )
  return (
    <button
      onClick={() => open()}
      className="flex h-8.5 shrink-0 items-center gap-2 rounded-[8px] border border-line-3 px-2.5 text-subtle transition-colors hover:border-faint hover:text-foreground"
    >
      <Search className="size-3.5" />
      <span className="flex-1 text-left text-[13px]">Search or run…</span>
      <Kbd>⌘K</Kbd>
    </button>
  )
}

export function NavLink({
  href,
  active,
  children,
  className,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={cn("relative", className)} data-active={active || undefined}>
      {children}
    </Link>
  )
}
