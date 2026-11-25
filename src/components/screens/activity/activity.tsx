"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence, animate } from "motion/react"
import { toast } from "sonner"
import {
  RotateCcw, TriangleAlert, CircleCheck, KeyRound, Rocket, Users, CircleX, Search, X, ArrowRight, Network, Activity as ActivityIcon, Loader,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import {
  activityKpis, auditLog, byModule, changesPerDay, classicFeed, eventDetail, eventsPerHour, failureHour, mostActive, needsALook, type AuditIcon,
} from "@/lib/data-ext/inbox-activity"
import { Btn, Stagger, StaggerItem, ease } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"

export function CountUp({ to, className }: { to: number; className?: string }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    const c = animate(0, to, { duration: 0.9, ease, onUpdate: (x) => setV(Math.round(x)) })
    return () => c.stop()
  }, [to])
  return <span className={className}>{v}</span>
}

const ICON: Record<AuditIcon, [React.ComponentType<{ className?: string }>, string]> = {
  rollback: [RotateCcw, "text-muted-foreground"],
  fail: [TriangleAlert, "text-destructive"],
  approved: [CircleCheck, "text-primary"],
  secret: [KeyRound, "text-muted-foreground"],
  deploy: [Rocket, "text-muted-foreground"],
  network: [Users, "text-muted-foreground"],
  rejected: [CircleX, "text-muted-foreground"],
}

