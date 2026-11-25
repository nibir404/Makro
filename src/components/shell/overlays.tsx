"use client"

/* Shell overlays matched to Paper 09a/R1d (⌘K), 09b (avatar), 09f (platform), R1e (notifications). */

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  Search, RotateCcw, Activity, BookOpen, User, KeyRound, Users, ChevronDown, RefreshCw, Rocket, Workflow, Radio, CornerDownLeft,
  TriangleAlert, Settings, CircleCheck, Clock, CircleDot, Inbox, Plus, Layers, Moon, Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode, useSwapModeHref } from "@/lib/mode"
import { me, type Logo } from "@/lib/data"
import { IntegrationLogo, UserAvatar, useHotkey } from "@/components/idp/kit"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/* ------------------------------------------------------------------ */
/* ⌘K                                                                  */
/* ------------------------------------------------------------------ */

type Cmd = {
  id: string
  group: "Actions" | "Jump to" | "Go to" | "Recent" | "Preferences"
  label: string
  sub?: string
  right?: string
  prod?: boolean
  icon?: React.ComponentType<{ className?: string }>
  logo?: Logo
  path?: string
  run?: "dark" | "light" | "swap"
  keys: string
}

const CMDS: Cmd[] = [
  { id: "rb-order", group: "Actions", label: "Roll back order-service · prod", icon: RotateCcw, path: "/services/order-service?op=rollback", keys: "rollback roll back order-service prod" },
  { id: "rb-checkout", group: "Actions", label: "Roll back checkout-api · prod", icon: RotateCcw, path: "/services/checkout-bff?op=rollback", keys: "rollback roll back checkout-api prod" },
  { id: "rot-db", group: "Actions", label: "Rotate DB password · order-service", sub: "commerce · prod · order_service_app", prod: true, icon: RefreshCw, path: "/postgres", keys: "rotate db password order-service" },
  { id: "rot-sid", group: "Actions", label: "Rotate SecretID · commerce-order-service", sub: "Secrets · prod config", icon: RefreshCw, path: "/secrets", keys: "rotate secretid order-service secrets" },
  { id: "restart", group: "Actions", label: "Restart deployment · order-service", sub: "Deployments · choose environment", icon: RefreshCw, path: "/services/order-service", keys: "restart deployment order-service" },
  { id: "add", group: "Actions", label: "Add resource to order-service", icon: Plus, right: "N", path: "/services/order-service/add", keys: "add resource new order-service" },
  { id: "promote", group: "Actions", label: "Promote order-service qa → prod", icon: Rocket, path: "/services/order-service?op=promote", keys: "promote order-service deploy" },
  { id: "j-order", group: "Jump to", label: "order-service", right: "Deployment · 3 envs", icon: Rocket, path: "/services/order-service", keys: "order-service service" },
  { id: "j-canvas", group: "Jump to", label: "order-service canvas", right: "Canvas", icon: Workflow, path: "/services/order-service", keys: "order-service canvas" },
  { id: "j-topic", group: "Jump to", label: "orders.created.v1", right: "Kafka topic · prod", icon: Radio, path: "/kafka", keys: "orders.created.v1 order kafka topic" },
  { id: "j-inbox", group: "Jump to", label: "Inbox", right: "3 to review", icon: Inbox, path: "/inbox", keys: "inbox approvals review" },
  { id: "g-act", group: "Go to", label: "Activity · Rolled back to v1.39.0", right: "today", icon: Activity, path: "/activity/ev-rollback", keys: "rollback activity rolled back" },
  { id: "g-docs", group: "Go to", label: "Docs · How rollbacks work", icon: BookOpen, path: "/whats-new", keys: "rollback docs how" },
  { id: "r-pg", group: "Recent", label: "pg-prod-orders", right: "Postgres", logo: "postgres", path: "/postgres", keys: "pg-prod-orders postgres orders" },
  { id: "p-swap", group: "Preferences", label: "Switch Canvas / Classic", icon: Layers, run: "swap", keys: "switch mode canvas classic layout" },
  { id: "p-dark", group: "Preferences", label: "Dark theme", icon: Moon, run: "dark", keys: "dark theme" },
  { id: "p-light", group: "Preferences", label: "Light theme", icon: Sun, run: "light", keys: "light theme" },
]
const DEFAULT_IDS = ["j-inbox", "add", "promote", "rb-order", "j-order", "j-topic", "r-pg", "p-swap", "p-dark", "p-light"]

