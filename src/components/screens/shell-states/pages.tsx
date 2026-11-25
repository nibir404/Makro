"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  User, Gauge, Layers, Activity as ActivityIcon, CircleCheck, Copy, TriangleAlert, Check, RefreshCw, X, KeyRound, Rocket, Command, Inbox, Loader, Radio, ArrowRight, Home, BarChart3, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { me } from "@/lib/data"
import {
  applyOutcomes, changelog, deploysPerDay, dora, integrations, notifMatrix, openByModule, overviewModules, policies, profileKeys, recentChanges,
} from "@/lib/data-ext/inbox-activity"
import { Btn, EnvChip, Eyebrow, IntegrationLogo, LogoTile, Stagger, StaggerItem, StatusText, UserAvatar, ease } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"
import { CanvasHome } from "@/components/screens/home"
import { CountUp } from "@/components/screens/activity/activity"

const card = "rounded-[12px] border border-line-2 bg-surface/60"

/** Canvas renders directly; Classic wraps in ClassicPage. */
export function Crumb({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <span className="flex items-center gap-2 text-[14px] font-medium text-foreground"><Icon className="size-4" /> {children}</span>
}

/** Same padded body in both modes (Classic frames reuse the Canvas content inside the Classic shell). */
export function Frame({ crumbs, children, pad = true }: { crumbs?: React.ReactNode; children: React.ReactNode; pad?: boolean }) {
  const mode = useMode()
  const body = <div className={cn("flex flex-col gap-4", pad && "px-10 pt-8 pb-12")}>{children}</div>
  if (mode === "classic") return <ClassicPage crumbs={crumbs} bare>{body}</ClassicPage>
  return body
}

function Header({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold text-foreground">{title}</h1>
        <p className="text-[14px] text-muted-foreground">{sub}</p>
      </div>
      {right}
    </div>
  )
}

/* ================= 09c Profile & API keys ================= */
export function ProfileScreen() {
  const [section, setSection] = React.useState("API keys")
  const [keys, setKeys] = React.useState(profileKeys)
  const [created, setCreated] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const [revoke, setRevoke] = React.useState<string | null>(null)
  const [typed, setTyped] = React.useState("")
  const newKey = () => {
    setCreated(false)
    setTimeout(() => setCreated(true), 250)
    toast.success('Key "ci-github" created', { description: "Copy it now — it won't be shown again." })
  }
  return (
    <Frame crumbs={<Crumb icon={User}>API keys</Crumb>}>
      <div className="flex gap-10">
        <nav className="flex w-[180px] shrink-0 flex-col gap-1 pt-1">
          {["Profile", "API keys", "Teams", "Notifications"].map((s) => (
            <button key={s} onClick={() => setSection(s)} className={cn("relative h-8 rounded-[8px] px-2.5 text-left text-[13.5px] transition-colors", section === s ? "text-foreground" : "text-subtle hover:text-foreground")}>
              {section === s && <motion.span layoutId="profile-nav" className="absolute inset-0 rounded-[8px] bg-surface-2" />}
              <span className="relative">{s}</span>
            </button>
          ))}
        </nav>
        <AnimatePresence mode="wait">
          <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-1 flex-col gap-4">
            {section === "API keys" ? (
              <>
                <Header title="API keys" sub="For the CLI and CI. Keys act as you, scoped to what you choose." right={<Btn variant="primary" onClick={newKey}>New key</Btn>} />
                <AnimatePresence>
                  {created && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-[12px] border border-success/30 bg-success/5">
                      <div className="flex flex-col gap-3 p-4">
                        <span className="flex items-center gap-2 text-[13.5px] text-foreground"><CircleCheck className="size-3.5 text-muted-foreground" /> Key &quot;ci-github&quot; created. Copy it now, it won&apos;t be shown again.</span>
                        <div className="flex gap-2">
                          <code className="flex h-9 flex-1 items-center rounded-[8px] border border-line-3 bg-page px-3 font-mono text-[12px] text-foreground">mk_live_7Hq2…redacted…v9Xa</code>
                          <Btn variant="secondary" onClick={() => { setCopied(true); toast.success("Copied to clipboard"); setTimeout(() => setCopied(false), 1500) }}>
                            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
                          </Btn>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className={cn(card, "overflow-hidden")}>
                  <div className="grid grid-cols-[1fr_200px_120px_120px_70px] border-b border-line-2 px-4 py-3 text-[10.5px] tracking-[0.08em] text-subtle uppercase">
                    <span>Name</span><span>Scope</span><span>Last used</span><span>Expires</span><span />
                  </div>
                  <AnimatePresence initial={false}>
                    {keys.map((k) => (
                      <motion.div key={k.name} layout exit={{ opacity: 0, height: 0 }} className="grid h-10 grid-cols-[1fr_200px_120px_120px_70px] items-center border-t border-line px-4 text-[13px]">
                        <span className="text-foreground">{k.name} {k.isNew && <span className="text-[11px] text-success">new</span>}</span>
                        <span className="text-muted-foreground">{k.scope}</span>
                        <span className="text-subtle">{k.used}</span>
                        <span className={k.stale ? "text-warning" : "text-subtle"}>{k.expires}</span>
                        <button onClick={() => { setRevoke(k.name); setTyped("") }} className={cn("text-right hover:underline", k.stale ? "text-destructive" : "text-subtle hover:text-foreground")}>Revoke</button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <span className="flex items-center gap-2 text-[12px] text-subtle"><TriangleAlert className="size-3" /> old-jenkins hasn&apos;t been used in 94 days. Revoking asks you to type the key name.</span>
              </>
            ) : section === "Profile" ? (
              <>
                <Header title="Profile" sub="Synced from Okta · change your name or photo there." />
                <div className={cn(card, "flex items-center gap-4 p-5")}>
                  <UserAvatar className="size-12" />
                  <div className="flex flex-col"><span className="text-[15px] text-foreground">{me.name}</span><span className="text-[13px] text-subtle">{me.email} · {me.role} · {me.team}</span></div>
                </div>
                <div className={cn(card, "flex flex-wrap gap-2 p-5")}>
                  {me.namespaces.map((n) => <span key={n} className="rounded-full border border-line-3 px-2.5 py-1 text-[12px] text-muted-foreground">{n}</span>)}
                </div>
              </>
            ) : (
              <Header title={section} sub={section === "Teams" ? "team-orders · 6 members · you are a lead" : "Choose where each event reaches you — see Patterns."} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {revoke && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-page/60" onClick={() => setRevoke(null)}>
            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(e) => e.stopPropagation()} className="flex w-[420px] flex-col gap-4 rounded-[14px] border border-line-3 bg-surface p-6">
              <span className="flex items-center gap-2 text-[16px] font-semibold"><TriangleAlert className="size-4 text-destructive" /> Revoke {revoke}?</span>
              <p className="text-[13px] text-muted-foreground">Anything using this key stops working immediately. Type <span className="font-mono text-foreground">{revoke}</span> to confirm.</p>
              <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="h-9 rounded-[8px] border border-line-3 bg-page px-3 font-mono text-[13px] outline-none focus:border-foreground/50" />
              <div className="flex justify-end gap-2">
                <Btn variant="secondary" onClick={() => setRevoke(null)}>Cancel</Btn>
                <Btn variant="destructive" disabled={typed !== revoke} onClick={() => { setKeys((k) => k.filter((x) => x.name !== revoke)); toast.success(`Revoked ${revoke}`); setRevoke(null) }}>Revoke key</Btn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  )
}

/* ================= 16i What's new ================= */
export function WhatsNewScreen() {
  const mode = useMode()
  const [items, setItems] = React.useState(changelog)
  const [open, setOpen] = React.useState(true)
  return (
    <>
      {mode === "canvas" ? <CanvasHome /> : <ClassicPage bare crumbs={<Crumb icon={Home}>Home</Crumb>}><CanvasHome /></ClassicPage>}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease }}
            className={cn("fixed z-40 w-[380px] overflow-hidden rounded-[12px] border border-line-3 bg-popover shadow-2xl", mode === "canvas" ? "top-[54px] right-[70px]" : "top-[60px] right-4")}>
            <div className="flex items-center justify-between border-b border-line-2 px-4 py-3.5">
              <span className="text-[13.5px] font-medium text-foreground">What&apos;s new</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setItems((x) => x.map((i) => ({ ...i, unread: false })))} className="text-[12px] text-subtle hover:text-foreground">Mark all read</button>
                <button onClick={() => setOpen(false)} aria-label="Close"><X className="size-3.5 text-subtle" /></button>
              </div>
            </div>
            <div className="flex flex-col p-1.5">
              {items.map((c, i) => (
                <motion.button key={c.title} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setItems((x) => x.map((y) => (y.title === c.title ? { ...y, unread: false } : y)))}
                  className={cn("flex gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left hover:bg-surface-2", i === 0 && "bg-surface-2/60")}>
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full transition-opacity", c.unread ? "bg-info" : "opacity-0")} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-foreground">{c.title}</span>
                    <span className="text-[12px] text-subtle">{c.body} · {c.date}</span>
                  </span>
                </motion.button>
              ))}
            </div>
            <div className="border-t border-line-2 px-4 py-3 text-[12px] text-subtle hover:text-foreground"><a href="#">Full changelog in Docs</a></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ================= 16j Platform status ================= */
export function StatusScreen() {
  const [tab, setTab] = React.useState("Status")
  const tone = { ok: "text-success", degraded: "text-warning", warn: "text-warning" }
  const dot = { ok: "bg-success", degraded: "bg-warning", warn: "bg-warning" }
  const bar = { ok: "bg-success", warn: "bg-warning", fail: "bg-destructive" }
  return (
    <Frame crumbs={<Crumb icon={Gauge}>Platform status</Crumb>}>
      <Header title="Platform status" sub="Integrations the IDP depends on · admins can change settings" right={
        <div className="flex gap-0.5 rounded-[8px] border border-line-2 p-0.75">
          {["Status", "Policies", "Teams & roles"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("relative h-7 rounded-[6px] px-2.5 text-[12.5px]", tab === t ? "text-foreground" : "text-subtle hover:text-foreground")}>
              {tab === t && <motion.span layoutId="status-tab" className="absolute inset-0 rounded-[6px] bg-surface-2" />}<span className="relative">{t}</span>
            </button>
          ))}
        </div>
      } />
      <div className="flex items-center justify-between rounded-[10px] border border-warning/30 bg-warning/8 px-4 py-3 text-[13px] text-warning">
        <span className="flex items-center gap-2.5"><TriangleAlert className="size-3.5" /> Argo CD sync is slow · applies may take ~5 min instead of 2</span>
        <span className="text-[12px] text-subtle">since 09:40</span>
      </div>
      {tab !== "Teams & roles" && (
        <Stagger className={cn("grid grid-cols-3 gap-3", tab === "Policies" && "hidden")}>
          {integrations.map((s) => (
            <StaggerItem key={s.name} className={cn(card, "flex flex-col gap-3 p-4")}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-[13.5px] text-foreground"><IntegrationLogo name={s.logo} className="size-4" /> {s.name}</span>
                <span className={cn("flex items-center gap-1.5 text-[11.5px]", tone[s.status])}><span className={cn("size-1.5 rounded-full", dot[s.status])} />{s.label}</span>
              </div>
              {s.bars && (
                <div className="flex gap-0.5">
                  {s.bars.map((b, i) => <motion.span key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.04 }} className={cn("h-5 flex-1", bar[b])} title={`Day ${i + 1}: ${b}`} />)}
                </div>
              )}
              <span className="text-[11.5px] text-subtle">{s.note}</span>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <div className={cn(card, "flex flex-col gap-2.5 p-4")}>
        <span className="text-[13.5px] text-foreground">{tab === "Teams & roles" ? "Teams & roles (admin)" : "Policies (admin)"}</span>
        {(tab === "Teams & roles" ? [["platform team", "Admin · 4 members"], ["team-orders", "Lead: Alex · 6 members"], ["team-loyalty", "Lead: Priya · 5 members"]] : policies).map(([k, v]) => (
          <div key={k} className="flex justify-between text-[12.5px]"><span className="text-muted-foreground">{k}</span><span className="text-foreground">{v}</span></div>
        ))}
      </div>
    </Frame>
  )
}

/* ================= 16k Patterns ================= */
export function PatternsScreen() {
  const [m, setM] = React.useState(notifMatrix)
  const [undone, setUndone] = React.useState(false)
  return (
    <Frame crumbs={<Crumb icon={Layers}>Patterns</Crumb>}>
      <Header title="Patterns" sub="Used everywhere · toasts, role-based states, notification settings" />
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2.5">
          <Eyebrow className="pb-1">Toasts · bottom-left, 6s</Eyebrow>
          <div className="flex h-11 items-center gap-3 rounded-[10px] border border-line-3 bg-surface px-4 text-[13.5px]">
            {undone ? <RefreshCw className="size-3.5 text-muted-foreground" /> : <Check className="size-3.5 text-success" />}
            <span className="flex-1 text-foreground">{undone ? "Undone · back to 3 pods" : "Scaled order-service to 6 pods"}</span>
            <button onClick={() => setUndone((u) => !u)} className="text-[12px] text-foreground underline">{undone ? "Redo" : "Undo"}</button>
            <svg viewBox="0 0 20 20" className="size-5 -rotate-90"><circle cx="10" cy="10" r="8" className="fill-none stroke-surface-3" strokeWidth="2" /><motion.circle cx="10" cy="10" r="8" className="fill-none stroke-muted-foreground" strokeWidth="2" initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} /></svg>
          </div>
          <div className="flex h-11 items-center gap-3 rounded-[10px] border border-line-3 bg-surface px-4 text-[13.5px]">
            <RefreshCw className="size-3.5 animate-spin text-info [animation-duration:2s]" /><span className="flex-1 text-foreground">Request sent to Priya</span><button className="text-[12px] text-subtle hover:text-foreground">View</button>
          </div>
          <div className="flex h-11 items-center gap-3 rounded-[10px] border border-destructive/30 bg-destructive/8 px-4 text-[13.5px]">
            <X className="size-3.5 text-destructive" /><span className="flex-1 text-foreground">Couldn&apos;t save · network error</span><button onClick={() => toast.success("Saved")} className="text-[12px] text-foreground underline">Retry</button>
          </div>
          <span className="text-[11.5px] text-subtle">Undo only for reversible actions. Prod and destructive actions confirm first instead.</span>
          <div className="flex gap-2 pt-1">
            <Btn size="xs" variant="secondary" onClick={() => toast.success("Scaled order-service to 6 pods", { action: { label: "Undo", onClick: () => toast("Undone") } })}>Fire success</Btn>
            <Btn size="xs" variant="secondary" onClick={() => toast.error("Couldn't save · network error", { action: { label: "Retry", onClick: () => {} } })}>Fire error</Btn>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Eyebrow className="pb-1">Roles · same screen, different power</Eyebrow>
          <div className={cn(card, "flex flex-col gap-2.5 p-4")}>
            <div className="flex justify-between text-[13px]"><span className="text-foreground">Requester</span><span className="text-subtle">Alex · team-orders</span></div>
            <div className="flex items-center gap-2.5 text-[12.5px] text-subtle">
              <Btn size="sm" variant="secondary" disabled className="opacity-50">Approve</Btn>
              You can&apos;t approve your own prod change · <button onClick={() => toast("Asked Priya to review")} className="text-foreground underline">Ask Priya</button>
            </div>
          </div>
          <div className={cn(card, "flex flex-col gap-2.5 p-4")}>
            <div className="flex justify-between text-[13px]"><span className="text-foreground">Viewer</span><span className="text-subtle">loyalty project</span></div>
            <span className="flex gap-2 text-[12.5px] text-subtle"><KeyRound className="mt-0.5 size-3.5 shrink-0" />Read-only · edit buttons are hidden, not disabled · <button onClick={() => toast("Edit access requested")} className="text-foreground underline">Request edit access</button></span>
          </div>
          <div className={cn(card, "flex flex-col gap-2.5 p-4")}>
            <div className="flex justify-between text-[13px]"><span className="text-foreground">Admin</span><span className="text-subtle">platform team</span></div>
            <span className="text-[12.5px] text-subtle">Sees Platform status → Policies and Teams &amp; roles</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Eyebrow className="pb-1">Notifications · in avatar menu</Eyebrow>
          <div className={cn(card, "flex flex-col p-4")}>
            <div className="grid grid-cols-[1fr_54px_54px_54px] pb-2 text-center text-[11.5px] text-subtle"><span /><span>Inbox</span><span>Slack</span><span>Email</span></div>
            {m.map((r, ri) => (
              <div key={r.label} className="grid h-8.5 grid-cols-[1fr_54px_54px_54px] items-center border-t border-line text-[12.5px]">
                <span className="text-muted-foreground">{r.label}</span>
                {r.v.map((on, ci) => (
                  <button key={ci} aria-pressed={on} onClick={() => setM((x) => x.map((y, yi) => (yi === ri ? { ...y, v: y.v.map((z, zi) => (zi === ci ? !z : z)) } : y)))} className="flex justify-center">
                    <motion.span animate={{ scale: on ? 1 : 0.8 }} className={cn("size-2 rounded-full border", on ? "border-foreground bg-foreground" : "border-faint")} />
                  </button>
                ))}
              </div>
            ))}
          </div>
          <span className="text-[11.5px] text-subtle">Quiet hours 22:00 – 08:00 · prod failures still come through</span>
        </div>
      </div>
    </Frame>
  )
}

/* Skeleton bars. Declared at module level so they keep identity across renders. */
function Shimmer4({ className }: { className?: string }) {
  return <span className={cn("skeleton-shimmer block rounded-[4px]", className)} />
}
function Shimmer6({ className }: { className?: string }) {
  return <span className={cn("skeleton-shimmer block rounded-[6px]", className)} />
}

/* ================= 09d Skeleton ================= */
export function SkeletonScreen() {
  const S = Shimmer4
  return (
    <Frame crumbs={<Crumb icon={ActivityIcon}>Activity</Crumb>}>
      <div aria-busy className="flex flex-col gap-4">
        <div className="flex justify-between"><div className="flex flex-col gap-3"><S className="h-5 w-30" /><S className="h-2.5 w-55" /></div><S className="h-8 w-50 rounded-[8px]" /></div>
        <div className="grid grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className={cn(card, "h-24")} />)}</div>
        <div className={cn(card, "overflow-hidden")}>
          <div className="h-10 border-b border-line-2" />
          {[320, 260, 380, 220, 300].map((w, i) => (
            <div key={i} className="flex h-10.5 items-center gap-4 border-t border-line px-4">
              <S className="size-3.5 rounded-full" /><S className="h-2.5" /><span style={{ width: w }} className="skeleton-shimmer block h-2.5 rounded-[4px]" /><span className="flex-1" /><S className="h-2.5 w-30" /><S className="h-2.5 w-15" />
            </div>
          ))}
        </div>
        <span className="text-[12px] text-subtle">Skeleton mirrors final layout · shimmer 1.2s · shown only after 300ms to avoid flashes</span>
      </div>
    </Frame>
  )
}

/* ================= 09e 404 + offline ================= */
export function NotFoundScreen({ offline }: { offline?: boolean }) {
  const mode = useMode()
  const inner = <NotFoundBody offline={offline} />
  return mode === "classic" ? <ClassicPage bare crumbs={<Crumb icon={Home}>Home</Crumb>}>{inner}</ClassicPage> : inner
}

function NotFoundBody({ offline }: { offline?: boolean }) {
  const href = useHref()
  const [secs, setSecs] = React.useState(8)
  const [retrying, setRetrying] = React.useState(false)
  React.useEffect(() => {
    if (!offline) return
    const t = setInterval(() => setSecs((s) => (s <= 1 ? 8 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [offline])
  return (
    <div className="relative flex min-h-[calc(100vh-56px)] flex-1 flex-col">
      <AnimatePresence>
        {offline && (
          <motion.div initial={{ height: 0 }} animate={{ height: 36 }} className="flex items-center justify-center gap-2.5 overflow-hidden border-b border-warning/20 bg-warning/8 text-[12.5px] text-warning">
            <TriangleAlert className="size-3.5" /> You&apos;re offline. Changes are paused and nothing will be applied. Reconnecting in {secs}s…
            <button onClick={() => { setRetrying(true); setTimeout(() => { setRetrying(false); setSecs(8); toast.error("Still offline", { description: "We'll keep trying." }) }, 900) }} className="text-foreground underline">
              {retrying ? "Retrying…" : "Retry now"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <motion.div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-50 light:opacity-20" style={{ backgroundImage: "url(/textures/horizon.png)" }} animate={{ scale: [1.05, 1.1, 1.05] }} transition={{ duration: 30, repeat: Infinity }} />
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease }} className="relative flex w-[450px] flex-col items-center gap-3 rounded-[16px] border border-line-3 bg-page/85 px-10 py-10 backdrop-blur-md">
          <span className="font-mono text-[56px] leading-none font-medium text-foreground">404</span>
          <span className="pt-3 text-[16px] font-medium text-foreground">This service doesn&apos;t exist, or you can&apos;t see it</span>
          <span className="font-mono text-[12.5px] text-subtle">/commerce/payment-gatewy</span>
          <span className="text-[13px] text-muted-foreground">Did you mean <Link href={href("/services/payment-gateway")} className="text-foreground underline">payment-gateway</Link>?</span>
          <div className="flex gap-4 pt-3">
            <Btn variant="secondary" href={href("/services")}>Go to Services</Btn>
            <Btn variant="ghost" onClick={() => toast.success("Access requested", { description: "team-payments leads will review" })}>Request access</Btn>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ================= R1b new user / R1c loading + error ================= */
export function HomeStates({ state }: { state: string }) {
  const href = useHref()
  const mode = useMode()
  const crumbs = <span className="flex items-center gap-2 text-[14px] font-medium text-foreground"><Home className="size-4" /> Home</span>
  if (state === "loading" || state === "error") return <Frame crumbs={crumbs}><HomeLoading error={state === "error"} /></Frame>
  const steps = [
    { icon: CircleCheck, title: "Sign in with Okta", sub: "Done · 2 namespaces linked", done: true },
    { icon: Rocket, title: "Create your first service", sub: "Helm chart + Argo app, one form · 3 clicks", path: "/services/new", hl: true },
    { icon: KeyRound, title: "Add its secrets", sub: "Upload a .env or add keys one by one", path: "/secrets" },
    { icon: Command, title: "Learn ⌘K", sub: "Jump anywhere, run any action" },
  ]
  return (
    <Frame crumbs={crumbs}>
      <div className={cn("flex flex-col gap-6", mode === "canvas" && "mx-auto w-full max-w-[1140px]")}>
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="card-gloss flex items-center justify-between gap-10 rounded-[18px] p-10">
          <div className="flex max-w-[500px] flex-col gap-4">
            <Eyebrow>Welcome to makro IDP</Eyebrow>
            <h1 className="text-[34px] leading-10.5 font-semibold tracking-[-0.02em] text-foreground">Ship your first service<br />in about four minutes.</h1>
            <p className="text-[15px] leading-6 text-muted-foreground">You&apos;re in <span className="text-foreground">commerce</span> as a developer. Everything you request is reviewed by your team lead, then applied for you through GitOps — no kubectl needed.</p>
            <div className="flex gap-2.5 pt-2">
              <Btn variant="primary" size="lg" href={href("/services/new")}>+ Create a service</Btn>
              <Btn variant="secondary" size="lg" onClick={() => toast("Tour starts on the next page", { description: "2 min · 5 steps" })}>Take the 2-min tour</Btn>
            </div>
          </div>
          <motion.div aria-hidden className="h-[280px] w-[420px] shrink-0 rounded-[10px] bg-cover bg-center" style={{ backgroundImage: "url(/textures/horizon.png)" }} animate={{ backgroundPositionX: ["0%", "100%", "0%"] }} transition={{ duration: 40, repeat: Infinity }} />
        </motion.section>
        <div className="flex justify-between"><span className="text-[16px] font-medium text-foreground">Get set up</span><span className="text-[12.5px] text-subtle">1 of 4 done</span></div>
        <Stagger className="grid grid-cols-4 gap-3">
          {steps.map((s) => {
            const Body = (
              <div className={cn("card-gloss flex h-28 flex-col justify-between rounded-[12px] p-4.5 transition-transform hover:-translate-y-0.5", s.hl && "border border-primary/40")}>
                <s.icon className={cn("size-4.5", s.done ? "text-success" : s.hl ? "text-primary" : "text-muted-foreground")} />
                <div className="flex flex-col gap-1">
                  <span className={cn("text-[14px]", s.done ? "text-subtle line-through" : "text-foreground")}>{s.title}</span>
                  <span className="text-[12px] text-subtle">{s.sub}</span>
                </div>
              </div>
            )
            return <StaggerItem key={s.title}>{s.path ? <Link href={href(s.path)}>{Body}</Link> : Body}</StaggerItem>
          })}
        </Stagger>
        <div className="flex items-center gap-4 rounded-[12px] border border-dashed border-line-3 px-5 py-4">
          <Inbox className="size-4.5 text-muted-foreground" />
          <div className="flex flex-col"><span className="text-[14px] text-foreground">Nothing waiting on you</span><span className="text-[13px] text-subtle">Requests you make and approvals assigned to you will appear here, live.</span></div>
        </div>
      </div>
    </Frame>
  )
}

function HomeLoading({ error }: { error: boolean }) {
  const [failed, setFailed] = React.useState(error)
  const [retry, setRetry] = React.useState(false)
  const S = Shimmer6
  const doRetry = () => { setRetry(true); setTimeout(() => { setRetry(false); setFailed(false); toast.success("Kafka status is back") }, 1000) }
  return (
    <div aria-busy className="flex flex-col gap-5">
      <AnimatePresence>
        {failed && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-4 rounded-[12px] border border-destructive/30 bg-destructive/8 px-6 py-4">
            <TriangleAlert className="size-4.5 text-destructive" />
            <div className="flex flex-1 flex-col"><span className="text-[14px] text-foreground">Kafka status is unavailable right now</span><span className="text-[13px] text-muted-foreground">The rest of Home is live. We&apos;ll retry automatically every 30s · last success 2 min ago</span></div>
            <Btn variant="secondary" onClick={doRetry}>{retry && <Loader className="animate-spin" />} Retry now</Btn>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="dot-grid flex h-42 flex-col justify-center gap-4 rounded-[16px] border border-line-2 bg-surface px-7"><S className="h-3 w-30" /><S className="h-7 w-85" /><S className="h-3 w-120" /></div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-5">
        <div className={cn(card, "flex flex-col gap-4 p-5")}><S className="h-3.5 w-45" />{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3"><S className="size-9" /><div className="flex flex-1 flex-col gap-2"><S className="h-2.5 w-72" /><S className="h-2 w-46" /></div><S className="h-8 w-38" /></div>)}</div>
        <div className={cn(card, "flex flex-col gap-4 p-5")}><S className="h-3.5 w-50" /><div className="h-1 rounded-full bg-surface-3"><motion.div className="h-full rounded-full bg-primary" initial={{ width: "10%" }} animate={{ width: ["10%", "60%", "30%"] }} transition={{ duration: 3, repeat: Infinity }} /></div><S className="h-2.5 w-60" /><S className="h-px w-full" /><S className="h-2.5 w-52" /></div>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => i === 1 && failed ? (
          <div key={i} className="flex h-37 flex-col justify-between rounded-[12px] border border-destructive/40 bg-surface p-4">
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground"><Radio className="size-3.5" /> Kafka topics</span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-foreground"><TriangleAlert className="size-3.5 text-destructive" /> Couldn&apos;t load · retrying</span>
            <button onClick={doRetry} className="text-left text-[12.5px] text-primary hover:underline">Retry now</button>
          </div>
        ) : (
          <div key={i} className={cn(card, "flex h-37 flex-col gap-4 p-4")}><S className="h-2.5 w-22" /><S className="h-5 w-12" /><S className="h-2 w-full" /></div>
        ))}
      </div>
      <span className="font-mono text-[11px] text-subtle">Skeletons match final layout (no shift) · shimmer uses the dither sweep, off under reduced-motion · each tile fails on its own, never the whole page · aria-busy on loading regions</span>
    </div>
  )
}

/* ================= R1f Platform overview ================= */
export function OverviewScreen() {
  const href = useHref()
  const router = useRouter()
  const [env, setEnv] = React.useState("All envs")
  const barC = ["bg-success", "bg-info", "bg-warning", "bg-destructive"]
  const issueIcon = (t: string) => t === "busy" ? <Loader className="size-3.5 animate-spin text-info" /> : <TriangleAlert className={cn("size-3.5", t === "fail" ? "text-destructive" : "text-warning")} />
  const line = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${(i / (pts.length - 1)) * 380},${130 - v * 5.5}`).join(" ")
  const total = openByModule.reduce((a, b) => a + b.n, 0)
  const offsets = openByModule.map((_, i) => openByModule.slice(0, i).reduce((a, b) => a + b.n, 0))
  return (
    <Frame crumbs={<span className="flex items-center gap-2 text-[14px] text-muted-foreground"><Home className="size-4" /> Home <span className="text-faint">›</span> <span className="flex items-center gap-2 font-medium text-foreground"><BarChart3 className="size-4" /> Platform overview</span></span>}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5"><h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">Platform overview</h1><p className="text-[14px] text-muted-foreground">Every module, its state, and what needs checking · updated live · 12s ago</p></div>
        <div className="flex gap-2">
          <div className="flex gap-0.5 rounded-[8px] border border-line-3 p-0.75">
            {["dev", "qa", "prod", "All envs"].map((e) => <button key={e} onClick={() => setEnv(e)} className={cn("relative h-7.5 rounded-[6px] px-3 text-[12.5px]", env === e ? "text-foreground" : "text-subtle hover:text-foreground")}>{env === e && <motion.span layoutId="ov-env" className="absolute inset-0 rounded-[6px] bg-surface-2" />}<span className="relative">{e}</span></button>)}
          </div>
          <Btn variant="secondary">Last 7 days <ChevronDown /></Btn>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-[12px] border border-destructive/30 bg-destructive/6 px-5 py-3.5">
        <TriangleAlert className="size-4 text-destructive" /><span className="text-[14px] font-medium text-foreground">6 things need checking</span>
        {["pg-prod-orders unreachable", "TR-001035 apply failed", "cart-api qa degraded", "+3"].map((c) => <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] text-muted-foreground">{c}</span>)}
        <Link href={href("/inbox")} className="ml-auto flex items-center gap-1 text-[13px] text-primary hover:underline">Triage all <ArrowRight className="size-3.5" /></Link>
      </div>
      <Stagger className="grid grid-cols-4 gap-3">
        {dora.map((d) => (
          <StaggerItem key={d.label} className="card-gloss flex flex-col gap-3 rounded-[14px] p-5">
            <span className="text-[13px] text-muted-foreground">{d.label}</span>
            <span className="flex items-baseline gap-2"><span className="text-[28px] font-semibold text-foreground">{d.value}</span><span className="text-[12px] text-subtle">{d.unit}</span><span className={cn("font-mono text-[11.5px]", d.good ? "text-success" : "text-destructive")}>{d.up ? "▲" : "▼"} {d.delta}</span></span>
            <div className="flex h-8 items-end gap-0.5">{d.bars.map((b, i) => <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${b * 10}%` }} transition={{ delay: i * 0.04 }} className={cn("flex-1", i === d.bars.length - 1 ? "bg-foreground" : !d.good && i === 5 ? "bg-destructive" : "bg-surface-3")} />)}</div>
          </StaggerItem>
        ))}
      </Stagger>
      <Stagger className="grid grid-cols-3 gap-3">
        {overviewModules.map((m) => {
          const sum = m.bar.reduce((a, b) => a + b, 0)
          return (
            <StaggerItem key={m.id} className="card-gloss flex flex-col rounded-[14px]">
              <div className="flex items-start gap-3 p-4.5 pb-3">
                <LogoTile name={m.logo} />
                <div className="flex flex-1 flex-col"><span className="text-[15px] font-medium text-foreground">{m.name}</span><span className="text-[12px] text-subtle">{m.sub}</span></div>
                <Link href={href(m.path)} className="flex items-center gap-1 text-[12.5px] text-primary hover:underline">Open <ArrowRight className="size-3" /></Link>
              </div>
              <div className="mx-4.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">{m.bar.map((b, i) => b > 0 && <motion.span key={i} initial={{ flexGrow: 0 }} animate={{ flexGrow: b / sum }} transition={{ duration: 0.6, ease }} className={cn("h-full", barC[i])} />)}</div>
              <div className="flex justify-between px-4.5 pt-2.5 pb-3 text-[12px] text-subtle">{m.stats.map((s) => { const [n, ...r] = s.split(" "); return <span key={s}><span className="text-foreground">{n}</span> {r.join(" ")}</span> })}</div>
              {m.issues.map(([t, text, act]) => (
                <button key={text} onClick={() => toast(`${act}: ${text}`)} className="flex items-center gap-2.5 border-t border-line px-4.5 py-2.5 text-left text-[13px] text-foreground hover:bg-surface-2/50">
                  {issueIcon(t)}<span className="flex-1">{text}</span><span className={cn("text-[12px]", t === "busy" ? "text-info" : t === "fail" ? "text-destructive" : "text-warning")}>{act}</span>
                </button>
              ))}
            </StaggerItem>
          )
        })}
      </Stagger>
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3">
        <div className="card-gloss flex flex-col gap-3 rounded-[14px] p-5">
          <div className="flex justify-between"><span className="text-[15px] font-medium">Deploys per day · by env</span><span className="flex gap-3 text-[11.5px] text-subtle"><span>■ prod</span><span className="text-info">■ qa</span><span>■ dev</span></span></div>
          <svg viewBox="0 0 380 130" className="h-[150px] w-full overflow-visible">
            {[["prod", "stroke-foreground"], ["qa", "stroke-info"], ["dev", "stroke-subtle"]].map(([k, c], i) => (
              <motion.path key={k} d={line(deploysPerDay[k as keyof typeof deploysPerDay])} className={cn("fill-none", c)} strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.15 }} />
            ))}
            <line x1="0" x2="380" y1={130 - 17 * 5.5} y2={130 - 17 * 5.5} className="stroke-warning" strokeDasharray="2 3" />
          </svg>
          <div className="flex justify-between font-mono text-[10px] text-subtle"><span>Nov 18</span><span>Nov 20</span><span>Nov 22</span><span>Nov 24</span></div>
        </div>
        <div className="card-gloss flex flex-col gap-4 rounded-[14px] p-5">
          <span className="text-[15px] font-medium">Open requests · by module</span>
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 120 120" className="size-[120px] -rotate-90">
              {openByModule.map((m, i) => { const c = 2 * Math.PI * 48; const off = offsets[i]; return <motion.circle key={m.label} cx="60" cy="60" r="48" fill="none" strokeWidth="12" className={["stroke-foreground", "stroke-subtle", "stroke-info", "stroke-warning/60", "stroke-surface-3"][i]} strokeDasharray={`${(m.n / total) * c - 2} ${c}`} strokeDashoffset={-(off / total) * c} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} /> })}
              <text x="60" y="62" textAnchor="middle" transform="rotate(90 60 60)" className="fill-foreground text-[22px] font-semibold"><CountUp to={25} /></text>
              <text x="60" y="78" textAnchor="middle" transform="rotate(90 60 60)" className="fill-subtle text-[9px]">open</text>
            </svg>
            <div className="flex flex-1 flex-col gap-2">{openByModule.map((m) => <span key={m.label} className="flex justify-between text-[12.5px] text-muted-foreground"><span>{m.label}</span><span className="text-foreground">{m.n}</span></span>)}</div>
          </div>
        </div>
        <div className="card-gloss flex flex-col gap-3 rounded-[14px] p-5">
          <div className="flex justify-between"><span className="text-[15px] font-medium">Apply outcomes</span><span className="flex gap-2 text-[11.5px]"><span className="text-success">■ ok</span><span className="text-destructive">■ failed</span></span></div>
          <div className="flex h-[130px] items-end gap-1.5">{applyOutcomes.map(([ok, f], i) => <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(ok + f) * 7.5}%` }} transition={{ delay: i * 0.03, duration: 0.5, ease }} className="flex flex-1 flex-col-reverse"><span className="bg-success" style={{ flexGrow: ok }} />{f > 0 && <span className="bg-destructive" style={{ flexGrow: f }} />}</motion.div>)}</div>
          <span className="text-[12px] text-subtle">96% success · 6 failed this week · Nov 21 spike = makro-prod-edge</span>
        </div>
      </div>
      <div className="card-gloss overflow-hidden rounded-[14px]">
        <div className="flex justify-between px-5 py-4"><span className="text-[15px] font-medium">Recent changes · all modules</span><Link href={href("/activity/audit")} className="text-[13px] text-primary hover:underline">Audit log →</Link></div>
        <div className="grid grid-cols-[120px_150px_1fr_110px_120px_130px] border-y border-line-2 px-5 py-2.5 font-mono text-[10.5px] tracking-[0.06em] text-subtle uppercase"><span>When</span><span>Module</span><span>Change</span><span>Env</span><span>By</span><span>Status</span></div>
        {recentChanges.map((r) => (
          <button key={r.change} onClick={() => router.push(href("/activity/audit"))} className="grid h-11 w-full grid-cols-[120px_150px_1fr_110px_120px_130px] items-center border-t border-line px-5 text-left text-[13px] hover:bg-surface-2/40">
            <span className="font-mono text-[12px] text-subtle">{r.when}</span>
            <span className="flex items-center gap-2 text-foreground"><IntegrationLogo name={r.logo} mono className="size-3.5" />{r.module}</span>
            <span className="text-foreground">{r.change}</span>
            <span><EnvChip env={r.env} /></span>
            <span className="text-muted-foreground">{r.by}</span>
            <StatusText status={r.status} />
          </button>
        ))}
      </div>
    </Frame>
  )
}
