"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Check, ChevronDown, Loader, Plus, Search, Trash2, X, Network, Crown, ShieldCheck, UserPlus } from "lucide-react"
import { ReactFlow, Background, type Edge, type Node, type NodeTypes, Handle, Position } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"
import type { Logo } from "@/lib/data"
import { useHref, useMode } from "@/lib/mode"
import { Btn, FadeIn, IntegrationLogo, Stagger, StaggerItem, StatusDot, ease, useHotkey } from "@/components/idp/kit"
import { getProject, projectCards, projectServices, switcherItems } from "@/lib/data-ext/infra-projects"
import { Card, CountUp, Crumbs, Field, Modal, Screen, Seg, TH, inputCls } from "../infra/ui"

function Letter({ l, className }: { l: string; className?: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-surface-3 text-[13px] text-muted-foreground", className)}>
      {l}
    </span>
  )
}

/* ---------------- 11a switcher ---------------- */
export function ProjectSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const href = useHref()
  const router = useRouter()
  const mode = useMode()
  const [q, setQ] = React.useState("")
  const [active, setActive] = React.useState(0)
  const items = switcherItems.filter((i) => i.name.includes(q.toLowerCase()))
  React.useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowDown") setActive((a) => Math.min(items.length - 1, a + 1))
      if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1))
      if (e.key === "Enter" && items[active]) router.push(href(`/projects/${items[active].id}`))
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [open, items, active, onClose, router, href])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease }}
            className={cn("fixed z-50 w-[300px]", mode === "classic" ? "top-[52px] left-[268px]" : "top-[50px] left-14", " origin-top-left overflow-hidden rounded-[12px] border border-line-3 bg-surface shadow-2xl")}
          >
            <div className="flex items-center gap-2 border-b border-line-2 px-3 py-2.5">
              <Search className="size-3.5 text-subtle" />
              <input autoFocus value={q} onChange={(e) => (setQ(e.target.value), setActive(0))} placeholder="Find project…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
            </div>
            <div className="flex flex-col p-1.5">
              {items.map((it, i) => (
                <Link
                  key={it.id}
                  href={href(`/projects/${it.id}`)}
                  onMouseEnter={() => setActive(i)}
                  className="relative flex h-9 items-center gap-2.5 rounded-[8px] px-2.5"
                >
                  {active === i && <motion.span layoutId="sw-hl" className="absolute inset-0 rounded-[8px] bg-surface-3" transition={{ duration: 0.2, ease }} />}
                  <Letter l={it.letter} className="relative size-5 text-[10px]" />
                  <span className="relative flex-1 text-[13px] text-foreground">{it.name}</span>
                  <span className={cn("relative text-[11px]", it.fail ? "text-destructive" : "text-subtle")}>{it.meta}</span>
                  {it.id === "commerce" && <Check className="relative size-3.5 text-foreground" />}
                </Link>
              ))}
              {items.length === 0 && <p className="px-2.5 py-3 text-[13px] text-subtle">No project matches “{q}”</p>}
            </div>
            <div className="flex flex-col border-t border-line-2 p-1.5">
              <Link href={href("/projects")} onClick={onClose} className="rounded-[8px] px-2.5 py-2 text-[13px] text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                All projects
              </Link>
              <Link href={href("/projects/new")} className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[13px] text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                <Plus className="size-3.5" /> New project
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* C4f — Classic projects table */
const CLASSIC_PROJECTS = [
  { id: "commerce", l: "C", name: "commerce", owner: "team-orders · you", n: 12, envs: 3, h: "ok" as const, label: "Healthy", tile: "bg-foreground text-page", current: true },
  { id: "pricing", l: "P", name: "pricing", owner: "team-pricing", n: 6, envs: 3, h: "warn" as const, label: "1 degraded", tile: "bg-[#D9C3A5] text-page" },
  { id: "payments", l: "P", name: "payments", owner: "team-pay", n: 8, envs: 3, h: "ok" as const, label: "Healthy", tile: "bg-muted-foreground text-page" },
  { id: "supply-chain", l: "W", name: "warehouse", owner: "team-warehouse", n: 7, envs: 3, h: "fail" as const, label: "1 failing", tile: "bg-subtle text-page" },
  { id: "loyalty", l: "C", name: "crm", owner: "team-crm", n: 3, envs: 2, h: "ok" as const, label: "Healthy", tile: "bg-surface-3 text-foreground" },
]
function ClassicProjects({ sw, setSw }: { sw: boolean; setSw: (v: boolean) => void }) {
  const href = useHref()
  const router = useRouter()
  const [q, setQ] = React.useState("")
  useHotkey("n", () => router.push(href("/projects/new")))
  const list = CLASSIC_PROJECTS.filter((p) => p.name.includes(q.toLowerCase()))
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Projects" }]} />}>
      <ProjectSwitcher open={sw} onClose={() => setSw(false)} />
      <FadeIn className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Projects</h1>
          <p className="text-[13px] text-muted-foreground">5 projects you belong to</p>
        </div>
        <Btn variant="primary" href={href("/projects/new")}><Plus /> New project</Btn>
      </FadeIn>
      <div className="flex h-[34px] w-80 items-center gap-2 rounded-[8px] border border-line-3 bg-surface px-3">
        <Search className="size-3.5 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_0.75fr_0.75fr_1fr] border-b border-line-2 px-4 py-3">
          <TH>Project</TH><TH>Owner</TH><TH>Services</TH><TH>Envs</TH><TH>Health</TH>
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((p) => (
            <motion.div key={p.name} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Link href={href(`/projects/${p.id}`)} className="grid grid-cols-[1.5fr_1fr_0.75fr_0.75fr_1fr] items-center border-b border-line-2 px-4 py-3.5 text-[13px] transition-colors hover:bg-surface-2">
                <span className="flex items-center gap-2.5">
                  <span className={cn("flex size-6 items-center justify-center rounded-[6px] text-[11px] font-semibold", p.tile)}>{p.l}</span>
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.current && <span className="rounded-[4px] border border-line-3 px-1.5 text-[10.5px] text-muted-foreground">current</span>}
                </span>
                <span className="text-muted-foreground">{p.owner}</span>
                <span className="text-muted-foreground">{p.n}</span>
                <span className="text-muted-foreground">{p.envs}</span>
                <span className={cn("flex items-center gap-1.5 text-[12px]", HEALTH_TXT[p.h])}><StatusDot health={p.h} />{p.label}</span>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </Card>
    </Screen>
  )
}