const CmdContext = React.createContext<{ open: (q?: string) => void }>({ open: () => {} })
export const useCommandMenu = () => React.useContext(CmdContext)

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  // Reviewers can open a frame directly: ?cmdk=rollb (09a) or ?cmdk=rotate%20order (R1d)
  const cmdkParam = useSearchParams().get("cmdk")
  const [open, setOpen] = React.useState(cmdkParam !== null)
  const [q, setQ] = React.useState(cmdkParam === null || cmdkParam === "1" ? "" : cmdkParam)
  const [idx, setIdx] = React.useState(0)
  const href = useHref()
  const router = useRouter()
  const { setTheme } = useTheme()
  const swap = useSwapModeHref()
  const mode = useMode()
  useHotkey("k", () => setOpen((o) => !o), { meta: true })
  useHotkey("n", () => router.push(href("/services/order-service/add")), { enabled: !open })

  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const list = words.length ? CMDS.filter((c) => words.every((w) => c.keys.includes(w) || c.label.toLowerCase().includes(w))) : CMDS.filter((c) => DEFAULT_IDS.includes(c.id))

  const runCmd = (c: Cmd, newTab = false) => {
    setOpen(false)
    if (c.run === "swap") return router.push(swap(mode === "canvas" ? "classic" : "canvas"))
    if (c.run) return setTheme(c.run)
    if (!c.path) return
    if (newTab) window.open(href(c.path), "_blank")
    else router.push(href(c.path))
    if (c.prod) toast("Prod action — you'll confirm on the next screen")
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIdx((i) => Math.min(list.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIdx((i) => Math.max(0, i - 1))
    }
    else if (e.key === "Enter" && list[idx]) runCmd(list[idx], e.metaKey || e.ctrlKey)
    else if (e.key === "Escape") setOpen(false)
  }
  const groups = Array.from(new Set(list.map((c) => c.group)))
  const rich = list.some((c) => c.sub)

  return (
    <CmdContext.Provider value={{ open: (v) => { setQ(v ?? ""); setOpen(true) } }}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[100] bg-page/60" onMouseDown={() => setOpen(false)}>
            <motion.div
              role="dialog"
              aria-label="Command menu"
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-[120px] left-1/2 w-[640px] -translate-x-1/2 overflow-hidden rounded-[14px] border border-line-3 bg-surface shadow-[0_24px_64px_-12px_#000]"
            >
              <div className="flex h-[56px] items-center gap-3 border-b border-line-2 px-4">
                <Search className="size-4.5 text-muted-foreground" />
                <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setIdx(0) }} onKeyDown={onKey} placeholder="Search services, resources, requests or run a command…" className="flex-1 bg-transparent text-[16px] text-foreground caret-primary outline-none placeholder:text-subtle" />
                <span className="rounded-[5px] border border-line-3 px-1.5 py-0.5 text-[11px] text-muted-foreground">esc</span>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {list.length === 0 && <div className="px-3 py-10 text-center text-[13px] text-subtle">No results for “{q}”. Try a service name, topic or request id.</div>}
                {groups.map((g) => (
                  <div key={g}>
                    <div className="px-2.5 pt-2.5 pb-1.5 font-mono text-[10.5px] tracking-[0.1em] text-subtle uppercase">{g}</div>
                    {list.filter((c) => c.group === g).map((c) => {
                      const i = list.indexOf(c)
                      const on = i === idx
                      const Icon = c.icon
                      return (
                        <button
                          key={c.id}
                          onMouseEnter={() => setIdx(i)}
                          onClick={() => runCmd(c)}
                          className={cn("relative flex w-full items-center gap-3 rounded-[8px] px-2.5 text-left", c.sub ? "py-2" : "h-[34px]")}
                        >
                          {on && <motion.span layoutId="cmdk-hl" className={cn("absolute inset-0 rounded-[8px] bg-surface-2", rich && "border border-line-3")} transition={{ type: "spring", stiffness: 600, damping: 45 }} />}
                          <span className="relative flex size-4 items-center justify-center text-muted-foreground">
                            {c.logo ? <IntegrationLogo name={c.logo} className="size-4" /> : Icon && <Icon className="size-4" />}
                          </span>
                          <span className="relative flex flex-1 flex-col">
                            <span className="text-[14px] text-foreground">{c.label}</span>
                            {c.sub && <span className="text-[12px] text-subtle">{c.sub}</span>}
                          </span>
                          {c.prod && <span className="relative flex h-5 items-center gap-1 rounded-[5px] border border-warning/70 px-1.5 font-mono text-[10px] font-semibold text-warning"><TriangleAlert className="size-2.5" />PROD</span>}
                          {c.right && <span className="relative text-[12px] text-muted-foreground">{c.right}</span>}
                          {on && <CornerDownLeft className="relative size-3.5 text-muted-foreground" />}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="flex h-9 items-center justify-between border-t border-line-2 px-4 font-mono text-[11px] text-muted-foreground">
                <span className="flex gap-4"><span>↑↓ move</span><span>↵ run</span><span>⌘↵ open in new tab</span></span>
                <span className="font-sans">{rich ? "Prod actions still ask to confirm" : "Type > for commands"}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CmdContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* Platform menu · 09f                                                 */
/* ------------------------------------------------------------------ */

export const PLATFORM_MODULES = [
  { label: "Infrastructure", desc: ["12 stacks · ", "1 error", "destructive"], path: "/infra", logo: "pulumi" as Logo, key: "I" },
  { label: "Network access", desc: ["6 grants · ", "1 expiring", "warning"], path: "/network", logo: "netbird" as Logo, key: "N" },
  { label: "Secrets", desc: ["31 projects · ", "2 expiring", "warning"], path: "/secrets", logo: "vault" as Logo, key: "S" },
  { label: "Kafka", desc: ["Topic catalog · users & ACLs"], path: "/kafka", logo: "kafka" as Logo, key: "K" },
  { label: "Postgres", desc: ["Databases · users · rotation"], path: "/postgres", logo: "postgres" as Logo, key: "P" },
  { label: "Projects", desc: ["Members · quotas · spend"], path: "/projects", logo: "argocd" as Logo, key: "J" },
] as const

export function PlatformMenu({ trigger, defaultOpen }: { trigger: React.ReactElement; defaultOpen?: boolean }) {
  const href = useHref()
  const router = useRouter()
  const menuParam = useSearchParams().get("menu")
  const [open, setOpen] = React.useState(!!defaultOpen || menuParam === "platform")
  const [hover, setHover] = React.useState(0)
  const go = (p: string) => { setOpen(false); router.push(href(p)) }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" sideOffset={10} className="w-[640px] gap-0 border-line-3 bg-surface p-0 shadow-[0_24px_64px_-12px_#000]">
        <div className="grid grid-cols-2 gap-1 p-4">
          {PLATFORM_MODULES.map((m, i) => (
            <button key={m.path} onMouseEnter={() => setHover(i)} onClick={() => go(m.path)} className="relative flex items-center gap-3 rounded-[10px] px-3 py-3 text-left">
              {hover === i && <motion.span layoutId="plat-hl" className="absolute inset-0 rounded-[10px] bg-surface-2" transition={{ type: "spring", stiffness: 600, damping: 45 }} />}
              <span className="relative flex size-8 items-center justify-center rounded-[8px] border border-line-3 bg-page">
                <IntegrationLogo name={m.logo} mono={m.logo === "kafka" || m.logo === "argocd"} className="size-4" />
              </span>
              <span className="relative flex flex-col gap-0.5">
                <span className="text-[14px] text-foreground">{m.label}</span>
                <span className="text-[12px] text-subtle">
                  {m.desc[0]}
                  {m.desc[1] && <span className={m.desc[2] === "destructive" ? "text-destructive" : "text-warning"}>{m.desc[1]}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line-2 px-4 py-3 text-[12.5px]">
          <span className="flex gap-5 text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => go("/whats-new")}>Docs</button>
            <button className="hover:text-foreground" onClick={() => go("/status")}>Platform status</button>
            <button className="hover:text-foreground" onClick={() => go("/profile")}>API</button>
          </span>
          <span className="text-muted-foreground">Tip: press G then I for Infrastructure · or ⌘K</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ */
/* Avatar menu · 09b                                                   */
/* ------------------------------------------------------------------ */

export function AvatarMenu({ trigger, align = "end" }: { trigger: React.ReactElement; align?: "start" | "end" }) {
  const href = useHref()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const swap = useSwapModeHref()
  const mode = useMode()
  const menuParam = useSearchParams().get("menu")
  const [open, setOpen] = React.useState(menuParam === "avatar")
  const [hover, setHover] = React.useState(0)
  const go = (p: string) => { setOpen(false); router.push(href(p)) }
  const rows: [string, React.ComponentType<{ className?: string }>, string, string?][] = [
    ["Profile", User, "/profile"],
    ["API keys", KeyRound, "/profile#keys", "2"],
    ["Teams", Users, "/status"],
  ]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align={align} side={align === "start" ? "top" : "bottom"} sideOffset={8} className="w-[280px] gap-0 border-line-3 bg-surface p-0 shadow-[0_24px_64px_-12px_#000]">
        <div className="flex items-center gap-3 border-b border-line-2 px-3.5 py-3.5">
          <UserAvatar className="size-9" />
          <div className="flex min-w-0 flex-col">
            <span className="text-[14px] font-medium text-foreground">{me.name}</span>
            <span className="truncate text-[12px] text-muted-foreground">Platform · {me.team}</span>
          </div>
        </div>
        <div className="flex flex-col p-1.5">
          {rows.map(([l, Icon, p, badge], i) => (
            <button key={l} onMouseEnter={() => setHover(i)} onClick={() => go(p)} className="relative flex h-8 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] text-foreground">
              {hover === i && <motion.span layoutId="avatar-hl" className="absolute inset-0 rounded-[8px] bg-surface-2" />}
              <Icon className="relative size-3.5 text-muted-foreground" />
              <span className="relative flex-1 text-left">{l}</span>
              {badge && <span className="relative text-[11px] text-subtle">{badge}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line-2 px-3.5 py-2.5">
          <span className="text-[14px] text-foreground">Theme</span>
          <div className="flex gap-0.5 rounded-[8px] border border-line-3 p-0.5">
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)} className={cn("relative h-6 rounded-[5px] px-2 text-[11.5px] capitalize", theme === t ? "text-foreground" : "text-subtle hover:text-foreground")}>
                {theme === t && <motion.span layoutId="avatar-theme" className="absolute inset-0 rounded-[5px] bg-surface-3" />}
                <span className="relative">{t}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { setOpen(false); try { localStorage.setItem("idp-mode", mode === "canvas" ? "classic" : "canvas") } catch {}; router.push(swap(mode === "canvas" ? "classic" : "canvas")) }} className="flex w-full items-center justify-between border-t border-line-2 px-3.5 py-3 text-[14px] hover:bg-surface-2/50">
          <span className="text-foreground">Default view</span>
          <span className="flex items-center gap-1 capitalize text-foreground">{mode} <ChevronDown className="size-3.5" /></span>
        </button>
        <div className="flex flex-col border-t border-line-2 p-1.5">
          <button onClick={() => { setOpen(false); toast("Shortcuts", { description: "⌘K search · N new request · G I inbox · J/K/A/R in Inbox" }) }} className="flex h-8 items-center justify-between rounded-[8px] px-2.5 text-[14px] text-foreground hover:bg-surface-2">
            Keyboard shortcuts <span className="text-[11px] text-subtle">?</span>
          </button>
          <button onClick={() => { setOpen(false); toast("Signed out (demo)") }} className="flex h-8 items-center rounded-[8px] px-2.5 text-[14px] text-foreground hover:bg-surface-2">Sign out</button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ */
/* Notifications · R1e                                                 */
/* ------------------------------------------------------------------ */

type Note = {
  id: string
  day: "Today" | "Earlier"
  tone: "fail" | "ok" | "warn" | "live" | "expiring"
  title: React.ReactNode
  meta: React.ReactNode
  unread?: boolean
  action?: boolean
  mention?: boolean
  buttons?: [string, "primary" | "secondary", string][]
}

const NOTES: Note[] = [
  { id: "n1", day: "Today", tone: "fail", unread: true, action: true, title: <><b className="font-medium">Apply failed</b> on TR-001035 · pos.transactions.v1</>, meta: "409 · partition reassignment in progress · 6 min ago", buttons: [["Retry apply", "primary", "Apply re-queued"], ["View logs", "secondary", "/activity/ev-acl"]] },
  { id: "n2", day: "Today", tone: "ok", unread: true, mention: true, title: <><b className="font-medium">daniel.w approved</b> your promote of order-service to prod</>, meta: "MR !482 merged · Argo syncing · 18 min ago" },
  { id: "n3", day: "Today", tone: "warn", action: true, title: <><b className="font-medium">priya.s</b> requested your review on TR-001041</>, meta: "Create loyalty.points.redeemed.v1 · prod · 2h ago", buttons: [["Review", "secondary", "/inbox"]] },
  { id: "n4", day: "Earlier", tone: "live", title: <>Topic <b className="font-medium">payments.settled.v1</b> is live on prod</>, meta: "Yesterday, 17:42" },
  { id: "n5", day: "Earlier", tone: "expiring", title: <>NetBird access to <b className="font-medium">warehouse-api</b> expires in 12 days</>, meta: <>Yesterday, 09:00 · <span className="text-primary">Renew</span></> },
]
const NOTE_ICON: Record<Note["tone"], [React.ComponentType<{ className?: string }>, string]> = {
  fail: [CircleCheck, "text-foreground bg-surface-3"],
  ok: [CircleCheck, "text-primary bg-primary/10"],
  warn: [Clock, "text-warning bg-warning/10"],
  live: [CircleDot, "text-success bg-success/10"],
  expiring: [TriangleAlert, "text-warning bg-warning/10"],
}

const noopSubscribe = () => () => {}

export function NotificationsButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(useSearchParams().get("notifications") === "1")
  const [tab, setTab] = React.useState<"all" | "action" | "mentions">("all")
  const [read, setRead] = React.useState<Set<string>>(new Set())
  const href = useHref()
  const router = useRouter()
  // Portal target only exists in the browser.
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false)
  React.useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [open])
  const unread = NOTES.filter((n) => n.unread && !read.has(n.id)).length
  const list = NOTES.filter((n) => (tab === "all" ? true : tab === "action" ? n.action : n.mention))
  return (
    <>
      <button
        aria-label="Notifications"
        onClick={() => setOpen(true)}
        className={cn("relative flex size-8 items-center justify-center rounded-[8px] border border-line-3 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground", className)}
      >
        <BellIcon />
        <AnimatePresence>{unread > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />}</AnimatePresence>
      </button>
      {mounted && createPortal(<AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-page/55" onClick={() => setOpen(false)} />
            <motion.aside
              role="dialog"
              aria-label="Notifications"
              initial={{ x: 440 }}
              animate={{ x: 0 }}
              exit={{ x: 440 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed top-0 right-0 bottom-0 z-[91] flex w-[420px] flex-col border-l border-line-2 bg-page"
            >
              <div className="flex h-14 items-center justify-between border-b border-line-2 px-5">
                <span className="text-[17px] font-semibold text-foreground">Notifications</span>
                <span className="flex items-center gap-4">
                  <button onClick={() => setRead(new Set(NOTES.map((n) => n.id)))} className="text-[13px] text-muted-foreground hover:text-foreground">Mark all read</button>
                  <button aria-label="Notification settings" onClick={() => { setOpen(false); router.push(href("/patterns")) }}><Settings className="size-4 text-muted-foreground hover:text-foreground" /></button>
                </span>
              </div>
              <div className="flex gap-1.5 px-5 py-3.5">
                {([["all", `All · ${NOTES.length}`], ["action", "Needs action · 2"], ["mentions", "Mentions"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} className={cn("relative h-7.5 rounded-full border px-3 text-[12.5px]", tab === k ? "border-line-3 text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground")}>
                    {tab === k && <motion.span layoutId="notif-tab" className="absolute inset-0 rounded-full bg-surface-2" />}
                    <span className="relative">{l}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {(["Today", "Earlier"] as const).map((d) => {
                  const rows = list.filter((n) => n.day === d)
                  if (!rows.length) return null
                  return (
                    <div key={d}>
                      <div className="px-5 pt-2 pb-2.5 font-mono text-[10.5px] tracking-[0.1em] text-subtle uppercase">{d}</div>
                      {rows.map((n, i) => {
                        const [Icon, c] = NOTE_ICON[n.tone]
                        const isUnread = n.unread && !read.has(n.id)
                        return (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 + i * 0.04 }}
                            onClick={() => setRead((s) => new Set(s).add(n.id))}
                            className={cn("flex gap-3.5 border-t border-line-2 px-5 py-4", n.tone === "fail" && isUnread && "bg-destructive/6")}
                          >
                            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-line-3", c)}><Icon className="size-4" /></span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="text-[14px] leading-5 text-foreground">{n.title}</span>
                              <span className="text-[12.5px] text-muted-foreground">{n.meta}</span>
                              {n.buttons && (
                                <div className="flex gap-2 pt-2">
                                  {n.buttons.map(([l, v, to]) => (
                                    <button
                                      key={l}
                                      onClick={(e) => { e.stopPropagation(); if (to.startsWith("/")) { setOpen(false); router.push(href(to)) } else toast.success(to) }}
                                      className={cn("h-7.5 rounded-[7px] px-2.5 text-[13px] font-medium", v === "primary" ? "btn-primary-gloss text-white" : "border border-line-3 bg-surface-2 text-foreground hover:bg-surface-3")}
                                    >
                                      {l}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <AnimatePresence>{isUnread && <motion.span exit={{ scale: 0 }} className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />}</AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>, document.body)}
    </>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  )
}