function Segmented({ items, active, id }: { items: [string, string][]; active: string; id: string }) {
  return (
    <div className="flex gap-0.5 rounded-[8px] border border-line-2 p-0.75">
      {items.map(([label, to]) => (
        <Link key={label} href={to} className={cn("relative flex h-7 items-center rounded-[6px] px-3 text-[12.5px] transition-colors", active === label ? "text-foreground" : "text-subtle hover:text-foreground")}>
          {active === label && <motion.span layoutId={id} className="absolute inset-0 rounded-[6px] bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative">{label}</span>
        </Link>
      ))}
    </div>
  )
}

function RangeSeg() {
  const [r, setR] = React.useState("7d")
  return (
    <div className="flex gap-0.5 rounded-[8px] border border-line-2 p-0.75">
      {["24h", "7d", "30d"].map((x) => (
        <button key={x} onClick={() => setR(x)} className={cn("relative h-7 rounded-[6px] px-2.5 text-[12.5px]", r === x ? "text-foreground" : "text-subtle hover:text-foreground")}>
          {r === x && <motion.span layoutId="act-range" className="absolute inset-0 rounded-[6px] bg-surface-2" />}
          <span className="relative">{x}</span>
        </button>
      ))}
    </div>
  )
}

const card = "rounded-[12px] border border-line-2 bg-surface/60"

/* ================= Canvas 08a Overview ================= */
export function ActivityOverview() {
  const href = useHref()
  const max = 170
  const tone: Record<string, string> = { success: "text-success", destructive: "text-destructive", subtle: "text-subtle" }
  const offsets = byModule.map((_, i) => byModule.slice(0, i).reduce((a, b) => a + b.pct, 0))
  return (
    <div className="flex flex-col gap-4 px-10 pt-8 pb-12">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-semibold text-foreground">Activity</h1>
          <p className="text-[14px] text-muted-foreground">Everything that changed across 14 services</p>
        </div>
        <div className="flex gap-3">
          <Segmented id="act-tab" active="Overview" items={[["Overview", href("/activity")], ["Audit log", href("/activity/audit")]]} />
          <RangeSeg />
        </div>
      </div>
      <Stagger className="grid grid-cols-4 gap-3">
        {activityKpis.map((k) => (
          <StaggerItem key={k.label} className={cn(card, "flex flex-col gap-1.5 px-4 py-4")}>
            <span className="text-[12.5px] text-muted-foreground">{k.label}</span>
            <span className="text-[24px] font-semibold text-foreground"><CountUp to={k.value} />{k.unit}</span>
            <span className={cn("text-[12px]", tone[k.tone])}>{k.note}</span>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="grid grid-cols-[1fr_460px] gap-3">
        <div className={cn(card, "flex flex-col gap-4 p-4")}>
          <div className="flex justify-between">
            <span className="text-[13.5px] text-foreground">Changes per day</span>
            <span className="flex gap-3 text-[11.5px]">
              <span className="flex items-center gap-1 text-foreground"><span className="size-2 bg-foreground" />dev / qa</span>
              <span className="flex items-center gap-1 text-warning"><span className="size-2 bg-warning" />prod</span>
              <span className="flex items-center gap-1 text-destructive"><span className="size-2 bg-destructive" />failed</span>
            </span>
          </div>
          <div className="flex h-[200px] items-end gap-4">
            {changesPerDay.map((d, i) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-2">
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05, duration: 0.5, ease }} style={{ originY: 1 }} className="group flex w-full flex-col justify-end gap-0.5" title={`${d.base + d.prod + d.fail} changes`}>
                  {d.fail > 0 && <div className="w-full rounded-[1px] bg-destructive" style={{ height: d.fail * (180 / max) }} />}
                  {d.prod > 0 && <div className="w-full rounded-[1px] bg-warning" style={{ height: d.prod * (180 / max) }} />}
                  <div className={cn("w-full rounded-[1px] transition-opacity group-hover:opacity-85", d.weekend ? "bg-surface-3" : "bg-foreground")} style={{ height: d.base * (180 / max) }} />
                </motion.div>
                <span className="text-[11px] text-subtle">{d.d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cn(card, "flex flex-col gap-4 p-4")}>
          <span className="text-[13.5px] text-foreground">By module</span>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 120 120" className="size-[120px] -rotate-90">
              {byModule.map((m, i) => {
                const c = 2 * Math.PI * 48
                const off = offsets[i]
                const op = [1, 0.55, 0.35, 0.22, 0.14][i]
                return (
                  <motion.circle key={m.label} cx="60" cy="60" r="48" fill="none" strokeWidth="14" className="stroke-foreground" style={{ opacity: op }}
                    strokeDasharray={`${(m.pct / 100) * c - 2} ${c}`} strokeDashoffset={-(off / 100) * c}
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.08, duration: 0.5 }} />
                )
              })}
              <text x="60" y="58" textAnchor="middle" className="rotate-90 fill-foreground text-[15px] font-semibold" transform="rotate(90 60 60)">412</text>
              <text x="60" y="74" textAnchor="middle" className="fill-subtle text-[9px]" transform="rotate(90 60 60)">changes</text>
            </svg>
            <div className="flex flex-col gap-2">
              {byModule.map((m, i) => (
                <span key={m.label} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <span className="size-2 bg-foreground" style={{ opacity: [1, 0.55, 0.35, 0.22, 0.14][i] }} />
                  <span className={i === 0 ? "text-foreground" : ""}>{m.label} · {m.pct}%</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(card, "flex flex-col gap-3 p-4")}>
          <span className="text-[13.5px] text-foreground">Most active services</span>
          {mostActive.map((s, i) => (
            <Link key={s.name} href={href(`/services/${s.name}`)} className="group flex items-center gap-4 text-[12.5px]">
              <span className="w-32 text-muted-foreground group-hover:text-foreground">{s.name}</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <motion.span initial={{ width: 0 }} animate={{ width: `${s.n}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease }} className="block h-full rounded-full bg-foreground" />
              </span>
              <span className="w-6 text-right text-subtle">{s.n}</span>
            </Link>
          ))}
        </div>
        <div className={cn(card, "flex flex-col gap-3 p-4")}>
          <div className="flex justify-between">
            <span className="text-[13.5px] text-foreground">Needs a look</span>
            <Link href={href("/activity/audit")} className="group flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
              Open audit log <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {needsALook.map((n) => (
            <Link key={n.id} href={href(`/activity/${n.id}`)} className="flex items-center gap-2.5 text-[12.5px] text-foreground hover:opacity-80">
              <TriangleAlert className={cn("size-3.5", n.tone === "fail" ? "text-destructive" : "text-warning")} />
              <span className="flex-1">{n.text}</span>
              <span className="text-subtle">{n.when}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================= 08b Audit log / 08c detail / 08d no results ================= */
export function AuditLog({ selected }: { selected?: string }) {
  const href = useHref()
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = React.useState(params.get("q") ?? "")
  const [envFilter, setEnvFilter] = React.useState(true)
  const rows = auditLog.filter((e) => !q || `${e.title} ${e.resource} ${e.actor}`.toLowerCase().includes(q.toLowerCase()))
  const days = ["Today", "Yesterday"] as const
  const open = !!selected
  return (
    <div className="relative flex flex-col gap-4 px-10 pt-8 pb-12">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-semibold text-foreground">Activity</h1>
          <p className="text-[14px] text-muted-foreground">{rows.length === 0 ? "0 events match" : "412 events · last 7 days"}</p>
        </div>
        <div className="flex gap-2">
          {<Segmented id="act-tab" active="Audit log" items={[["Overview", href("/activity")], ["Audit log", href("/activity/audit")]]} />}
          <Btn variant="secondary" onClick={() => toast.success("Exported 37 events", { description: "audit-log-prod-7d.csv" })}>Export CSV</Btn>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex h-9 w-80 items-center gap-2.5 rounded-[8px] border border-line-3 px-3 focus-within:border-foreground/50">
          <Search className="size-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, people, resources" className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle" />
          {q && <button onClick={() => setQ("")}><X className="size-3.5 text-subtle" /></button>}
        </label>
        <AnimatePresence>
          {envFilter && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={() => setEnvFilter(false)} className="flex h-7.5 items-center gap-1.5 rounded-[6px] border border-line-3 bg-surface-2 px-2.5 text-[12px] text-foreground">
              Env: prod <X className="size-3" />
            </motion.button>
          )}
        </AnimatePresence>
        {["Module", "Actor", "Status"].map((f) => (
          <button key={f} onClick={() => toast(`Filter by ${f.toLowerCase()}`)} className="h-7.5 rounded-[6px] border border-dashed border-line-3 px-2.5 text-[12px] text-subtle hover:text-foreground">+ {f}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className={cn(card, "overflow-hidden")}>
          <div className="grid grid-cols-[1fr_170px_130px_120px_80px] border-b border-line-2 py-3 pr-4 pl-11 text-[10.5px] tracking-[0.08em] text-subtle uppercase">
            <span>Event</span><span>Resource</span><span>Actor</span><span>Env</span><span className="text-right">When</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="dot-grid flex h-[420px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-11 items-center justify-center rounded-[10px] border border-line-3 bg-surface-2"><Search className="size-4 text-foreground" /></span>
            <span className="pt-2 text-[15px] font-medium text-foreground">No {envFilter ? "prod " : ""}events match &quot;{q}&quot;</span>
            <span className="text-[13px] text-muted-foreground">{q.includes("pg-staging") ? "pg-staging only exists in qa. " : ""}Try removing the prod filter.</span>
            <div className="mt-2 flex items-center gap-3">
              {envFilter && <Btn variant="secondary" size="sm" onClick={() => { setEnvFilter(false); toast("Showing all envs") }}>Remove &quot;Env: prod&quot;</Btn>}
              <Btn variant="ghost" size="sm" onClick={() => { setQ(""); setEnvFilter(true) }}>Clear all</Btn>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className={cn(card, "overflow-hidden")}>
          <div className="grid grid-cols-[1fr_170px_130px_120px_80px] border-b border-line-2 py-3 pr-4 pl-11 text-[10.5px] tracking-[0.08em] text-subtle uppercase">
            <span>Event</span><span>Resource</span><span>Actor</span><span>Env</span><span className="text-right">When</span>
          </div>
          {days.map((d) => {
            const list = rows.filter((r) => r.day === d)
            if (!list.length) return null
            return (
              <div key={d}>
                <div className="px-4 pt-3 pb-1.5 text-[10.5px] tracking-[0.06em] text-subtle uppercase">{d}</div>
                <Stagger>
                  {list.map((e) => {
                    const [Icon, c] = ICON[e.icon]
                    const on = selected === e.id
                    return (
                      <StaggerItem key={e.id}>
                        <button onClick={() => router.push(href(`/activity/${e.id}`))} className={cn("relative grid h-10 w-full grid-cols-[28px_1fr_170px_130px_120px_80px] items-center border-t border-line px-4 text-left text-[13px] transition-colors", on ? "bg-surface-2" : "hover:bg-surface-2/50")}>
                          {on && <motion.span layoutId="audit-sel" className="absolute top-0 bottom-0 left-0 w-0.5 bg-foreground" />}
                          <Icon className={cn("size-3.5", c)} />
                          <span className="truncate text-foreground">{e.title}</span>
                          <span className="truncate font-mono text-[11.5px] text-muted-foreground">{e.resource}</span>
                          <span className="text-muted-foreground">{e.actor}</span>
                          <span className="text-warning">{e.env}</span>
                          <span className="text-right text-subtle">{e.when}</span>
                        </button>
                      </StaggerItem>
                    )
                  })}
                </Stagger>
              </div>
            )
          })}
        </div>
      )}
      {rows.length > 0 && (
        <div className="flex justify-between text-[12px] text-subtle">
          <span>Showing {rows.length} of 37 prod events</span>
          <button onClick={() => toast("Loaded 7 more events")} className="hover:text-foreground">Load more</button>
        </div>
      )}
      <EventDrawer id={selected} open={open} />
    </div>
  )
}

function EventDrawer({ id, open }: { id?: string; open: boolean }) {
  const href = useHref()
  const router = useRouter()
  const ev = auditLog.find((e) => e.id === id)
  const d = (id && id in eventDetail ? eventDetail[id as keyof typeof eventDetail] : null) ?? (ev && {
    title: ev.title, meta: `${ev.day} ${ev.when} · ${ev.env} · by ${ev.actor}`,
    rows: [["Resource", ev.resource, true], ["Module", ev.module, false], ["Actor", ev.actor, false]] as [string, string, boolean][],
    timeline: [[ev.when, ev.title, false]] as [string, string, boolean][], payload: null, failed: false,
  })
  const [retrying, setRetrying] = React.useState(false)
  const close = () => router.push(href("/activity/audit"))
  React.useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && open && close()
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  })
  return (
    <AnimatePresence>
      {open && d && (
        <motion.aside initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="fixed top-14 right-0 bottom-0 z-30 flex w-[440px] flex-col border-l border-line-2 bg-page shadow-[-24px_0_48px_-24px_#000]">
          <div className="flex items-start justify-between border-b border-line-2 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
                {d.failed && <TriangleAlert className="size-4 text-destructive" />}{d.title}
              </span>
              <span className="text-[12.5px] text-subtle">{d.meta}</span>
            </div>
            <button onClick={close} aria-label="Close" className="rounded p-1 text-subtle hover:bg-surface-2 hover:text-foreground"><X className="size-3.5" /></button>
          </div>
          <div className="flex flex-col gap-2.5 border-b border-line-2 px-5 py-5">
            {d.rows.map(([k, v, mono]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] text-[12.5px]"><span className="text-subtle">{k}</span><span className={cn("text-foreground", mono && "font-mono")}>{v}</span></div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-b border-line-2 px-5 py-5">
            <span className="text-[10.5px] tracking-[0.08em] text-subtle uppercase">Timeline</span>
            {d.timeline.map(([t, l, bad], i) => (
              <motion.div key={t + l} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="grid grid-cols-[54px_1fr] text-[12.5px]">
                <span className="text-subtle">{t}</span><span className={bad ? "text-destructive" : "text-muted-foreground"}>{l}</span>
              </motion.div>
            ))}
          </div>
          {d.payload && (
            <pre className="m-5 rounded-[10px] border border-line-2 bg-surface px-4 py-3.5 font-mono text-[11px] leading-[18px] text-muted-foreground">
              {d.payload.map((l) => <div key={l} className={l.includes("error") ? "text-destructive" : ""}>{l}</div>)}
            </pre>
          )}
          <div className="mt-auto flex items-center justify-between border-t border-line-2 px-5 py-4">
            <button onClick={() => { navigator.clipboard?.writeText(location.href).catch(() => {}); toast.success("Link copied") }} className="text-[12.5px] text-subtle hover:text-foreground">Copy link</button>
            <div className="flex gap-2">
              <Btn variant="secondary" href={href("/services/order-service")}>Open resource</Btn>
              {d.failed && (
                <Btn variant="primary" onClick={() => { setRetrying(true); setTimeout(() => { setRetrying(false); toast.success("Apply re-queued", { description: "ACL fulfil-v2 · Argo CD sync started" }) }, 900) }}>
                  {retrying && <Loader className="animate-spin" />} Retry apply
                </Btn>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/* ================= Classic C3b Activity ================= */
const CICON: Record<string, React.ComponentType<{ className?: string }>> = { deploy: Rocket, approved: CircleCheck, secret: KeyRound, rejected: CircleX, network: Network }

export function ClassicActivity() {
  const href = useHref()
  const [q, setQ] = React.useState("")
  const max = Math.max(...eventsPerHour)
  const rows = classicFeed.filter((r) => !q || `${r.actor} ${r.text}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <ClassicPage crumbs={<span className="flex items-center gap-2 text-[14px] font-medium text-foreground"><ActivityIcon className="size-4" /> Activity</span>}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-semibold text-foreground">Activity</h1>
          <p className="text-[13px] text-muted-foreground">Everything that changed in commerce · 612 events in the last 24h</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" href={href("/activity/audit")}>Audit log</Btn>
          <Btn variant="secondary" onClick={() => toast.success("Exported 612 events")}>Export CSV</Btn>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-[12px] border border-line-2 bg-surface px-4 py-4">
        <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Events per hour</span><span className="text-destructive">failure burst · 09:00</span></div>
        <div className="flex h-10 items-end gap-3">
          {eventsPerHour.map((v, i) => (
            <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ delay: i * 0.02, duration: 0.4, ease }} className={cn("flex-1 rounded-[1px]", i === failureHour ? "bg-destructive" : "bg-surface-3")} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <label className="flex h-9 w-80 items-center gap-2.5 rounded-[8px] border border-line-3 px-3">
          <Search className="size-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, people, resources…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
        </label>
        {["Type", "Actor"].map((f) => <button key={f} onClick={() => toast(`Filter by ${f.toLowerCase()}`)} className="h-9 rounded-[8px] border border-dashed border-line-3 px-3 text-[12.5px] text-muted-foreground hover:text-foreground">{f} ▾</button>)}
      </div>
      <div className="flex flex-col">
        <span className="pb-2 text-[11px] tracking-[0.06em] text-subtle uppercase">Today</span>
        {rows.length === 0 && <div className="py-16 text-center text-[13px] text-subtle">No events match &quot;{q}&quot; · <button className="text-foreground underline" onClick={() => setQ("")}>clear search</button></div>}
        <Stagger>
          {rows.map((r) => {
            const Icon = CICON[r.icon]
            return (
              <StaggerItem key={r.t}>
                <Link href={href(`/activity/${"id" in r ? r.id : "ev-deploy"}`)} className="flex h-10 items-center gap-6 border-b border-line text-[13px] hover:bg-surface/60">
                  <span className="w-10 font-mono text-[12px] text-subtle">{r.t}</span>
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground"><span className="font-medium text-foreground">{r.actor}</span> {r.text}</span>
                  <span className={cn("text-[12px]", r.tone === "destructive" ? "text-destructive" : "text-subtle")}>{r.right}</span>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </ClassicPage>
  )
}