/* ---------------- 11b list ---------------- */
export function ProjectsList() {
  const href = useHref()
  const router = useRouter()
  const sp = useSearchParams()
  const mode = useMode()
  const [q, setQ] = React.useState("")
  const [sw, setSw] = React.useState(sp.get("switcher") === "1")
  useHotkey("n", () => router.push(href("/projects/new")))
  const list = projectCards.filter((p) => p.name.includes(q.toLowerCase()))
  if (mode === "classic") return <ClassicProjects sw={sw} setSw={setSw} />
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Projects" }]} />}>
      <ProjectSwitcher open={sw} onClose={() => setSw(false)} />
      <FadeIn className="flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Projects</h1>
          <p className="text-[14px] text-muted-foreground">4 projects · 31 services · you&apos;re in 3</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="md" onClick={() => setSw(true)}>Switch</Btn>
          <div className="flex h-9 w-60 items-center gap-2 rounded-[9px] border border-line-3 bg-page px-3">
            <Search className="size-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-subtle" />
          </div>
          <Btn variant="primary" href={href("/projects/new")}>New project</Btn>
        </div>
      </FadeIn>
      <Stagger className="grid grid-cols-3 gap-3">
        {list.map((p) => (
          <StaggerItem key={p.id}>
            <Link href={href(`/projects/${p.id}`)} className="block">
              <motion.div whileHover={{ y: -2 }} className={cn("card-gloss flex flex-col gap-4 rounded-[14px] p-4", p.tone === "dim" && "opacity-70")}>
                <div className="flex items-center gap-2.5">
                  <Letter l={p.letter} />
                  <div className="leading-tight">
                    <div className="text-[14px] text-foreground">{p.name}</div>
                    <div className="text-[11px] text-subtle">{p.team} · {p.role}</div>
                  </div>
                </div>
                <div className="flex h-1 gap-1">
                  {[["bg-success", p.bar[0]], ["bg-warning", p.bar[1]], ["bg-destructive", p.bar[2]]].map(([c, w], i) =>
                    (w as number) > 0 ? (
                      <motion.span key={i} className={cn("rounded-full", c as string)} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.6, ease, delay: 0.15 + i * 0.1 }} />
                    ) : null,
                  )}
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">{p.services}</span>
                  <span className={p.tone === "fail" ? "text-destructive" : "text-muted-foreground"}>{p.right}</span>
                </div>
              </motion.div>
            </Link>
          </StaggerItem>
        ))}
        <StaggerItem>
          <Link href={href("/projects/new")} className="flex h-full min-h-[117px] flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-line-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
            <Plus className="size-4" /> New project
          </Link>
        </StaggerItem>
      </Stagger>
    </Screen>
  )
}

