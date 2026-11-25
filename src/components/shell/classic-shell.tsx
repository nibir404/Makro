"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  House,
  Boxes,
  Inbox,
  Activity,
  CloudCog,
  Shield,
  KeyRound,
  Radio,
  Database,
  FolderKanban,
  BookOpen,
  Settings,
  PanelLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useSegments } from "@/lib/mode"
import { inbox, me } from "@/lib/data"
import { BrandMark, UserAvatar } from "@/components/idp/kit"
import { ModeToggle, SearchTrigger } from "./shared"
import { AvatarMenu, NotificationsButton } from "./overlays"
import { NamespaceSwitcher } from "./canvas-shell"

type Item = { label: string; path: string; icon: React.ComponentType<{ className?: string }>; match: string; badge?: number }

const MAIN: Item[] = [
  { label: "Home", path: "/", icon: House, match: "" },
  { label: "Services", path: "/services", icon: Boxes, match: "services" },
  { label: "Inbox", path: "/inbox", icon: Inbox, match: "inbox", badge: inbox.length },
  { label: "Activity", path: "/activity", icon: Activity, match: "activity" },
]
const PLATFORM: Item[] = [
  { label: "Infrastructure", path: "/infra", icon: CloudCog, match: "infra" },
  { label: "Network access", path: "/network", icon: Shield, match: "network" },
  { label: "Secrets", path: "/secrets", icon: KeyRound, match: "secrets" },
  { label: "Kafka", path: "/kafka", icon: Radio, match: "kafka" },
  { label: "Postgres", path: "/postgres", icon: Database, match: "postgres" },
  { label: "Projects", path: "/projects", icon: FolderKanban, match: "projects" },
]

const CollapseCtx = React.createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} })

function SideLink({ item, active }: { item: Item; active: boolean }) {
  const href = useHref()
  const { collapsed } = React.useContext(CollapseCtx)
  const Icon = item.icon
  return (
    <Link
      href={href(item.path)}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-8 shrink-0 items-center gap-2.5 rounded-[7px] px-2.5 text-[13px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="classic-side-pill"
          className="absolute inset-0 -z-10 rounded-[7px] bg-surface-2"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className="size-[15px] shrink-0 transition-transform group-hover:scale-110" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="rounded-[9px] bg-foreground px-1.5 py-px text-[11px] leading-3.5 font-semibold text-page">{item.badge}</span>
      ) : null}
      {collapsed && item.badge ? <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-primary" /> : null}
    </Link>
  )
}

export function ClassicSidebar() {
  const seg = useSegments()
  const section = seg[0] ?? ""
  const { collapsed, toggle } = React.useContext(CollapseCtx)
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="sticky top-0 flex h-screen shrink-0 flex-col gap-3.5 overflow-hidden border-r border-line bg-page px-3 py-3.5"
    >
      <div className={cn("flex items-center gap-2.5 px-1 py-0.5", collapsed && "flex-col")}>
        <BrandMark className="size-6.5" />
        {!collapsed && (
          <div className="flex flex-1 flex-col">
            <span className="text-[13px] leading-4 font-semibold text-foreground">makro IDP</span>
            <span className="text-[11px] leading-3.5 text-subtle">Internal platform</span>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-[6px] p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <PanelLeft className="size-[15px]" />
        </button>
      </div>
      {!collapsed && <SearchTrigger variant="classic" />}
      <nav className="flex flex-col gap-0.5">
        {MAIN.map((i) => (
          <SideLink key={i.path} item={i} active={section === i.match} />
        ))}
      </nav>
      <nav className="flex flex-col gap-0.5">
        {!collapsed && <div className="px-2.5 pb-1.5 text-[11px] tracking-[0.08em] text-[#646464]">PLATFORM</div>}
        {PLATFORM.map((i) => (
          <SideLink key={i.path} item={i} active={section === i.match} />
        ))}
      </nav>
      <div className="flex-1" />
      <nav className="flex flex-col gap-0.5">
        <SideLink item={{ label: "Docs", path: "/whats-new", icon: BookOpen, match: "docs" }} active={false} />
        <SideLink item={{ label: "Settings", path: "/profile", icon: Settings, match: "settings" }} active={false} />
      </nav>
      <AvatarMenu
        align="start"
        trigger={
          <button className="flex items-center gap-2.5 border-t border-line px-1.5 pt-2 pb-0 text-left outline-none">
            <UserAvatar className="size-6.5" />
            {!collapsed && (
              <span className="flex flex-1 flex-col">
                <span className="text-[13px] leading-4 text-foreground">{me.name}</span>
                <span className="text-[11px] leading-3.5 text-subtle">{me.team}</span>
              </span>
            )}
          </button>
        }
      />
    </motion.aside>
  )
}

const LABELS: Record<string, string> = {
  "": "Home",
  services: "Services",
  inbox: "Inbox",
  activity: "Activity",
  infra: "Infrastructure",
  network: "Network access",
  secrets: "Secrets",
  kafka: "Kafka",
  postgres: "Postgres",
  projects: "Projects",
  profile: "Profile",
  "whats-new": "What's new",
  status: "Platform status",
  patterns: "Patterns",
  overview: "Overview",
}
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "": House,
  services: Boxes,
  inbox: Inbox,
  activity: Activity,
  infra: CloudCog,
  network: Shield,
  secrets: KeyRound,
  kafka: Radio,
  postgres: Database,
  projects: FolderKanban,
}

export function ClassicTopbar({ crumbs }: { crumbs?: React.ReactNode }) {
  const href = useHref()
  const seg = useSegments()
  const section = seg[0] ?? ""
  const Icon = ICONS[section] ?? House
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-line bg-page/85 px-7 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-[7px] border border-line-3 bg-[#121212] light:bg-surface">
            <BrandMark className="size-4" />
          </span>
          <NamespaceSwitcher className="font-semibold" />
        </div>
        <ChevronRight className="size-3.5 text-faint" />
        {crumbs ?? (
          <Link href={href(`/${section}`)} className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className="size-[15px]" />
            {LABELS[section] ?? section}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle variant="classic" />
        <NotificationsButton />
      </div>
    </header>
  )
}

const SIDEBAR_KEY = "idp-sidebar"
function readSidebar() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1"
  } catch {
    return false
  }
}
function subscribeSidebar(cb: () => void) {
  window.addEventListener(SIDEBAR_KEY, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(SIDEBAR_KEY, cb)
    window.removeEventListener("storage", cb)
  }
}

export function ClassicShell({ children }: { children: React.ReactNode }) {
  const collapsed = React.useSyncExternalStore(subscribeSidebar, readSidebar, () => false)
  const pathname = usePathname()
  const toggle = () => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "0" : "1")
    } catch {}
    window.dispatchEvent(new Event(SIDEBAR_KEY))
  }
  return (
    <CollapseCtx.Provider value={{ collapsed, toggle }}>
      <div className="flex min-h-screen bg-page">
        <ClassicSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname?.split("/").slice(0, 4).join("/")}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </CollapseCtx.Provider>
  )
}

export { ChevronDown as _ChevronDown }
