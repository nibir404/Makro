"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { Boxes, Inbox, Activity, Layers, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useSegments } from "@/lib/mode"
import { inbox, namespaces, services } from "@/lib/data"
import { BrandMark, UserAvatar } from "@/components/idp/kit"
import { ModeToggle, SearchTrigger } from "./shared"
import { AvatarMenu, PlatformMenu } from "./overlays"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function TopNavItem({
  href,
  active,
  icon: Icon,
  children,
  asButton,
}: {
  href?: string
  active?: boolean
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  asButton?: boolean
}) {
  const inner = (
    <>
      {active && (
        <motion.span
          layoutId="canvas-topnav-pill"
          className="absolute inset-0 -z-10 rounded-[7px] bg-surface-2"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className="size-3.5" />
      {children}
    </>
  )
  const cls = cn(
    "relative z-0 flex h-7.5 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] transition-colors",
    active ? "font-medium text-foreground" : "text-subtle hover:text-foreground",
  )
  if (asButton) return <span className={cls}>{inner}</span>
  return (
    <Link href={href!} className={cls}>
      {inner}
    </Link>
  )
}

export function NamespaceSwitcher({ className }: { className?: string }) {
  const href = useHref()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2",
              className,
            )}
          />
        }
      >
        commerce
        <ChevronDown className="size-3.5 text-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-[260px] border-line-3 bg-popover p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] tracking-[0.08em] text-subtle uppercase">Your namespaces</DropdownMenuLabel>
        {namespaces.map((n) => (
          <DropdownMenuItem key={n.id} className="gap-2.5 px-2 py-2 text-[13px]">
            <span className="flex size-6 items-center justify-center rounded-[6px] border border-line-3 bg-surface-2 font-mono text-[11px] uppercase">
              {n.name[0]}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-foreground">{n.name}</span>
              <span className="text-xs text-subtle">
                {n.services} services · {n.role}
              </span>
            </span>
            {n.id === "commerce" && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={href("/projects")} />} className="px-2 py-2 text-[13px]">
          All projects…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ServiceSwitcher({ current }: { current: string }) {
  const href = useHref()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2" />
        }
      >
        {current}
        <ChevronDown className="size-3.5 text-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-[240px] border-line-3 bg-popover p-1.5">
        {services
          .filter((s) => s.namespace === "commerce")
          .map((s) => (
            <DropdownMenuItem key={s.id} render={<Link href={href(`/services/${s.id}`)} />} className="gap-2 px-2 py-2 text-[13px]">
              <span className="flex gap-1">
                {s.envHealth.map((h, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-1.5 rounded-full",
                      { ok: "bg-success", warn: "bg-warning", fail: "bg-destructive", busy: "bg-info", idle: "bg-faint" }[h],
                    )}
                  />
                ))}
              </span>
              {s.name}
              {s.id === current && <Check className="ml-auto size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CanvasTopbar() {
  const href = useHref()
  const seg = useSegments()
  const section = seg[0] ?? ""
  const inService = section === "services" && seg[1] && seg[1] !== "new"
  const platform = ["infra", "network", "secrets", "kafka", "postgres", "projects", "status"].includes(section)

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-line bg-page/85 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3.5">
        <Link href={href("/")} aria-label="Home" className="transition-transform hover:scale-105 active:scale-95">
          <BrandMark />
        </Link>
        <span className="text-sm text-faint">/</span>
        <NamespaceSwitcher />
        {inService && (
          <>
            <span className="text-sm text-faint">/</span>
            <ServiceSwitcher current={seg[1]} />
          </>
        )}
      </div>
      <nav className="flex items-center gap-1.5">
        <ModeToggle variant="canvas" />
        <TopNavItem href={href("/")} active={section === "" || section === "services"} icon={Boxes}>
          Services
        </TopNavItem>
        <TopNavItem href={href("/inbox")} active={section === "inbox"} icon={Inbox}>
          Inbox <span className="text-foreground">{inbox.length}</span>
        </TopNavItem>
        <TopNavItem href={href("/activity")} active={section === "activity"} icon={Activity}>
          Activity
        </TopNavItem>
        <PlatformMenu
          trigger={
            <button className="outline-none">
              <TopNavItem asButton active={platform} icon={Layers}>
                Platform <ChevronDown className="size-3" />
              </TopNavItem>
            </button>
          }
        />
        <SearchTrigger variant="canvas" />
        <AvatarMenu
          trigger={
            <button aria-label="Account" className="rounded-full transition-transform hover:scale-105 active:scale-95">
              <UserAvatar />
            </button>
          }
        />
      </nav>
    </header>
  )
}

export function CanvasShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <CanvasTopbar />
      <motion.main
        key={pathname?.split("/").slice(0, 4).join("/")}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.main>
    </div>
  )
}