/* ---------------- 11c overview / 11e delete / 11f canvas ---------------- */
function KPI({ label, value, sub, bar, barCls }: { label: string; value: React.ReactNode; sub?: React.ReactNode; bar?: number; barCls?: string }) {
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[24px] font-semibold tracking-[-0.01em]">{value}</span>
      {sub && <span className="text-[12px] text-muted-foreground">{sub}</span>}
      {bar !== undefined && (
        <div className="mt-1 h-1 rounded-full bg-surface-3">
          <motion.div className={cn("h-full rounded-full", barCls)} initial={{ width: 0 }} animate={{ width: `${bar}%` }} transition={{ duration: 0.7, ease }} />
        </div>
      )}
    </Card>
  )
}

const HEALTH_TXT = { ok: "text-success", warn: "text-warning", fail: "text-destructive" }

const members = [
  { name: "Alex Chen", email: "alex.chen@makro.co.th", role: "Owner", team: "team-orders", last: "now" },
  { name: "Priya S.", email: "priya.s@makro.co.th", role: "Owner", team: "team-orders", last: "4m" },
  { name: "Sam K.", email: "sam.k@makro.co.th", role: "Approver", team: "team-payments", last: "1h" },
  { name: "Nattaya K.", email: "nattaya.k@makro.co.th", role: "Approver", team: "team-pricing", last: "3h" },
  { name: "Kittipat R.", email: "kittipat.r@makro.co.th", role: "Developer", team: "team-ops", last: "1d" },
  { name: "Ploy W.", email: "ploy.w@makro.co.th", role: "Developer", team: "team-orders", last: "2d" },
]

function MembersTab() {
  const [list, setList] = React.useState(members)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line-2 px-4 py-2.5">
        <TH>Members · 18</TH>
        <Btn size="xs" onClick={() => toast.success("Invite sent", { description: "new.member@makro.co.th · Developer" })}>
          <UserPlus /> Invite
        </Btn>
      </div>
      <AnimatePresence initial={false}>
        {list.map((m) => (
          <motion.div key={m.email} layout exit={{ opacity: 0, x: -16 }} className="grid grid-cols-[1fr_160px_160px_80px_90px] items-center border-b border-line-2 px-4 py-3 text-[14px] last:border-0">
            <span className="flex items-center gap-2.5">
              <Letter l={m.name[0]} className="size-6 rounded-full text-[11px]" />
              <span className="leading-tight">
                <span className="block text-foreground">{m.name}</span>
                <span className="text-[11px] text-subtle">{m.email}</span>
              </span>
            </span>
            <select
              defaultValue={m.role}
              onChange={(e) => toast.success(`${m.name} is now ${e.target.value}`)}
              className="h-7 w-32 rounded-[7px] border border-line-3 bg-page px-2 text-[13px] outline-none"
            >
              {["Owner", "Approver", "Developer", "Viewer"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <span className="text-muted-foreground">{m.team}</span>
            <span className="text-[12px] text-subtle">{m.last}</span>
            <span className="text-right">
              {m.role === "Owner" ? (
                <Crown className="ml-auto size-3.5 text-warning" />
              ) : (
                <button
                  className="text-[12px] text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setList((s) => s.filter((x) => x !== m))
                    toast(`${m.name} removed`, { action: { label: "Undo", onClick: () => setList((s) => [...s, m]) } })
                  }}
                >
                  Remove
                </button>
              )}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="px-4 py-3 text-[13px] text-muted-foreground">+ 12 more members</div>
    </Card>
  )
}

function SettingsTab({ onDelete, name }: { onDelete: () => void; name: string }) {
  const [desc, setDesc] = React.useState("Order capture, checkout and fulfilment for makro.co.th")
  const [req2, setReq2] = React.useState(true)
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-4 p-5">
        <Field label="Display name">
          <input defaultValue={name} disabled className={cn(inputCls, "font-mono opacity-60")} />
        </Field>
        <Field label="Description">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          {[["Kafka topics", "50"], ["Postgres DBs", "8"], ["Monthly budget", "$6,000"]].map(([l, v]) => (
            <div key={l} className="rounded-[8px] border border-line-3 bg-page px-3 py-2">
              <div className="text-[11px] text-muted-foreground">{l}</div>
              <div className="font-mono text-[13px]">{v}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setReq2((v) => !v)} className="flex items-center justify-between rounded-[10px] border border-line-2 px-3.5 py-3 text-left">
          <span className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span>
              <span className="block text-[14px]">Two approvers for prod</span>
              <span className="text-[12px] text-muted-foreground">Tier-2 changes on prod need a second owner or approver</span>
            </span>
          </span>
          <span className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", req2 ? "bg-primary" : "bg-surface-3")}>
            <motion.span layout className={cn("size-4 rounded-full bg-white", req2 && "ml-auto")} />
          </span>
        </button>
        <div className="flex justify-end">
          <Btn variant="primary" size="sm" onClick={() => toast.success("Settings saved")}>Save changes</Btn>
        </div>
      </Card>
      <Card className="flex items-center justify-between border-destructive/30 p-4">
        <div>
          <div className="text-[14px] text-foreground">Delete project</div>
          <div className="text-[12px] text-muted-foreground">Removes {name}, its 14 services, topics, databases and secrets. Type to confirm.</div>
        </div>
        <Btn variant="destructive" onClick={onDelete}>
          <Trash2 /> Delete project…
        </Btn>
      </Card>
    </div>
  )
}

export function ProjectOverview({ id }: { id: string }) {
  const href = useHref()
  const router = useRouter()
  const sp = useSearchParams()
  const p = getProject(id)
  const view = sp.get("view") === "canvas" ? "canvas" : "table"
  const tab = (sp.get("tab") as "overview" | "members" | "settings") ?? "overview"
  const del = sp.get("delete") === "1"
  const setQ = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp.toString())
    if (v === null) n.delete(k)
    else n.set(k, v)
    router.replace(`?${n.toString()}`, { scroll: false })
  }
  if (view === "canvas") return <ProjectCanvasPage p={p} onList={() => setQ("view", null)} />
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Projects", href: href("/projects") }, { label: p.name }]} />}>
      <FadeIn className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Letter l={p.letter} className="size-9 text-[15px]" />
          <div>
            <h1 className="text-[20px] font-semibold">{p.name}</h1>
            <p className="text-[14px] text-muted-foreground">Owner {p.team} · created Jan 2024</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn size="sm" variant="ghost" onClick={() => setQ("view", "canvas")}><Network /> Canvas</Btn>
          <Seg
            id="ptab"
            value={tab}
            onChange={(v) => setQ("tab", v === "overview" ? null : v)}
            options={[
              { value: "overview", label: "Overview" },
              { value: "members", label: "Members" },
              { value: "settings", label: "Settings" },
            ]}
          />
        </div>
      </FadeIn>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Services" value={<CountUp to={14} />} sub="12 healthy · 1 degraded · 1 failing" />
        <KPI label="Members" value={<CountUp to={18} />} sub="3 owners · 4 approvers" />
        <KPI label="Kafka quota" value={<><CountUp to={41} /> <span className="text-[12px] font-normal text-muted-foreground">/ 50 topics</span></>} bar={82} barCls="bg-warning" />
        <KPI label="Infra spend · Nov" value={<>$<CountUp to={4.2} decimals={1} />k <span className="text-[12px] font-normal text-muted-foreground">of $6k</span></>} bar={70} barCls="bg-foreground" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease }}>
          {tab === "settings" ? (
            <SettingsTab name={p.name} onDelete={() => setQ("delete", "1")} />
          ) : tab === "members" ? (
            <MembersTab />
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_220px_120px_120px] border-b border-line-2 px-4 py-2.5">
                <TH>Service</TH><TH>Owner</TH><TH>Resources</TH><TH>Prod</TH><TH className="text-right">Status</TH>
              </div>
              <Stagger>
                {projectServices.map((s) => (
                  <StaggerItem key={s.name}>
                    <Link href={href(`/services/${s.name}`)} className="grid grid-cols-[1fr_120px_220px_120px_120px] items-center border-b border-line-2 px-4 py-3 text-[14px] hover:bg-surface-2">
                      <span className="text-foreground">{s.name}</span>
                      <span className="text-muted-foreground">{s.owner}</span>
                      <span className="flex gap-1.5">{s.logos.map((l) => <IntegrationLogo key={l} name={l} className="size-3.5" />)}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">{s.prod}</span>
                      <span className={cn("flex items-center justify-end gap-1.5", HEALTH_TXT[s.status])}>
                        <StatusDot health={s.status} /> {s.label}
                      </span>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
              <div className="px-4 py-3 text-[13px] text-muted-foreground">+ 11 more services</div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
      <DeleteProject open={del} name={p.name} onClose={() => setQ("delete", null)} />
    </Screen>
  )
}

/* 11f — project as a canvas: services → shared resources → infra */
export type GData = { kind: "svc" | "res" | "infra"; label: string; sub?: string; h?: "ok" | "warn" | "fail"; badge?: string; logo?: Logo; mono?: boolean; selected?: boolean; drift?: boolean; subCls?: string }
function GNode({ data }: { data: GData }) {
  const h = <Handle type="target" position={Position.Left} className="!size-1 !min-h-0 !border-0 !bg-transparent" />
  const s = <Handle type="source" position={Position.Right} className="!size-1 !min-h-0 !border-0 !bg-transparent" />
  return (
    <div
      className={cn(
        "w-[220px] rounded-[8px] border bg-surface px-3.5 py-2.5 transition-shadow hover:shadow-[0_0_0_1px_var(--color-line-3)]",
        data.selected ? "border-foreground/85" : data.drift ? "border-dashed border-warning/60" : "border-line-3",
        data.kind === "svc" && "w-[240px]",
      )}
    >
      {h}
      <div className="flex items-center gap-2">
        {data.logo && <IntegrationLogo name={data.logo} mono={data.mono} className="size-3.5" />}
        <span className={cn("flex-1 truncate text-[13px] text-foreground", data.kind !== "svc" && "font-mono text-[12px]")}>{data.label}</span>
        {data.badge && (
          <span className={cn("flex items-center gap-1 text-[11px]", data.h ? HEALTH_TXT[data.h] : "text-subtle")}>
            {data.h && <StatusDot health={data.h} />} {data.badge}
          </span>
        )}
      </div>
      {data.sub && <div className={cn("mt-1 text-[11px]", data.subCls ?? "text-subtle")}>{data.sub}</div>}
      {s}
    </div>
  )
}
export const gTypes = { g: GNode } as unknown as NodeTypes

function ProjectCanvasPage({ p, onList }: { p: ReturnType<typeof getProject>; onList: () => void }) {
  const href = useHref()
  const router = useRouter()
  const [group, setGroup] = React.useState("team")
  const [shared, setShared] = React.useState(true)
  const [sel, setSel] = React.useState("pg")
  const N = (id: string, x: number, y: number, data: GData): Node => ({ id, position: { x, y }, data: { ...data, selected: sel === id }, type: "g" })
  const nodes: Node[] = [
    N("os", 116, 196, { kind: "svc", label: "order-service", sub: "team-orders · v1.40.3", badge: "failing", h: "fail", logo: "kubernetes" }),
    N("ca", 116, 386, { kind: "svc", label: "checkout-api", sub: "team-payments · v3.2.0", badge: "live", h: "ok", logo: "kubernetes" }),
    N("fu", 116, 576, { kind: "svc", label: "fulfilment", sub: "team-ops · v2.8.1", badge: "degraded", h: "warn", logo: "kubernetes" }),
    N("vault", 556, 134, { kind: "res", label: "shared/commerce", badge: "4 uses", logo: "vault" }),
    N("pg", 556, 296, { kind: "res", label: "pg-prod-orders", sub: "used by 2 services", logo: "postgres" }),
    N("topic", 556, 486, { kind: "res", label: "orders.created.v1", sub: "1 consumer failing ACL", subCls: "text-destructive", logo: "kafka", mono: true }),
    N("nb", 556, 666, { kind: "res", label: "warehouse-api access", logo: "netbird" }),
    ...(shared ? [] : [N("cache", 556, 760, { kind: "res", label: "redis-orders", sub: "used by 1 service" })]),
    N("stack", 936, 386, { kind: "infra", label: "commerce/order-svc", sub: "drifted · 2 resources", subCls: "text-warning", logo: "pulumi", mono: true, drift: true }),
  ]
  const E = (s: string, t: string, broken?: boolean): Edge => ({
    id: s + t,
    source: s,
    target: t,
    type: "default",
    animated: broken,
    style: broken ? { stroke: "var(--color-destructive)", strokeDasharray: "4 4", strokeWidth: 1.25 } : { stroke: "var(--color-faint)", strokeWidth: 1.25 },
  })
  const edges = [E("os", "vault"), E("os", "pg"), E("ca", "pg"), E("ca", "topic"), E("fu", "topic", true), E("fu", "nb"), E("pg", "stack"), E("topic", "stack")]
  const affected = sel === "pg" ? "order-service, checkout-api" : sel === "topic" ? "checkout-api, fulfilment" : null
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Projects", href: href("/projects") }, { label: p.name }]} />} className="relative gap-0 p-0">
      <div className="dot-grid relative h-[calc(100vh-56px)] min-h-[700px] w-full overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={gTypes}
          onNodeClick={(_, n) => setSel(n.id)}
          onNodeDoubleClick={(_, n) => n.id === "stack" && router.push(href("/infra/stacks/commerce-order-service?view=graph"))}
          defaultViewport={{ x: 24, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
        >
          <Background gap={20} size={1} color="transparent" />
        </ReactFlow>
        <div className="pointer-events-none absolute inset-x-6 top-[118px] grid grid-cols-[556px_380px_1fr] text-[11px] tracking-[0.1em] text-subtle uppercase">
          <span>Services</span><span>Shared resources</span><span>Infra</span>
        </div>
        <div className="absolute inset-x-6 top-6 flex items-center gap-3">
          <Seg id="pcv" value="canvas" onChange={(v) => v === "list" && onList()} options={[{ value: "canvas", label: "Canvas" }, { value: "list", label: "List" }]} />
          <Letter l={p.letter} className="size-6.5 text-[12px]" />
          <span className="text-[16px] font-semibold">{p.name}</span>
          <span className="text-[13px] text-muted-foreground">14 services · 9 shared resources</span>
          <span className="flex-1" />
          <Btn size="sm" onClick={() => setGroup((g) => (g === "team" ? "env" : "team"))}>Group: by {group}</Btn>
          <Btn size="sm" onClick={() => setShared((s) => !s)}>Show: {shared ? "shared only" : "all"}</Btn>
        </div>
        <AnimatePresence>
          {affected && (
            <motion.div
              key={sel}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-[371px] left-[580px] rounded-[6px] border border-line-3 bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground"
            >
              Deleting this affects {affected}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-[8px] border border-line-3 bg-surface px-3 py-2 text-[11px]">
          <span className="text-muted-foreground">— uses</span>
          <span className="text-destructive">— broken link</span>
          <span className="text-warning">— drifted</span>
          <span className="text-muted-foreground">Click a box for details · drag to rearrange</span>
        </div>
      </div>
    </Screen>
  )
}

/** Tier-3 destructive — type the name to confirm. */
export function TypeToConfirm({
  open,
  onClose,
  name,
  title,
  body,
  cta,
  onConfirm,
  footnote,
}: {
  open: boolean
  onClose: () => void
  name: string
  title: string
  body: React.ReactNode
  cta: string
  onConfirm: () => void
  footnote?: React.ReactNode
}) {
  const [v, setV] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const ok = v === name
  return (
    <Modal open={open} onClose={onClose} className="max-w-[520px] overflow-hidden p-0">
      <div className="flex flex-col gap-4 px-[22px] pt-[22px] pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" />
            <h2 className="text-[16px] font-semibold">{title}</h2>
          </div>
          <p className="text-[14px] text-muted-foreground">This permanently removes everything below. It can&apos;t be undone.</p>
        </div>
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/6 px-3.5 py-3 text-[13px] leading-[23px] text-foreground/85">{body}</div>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            Type <code className="font-mono text-foreground">{name}</code> to confirm
          </span>
          <motion.input
            autoFocus
            value={v}
            onChange={(e) => setV(e.target.value)}
            animate={ok ? { x: [0, -2, 2, 0] } : {}}
            className={cn(inputCls, "h-9.5 border-destructive/60 font-mono focus:border-destructive focus:ring-destructive/20")}
            placeholder={name}
          />
        </label>
      </div>
      <div className="flex items-center gap-2 border-t border-line-2 px-[22px] py-4">
        <span className="flex-1 text-[12px] text-muted-foreground">{footnote}</span>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn
            variant="destructive"
            disabled={!ok || busy}
            className="disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => {
              setBusy(true)
              setTimeout(() => {
                setBusy(false)
                setV("")
                onConfirm()
              }, 900)
            }}
          >
            {busy ? "Deleting…" : cta}
          </Btn>
      </div>
    </Modal>
  )
}

function DeleteProject({ open, name, onClose }: { open: boolean; name: string; onClose: () => void }) {
  const href = useHref()
  const router = useRouter()
  return (
    <TypeToConfirm
      open={open}
      onClose={onClose}
      name={name}
      title={`Delete project "${name}"?`}
      cta="Delete project"
      footnote="Needs a second owner to approve"
      body={
        <ul>
          <li>• 14 services and all 3 environments</li>
          <li>• 41 Kafka topics · 5 Postgres databases</li>
          <li>• Vault path {`secret/${name}/*`} (126 keys)</li>
          <li>• 18 member roles · history stays in Activity</li>
        </ul>
      }
      onConfirm={() => {
        toast.success(`Deletion of ${name} requested`, { description: "IR-1043 opened · waiting for approver" })
        router.push(href("/projects"))
      }}
    />
  )
}

/* ---------------- 11d create ---------------- */
export function ProjectCreate() {
  const href = useHref()
  const router = useRouter()
  const [name, setName] = React.useState("marketplace")
  const [team, setTeam] = React.useState("team-marketplace")
  const [people, setPeople] = React.useState(["Priya", "Sam"])
  const [add, setAdd] = React.useState("")
  const [quota, setQuota] = React.useState({ kafka: "25", pg: "5", budget: "$3,000" })
  const [busy, setBusy] = React.useState(false)
  const taken = ["commerce", "payments", "loyalty", "supply-chain"].includes(name)
  const valid = /^[a-z][a-z0-9-]{2,}$/.test(name) && !taken
  const close = () => router.push(href("/projects"))
  useHotkey("escape", close)
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Projects", href: href("/projects") }, { label: "New project" }]} />} className="items-center pt-[60px]">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="w-[560px] overflow-hidden rounded-[14px] border border-line-3 bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line-2 px-5 py-4">
          <h1 className="text-[16px] font-semibold">New project</h1>
          <button onClick={close} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted-foreground">Name</span>
            <div className={cn("flex h-9 items-center rounded-[8px] border bg-page px-3", valid ? "border-foreground/80" : "border-destructive/60")}>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value.toLowerCase())} className="flex-1 bg-transparent font-mono text-[14px] outline-none" />
              <AnimatePresence mode="wait">
                <motion.span key={String(valid)} initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} className={cn("flex items-center gap-1 text-[12px]", valid ? "text-success" : "text-destructive")}>
                  {valid ? <><Check className="size-3" /> available</> : taken ? "taken" : "invalid"}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-[11px] text-subtle">Becomes the Kubernetes namespace and Vault path.</span>
          </div>
          <Field label="Owner team">
            <div className="relative">
              <select value={team} onChange={(e) => setTeam(e.target.value)} className={cn(inputCls, "appearance-none")}>
                {["team-marketplace", "team-orders", "team-ops", "team-payments"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute top-2.5 right-3 size-4 text-subtle" />
            </div>
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted-foreground">Approvers for prod</span>
            <div className="flex min-h-9.5 flex-wrap items-center gap-1.5 rounded-[8px] border border-line-3 bg-page px-2 py-1.5">
              <AnimatePresence initial={false}>
                {people.map((p) => (
                  <motion.span key={p} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-1 rounded-[5px] bg-surface-3 px-2 py-0.5 text-[12px]">
                    {p}
                    <button onClick={() => setPeople((s) => s.filter((x) => x !== p))} aria-label={`Remove ${p}`}><X className="size-3" /></button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <input
                value={add}
                onChange={(e) => setAdd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && add.trim()) {
                    setPeople((s) => [...s, add.trim()])
                    setAdd("")
                  }
                }}
                placeholder="Add people…"
                className="min-w-24 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-subtle"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted-foreground">Quotas</span>
            <div className="grid grid-cols-3 gap-2">
              {([["kafka", "Kafka topics"], ["pg", "Postgres DBs"], ["budget", "Monthly budget"]] as const).map(([k, l]) => (
                <label key={k} className="flex flex-col rounded-[8px] border border-line-3 bg-page px-3 py-2 focus-within:border-primary/60">
                  <span className="text-[11px] text-muted-foreground">{l}</span>
                  <input value={quota[k]} onChange={(e) => setQuota((q) => ({ ...q, [k]: e.target.value }))} className="bg-transparent font-mono text-[13px] outline-none" />
                </label>
              ))}
            </div>
            <span className="text-[11px] text-subtle">Defaults for new projects. Raising them later needs platform approval.</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line-2 px-5 py-3.5">
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!valid || busy}
            className="disabled:opacity-40"
            onClick={() => {
              setBusy(true)
              setTimeout(() => {
                toast.success(`Project ${name} created`, { description: `Namespace + secret/${name}/* provisioning · ~1 min` })
                router.push(href("/projects/commerce"))
              }, 1000)
            }}
          >
            {busy ? <><Loader className="animate-spin" /> Creating…</> : "Create project"}
          </Btn>
        </div>
      </motion.div>
    </Screen>
  )
}
