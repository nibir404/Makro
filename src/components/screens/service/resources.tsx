"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Clock,
  Copy,
  List as ListIcon,
  Loader,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  TriangleAlert,
  Workflow,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { getService, secretKeys, type Health, type Resource, type Service } from "@/lib/data"
import {
  kafkaAclRows,
  kafkaHistory,
  kafkaRetention,
  networkDetail,
  pgConnection,
  pgCredentials,
  resourceHistory,
  rotateSteps,
} from "@/lib/data-ext/service"
import { Btn, IntegrationLogo, Spark, StatusDot, StatusText, ease, useHotkey } from "@/components/idp/kit"
import { stagedStore, useStaged } from "./store"

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type RState = "applying" | "failed" | undefined

function nodeTitle(r: Resource) {
  return r.type === "network" ? `Access · ${r.name.split(":")[0]}` : r.name
}

function look(r: Resource, state: RState) {
  if (state === "applying")
    return { tone: "busy" as Health, Icon: Loader, spin: true, text: "Applying · partitions 7/12", cls: "text-info", dots: ["ok", "ok"] as Health[] }
  if (state === "failed")
    return { tone: "fail" as Health, Icon: TriangleAlert, text: "Apply failed · 409", cls: "text-destructive", dots: ["ok", "ok"] as Health[] }
  switch (r.status) {
    case "health-fail":
      return { tone: "fail" as Health, Icon: TriangleAlert, text: r.statusLabel, cls: "text-destructive", dots: ["ok", "fail"] as Health[] }
    case "expiring":
      return { tone: "warn" as Health, Icon: Clock, text: `${r.detail.split(" · ")[0]} · SecretID expires in 3d`, cls: "text-warning", dots: ["ok", "warn"] as Health[] }
    case "draft":
      return { tone: "idle" as Health, Icon: CircleDashed, text: "Draft · not submitted", cls: "text-muted-foreground", dots: ["idle", "idle"] as Health[] }
    default:
      return { tone: "ok" as Health, Icon: CircleCheck, text: r.detail, cls: "text-success", dots: ["ok", "ok"] as Health[] }
  }
}

/** Navigation helpers that keep ?env and ?view. */
function useNav(service: string) {
  const href = useHref()
  const router = useRouter()
  const sp = useSearchParams()
  const keep = (extra: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams()
    const env = sp?.get("env")
    const view = sp?.get("view")
    if (env) p.set("env", env)
    if (view) p.set("view", view)
    Object.entries(extra).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    const s = p.toString()
    return s ? `?${s}` : ""
  }
  return {
    base: href(`/services/${service}`),
    keep,
    open: (rid: string) => router.push(href(`/services/${service}/r/${encodeURIComponent(rid)}`) + keep(), { scroll: false }),
    close: () => router.push(href(`/services/${service}`) + keep(), { scroll: false }),
    tab: (rid: string, tab: string) =>
      router.replace(href(`/services/${service}/r/${encodeURIComponent(rid)}`) + keep({ tab }), { scroll: false }),
  }
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export function ServiceResources({ service, resource }: { service: string; resource?: string }) {
  const mode = useMode()
  const sp = useSearchParams()
  const svc = getService(service)
  const selected = resource ? svc.resources.find((r) => r.id === decodeURIComponent(resource)) : undefined
  const state = (sp?.get("state") as RState) || undefined
  const nav = useNav(service)
  useHotkey("escape", () => selected && nav.close(), { enabled: !!selected })

  if (mode === "classic")
    return (
      <>
        <ClassicTable svc={svc} selected={selected} state={state} />
        <InspectorDrawer svc={svc} selected={selected} state={state} classic />
      </>
    )

  const view = sp?.get("view") === "list" ? "list" : "canvas"
  if (!svc.resources.length) return <EmptyCanvas svc={svc} />
  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="relative min-w-0 flex-1">
        {view === "canvas" ? (
          <NodeCanvas svc={svc} selected={selected} state={state} />
        ) : (
          <ListView svc={svc} selected={selected} state={state} />
        )}
      </div>
      <InspectorDrawer svc={svc} selected={selected} state={state} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Canvas chrome                                                       */
/* ------------------------------------------------------------------ */

function ViewToggle({ service, view }: { service: string; view: "canvas" | "list" }) {
  void service
  const pathname = usePathname() ?? ""
  const sp = useSearchParams()
  const to = (v: string) => {
    const p = new URLSearchParams(sp?.toString())
    if (v === "list") p.set("view", "list")
    else p.delete("view")
    const s = p.toString()
    return `${pathname}${s ? `?${s}` : ""}`
  }
  return (
    <div className="flex h-8.5 items-center gap-0.5 rounded-[10px] border border-line-2 bg-surface/90 p-0.5 backdrop-blur">
      {(
        [
          ["canvas", "Canvas", Workflow],
          ["list", "List", ListIcon],
        ] as const
      ).map(([id, label, Icon]) => (
        <Link
          key={id}
          href={to(id)}
          scroll={false}
          className={cn(
            "relative flex h-full items-center gap-1.5 rounded-[8px] px-2.5 text-xs transition-colors",
            view === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {view === id && (
            <motion.span layoutId="svc-view-pill" className="absolute inset-0 rounded-[8px] bg-surface-3" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
          )}
          <Icon className="relative size-3.5" />
          <span className="relative">{label}</span>
        </Link>
      ))}
      <span className="px-1.5 font-mono text-[11px] text-subtle">v</span>
    </div>
  )
}

function StagedBar({ service, classic }: { service: string; classic?: boolean }) {
  const href = useHref()
  const staged = useStaged()
  const discard = () => {
    const prev = stagedStore.get()
    stagedStore.clear()
    toast("Staged changes discarded", { action: { label: "Undo", onClick: () => stagedStore.set(prev) } })
  }
  const n = staged.length
  if (classic)
    return (
      <AnimatePresence>
        {n > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease }}
            className="mt-5 flex h-15 items-center justify-between rounded-[12px] border border-line-2 bg-surface px-4"
          >
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <CircleDashed className="size-3.5 animate-spin-slow" />
              <motion.span key={n} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                {n} change{n > 1 ? "s" : ""} staged — {staged.map((s) => s.label).join(", ")}
              </motion.span>
            </span>
            <span className="flex items-center gap-2">
              <Btn variant="ghost" size="sm" onClick={discard}>
                Discard
              </Btn>
              <Btn variant="secondary" size="sm" href={href(`/services/${service}/add/review`)}>
                Review & submit
              </Btn>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    )
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute bottom-6 left-1/2 z-20 flex h-11 items-center gap-3 rounded-[12px] border border-line-3 bg-surface/95 pr-1 pl-4 shadow-2xl backdrop-blur"
        >
          <CircleDashed className="size-3.5 animate-spin-slow text-muted-foreground" />
          <motion.span key={n} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] text-foreground">
            {n} change{n > 1 ? "s" : ""} staged
          </motion.span>
          <button onClick={discard} className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            Discard
          </button>
          <Btn variant="primary" size="sm" href={href(`/services/${service}/add/review`)}>
            Review & submit
          </Btn>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/* Node canvas                                                         */
/* ------------------------------------------------------------------ */

const SVC_W = 240
const SVC_H = 102
const RES_X = 560
const RES_W = 220
const RES_H = 80
const GAP = 170

function NodeCanvas({ svc, selected, state }: { svc: Service; selected?: Resource; state: RState }) {
  const href = useHref()
  const nav = useNav(svc.id)
  const nodes = svc.resources.filter((r) => r.type !== "monitoring")
  const top0 = 150
  const span = (nodes.length - 1) * GAP + RES_H
  const svcY = top0 + span / 2 - SVC_H / 2
  const svcX = 140

  const [t, setT] = React.useState({ x: 0, y: 0, k: 1 })
  const [drag, setDrag] = React.useState<null | { sx: number; sy: number; ox: number; oy: number }>(null)
  const zoom = (d: number) => setT((p) => ({ ...p, k: Math.min(2, Math.max(0.5, +(p.k + d).toFixed(2))) }))
  useHotkey("=", () => zoom(0.1))
  useHotkey("-", () => zoom(-0.1))
  useHotkey("0", () => setT({ x: 0, y: 0, k: 1 }))

  return (
    <div
      className={cn("dot-grid absolute inset-0 overflow-hidden", drag ? "cursor-grabbing" : "cursor-grab")}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-node],[data-ui]")) return
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setDrag({ sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y })
      }}
      onPointerMove={(e) => drag && setT((p) => ({ ...p, x: drag.ox + e.clientX - drag.sx, y: drag.oy + e.clientY - drag.sy }))}
      onPointerUp={() => setDrag(null)}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) zoom(e.deltaY > 0 ? -0.05 : 0.05)
        else setT((p) => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }))
      }}
    >
      <div
        className={cn("absolute top-0 left-0 origin-top-left", !drag && "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]")}
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}
      >
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1}>
          {nodes.map((r, i) => {
            const x1 = svcX + SVC_W
            const y1 = svcY + SVC_H / 2 + (i - (nodes.length - 1) / 2) * 6
            const x2 = RES_X
            const y2 = top0 + i * GAP + RES_H / 2
            const mx = (x1 + x2) / 2
            const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
            const sel = selected?.id === r.id
            const applying = sel && state === "applying"
            return (
              <motion.path
                key={r.id}
                d={d}
                fill="none"
                stroke={applying ? "var(--info)" : sel && state === "failed" ? "var(--destructive)" : sel ? "var(--foreground)" : "var(--subtle)"}
                strokeOpacity={sel ? 1 : 0.55}
                strokeWidth={sel ? 1.5 : 1}
                strokeDasharray={sel && !applying ? undefined : "4 4"}
                className={applying ? "animate-[svc-dash_0.8s_linear_infinite]" : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease, delay: 0.1 + i * 0.06 }}
              />
            )
          })}
        </svg>
        <style>{`@keyframes svc-dash{to{stroke-dashoffset:-16}}`}</style>

        <ServiceNode svc={svc} x={svcX} y={svcY} />
        {nodes.map((r, i) => (
          <ResourceNode
            key={r.id}
            r={r}
            x={RES_X}
            y={top0 + i * GAP}
            i={i}
            selected={selected?.id === r.id}
            state={selected?.id === r.id ? state : undefined}
            onClick={() => (selected?.id === r.id ? nav.close() : nav.open(r.id))}
          />
        ))}
      </div>

      <div data-ui className="absolute top-6 left-6 z-10">
        <ViewToggle service={svc.id} view="canvas" />
      </div>
      <div data-ui className="absolute top-6 right-6 z-10">
        <Btn variant="secondary" size="sm" href={href(`/services/${svc.id}/add`)}>
          <Plus /> Add
        </Btn>
      </div>
      <div data-ui className="absolute bottom-6 left-6 z-10 flex h-10 items-center gap-1 rounded-[10px] border border-line-2 bg-surface/90 px-1 backdrop-blur">
        <button aria-label="Zoom out" onClick={() => zoom(-0.1)} className="grid size-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <Minus className="size-3.5" />
        </button>
        <button onClick={() => setT({ x: 0, y: 0, k: 1 })} className="w-11 font-mono text-[11px] text-muted-foreground hover:text-foreground" title="Reset (0)">
          {Math.round(t.k * 100)}%
        </button>
        <button aria-label="Zoom in" onClick={() => zoom(0.1)} className="grid size-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <Plus className="size-3.5" />
        </button>
      </div>
      <div data-ui>
        <StagedBar service={svc.id} />
      </div>
    </div>
  )
}

function Dots({ d }: { d: Health[] }) {
  return (
    <span className="flex items-center gap-1">
      {d.map((h, i) => (
        <StatusDot key={i} health={h} pulse={h === "fail" || h === "busy"} className="size-1.5" />
      ))}
    </span>
  )
}

function ServiceNode({ svc, x, y }: { svc: Service; x: number; y: number }) {
  const sparkData = [5, 6, 5, 7, 6, 8, 7, 9, 8, 9, 10, 9, 11]
  return (
    <motion.div
      data-node
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease }}
      whileHover={{ y: -2 }}
      className="absolute flex flex-col gap-1 rounded-[14px] border border-line-3 bg-surface p-1 shadow-lg"
      style={{ left: x, top: y, width: SVC_W, height: SVC_H }}
    >
      <div className="flex h-9 items-center justify-between rounded-[10px] border border-line-2 bg-surface-2 px-2.5">
        <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <IntegrationLogo name="kubernetes" className="size-4" /> {svc.name}
        </span>
        <Dots d={["ok", "ok"]} />
      </div>
      <div className="px-2 font-mono text-[11.5px] text-muted-foreground">{svc.host}</div>
      <div className="flex items-center justify-between px-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[11.5px] text-muted-foreground">
          <CircleCheck className="size-3.5 shrink-0 text-success" />
          <span className="truncate">
            {svc.version} · {svc.pods} · {svc.deployed.replace("deployed ", "")}
          </span>
        </span>
        <Spark data={sparkData} width={44} height={12} />
      </div>
    </motion.div>
  )
}

function ResourceNode({
  r,
  x,
  y,
  i,
  selected,
  state,
  onClick,
}: {
  r: Resource
  x: number
  y: number
  i: number
  selected: boolean
  state: RState
  onClick: () => void
}) {
  const l = look(r, state)
  const ring = selected
    ? state === "applying"
      ? "border-info ring-2 ring-info/25"
      : state === "failed"
        ? "border-destructive ring-2 ring-destructive/25"
        : "border-foreground ring-2 ring-foreground/10"
    : r.status === "draft"
      ? "border-dashed border-line-3"
      : "border-line-3"
  return (
    <motion.button
      data-node
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease, delay: 0.08 + i * 0.06 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "absolute flex flex-col gap-1.5 rounded-[14px] border bg-surface p-1 text-left shadow-lg outline-none transition-[border-color,box-shadow] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary",
        ring,
      )}
      style={{ left: x, top: y, width: RES_W, height: RES_H }}
    >
      <div className="flex h-9 w-full items-center justify-between rounded-[10px] border border-line-2 bg-surface-2 px-2.5">
        <span className={cn("flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground", r.type === "kafka" && "font-mono text-[12.5px]")}>
          <IntegrationLogo name={r.logo} className="size-4" />
          <span className="truncate">{nodeTitle(r)}</span>
        </span>
        <Dots d={l.dots} />
      </div>
      <div className="flex w-full items-center justify-between gap-2 px-2">
        <span className={cn("flex min-w-0 items-center gap-1.5 text-[11.5px]", l.cls)}>
          <l.Icon className={cn("size-3.5 shrink-0", l.spin && "animate-spin-slow")} />
          <span className="truncate">{l.text}</span>
        </span>
        <Spark data={r.spark} tone={l.tone === "busy" ? "ok" : l.tone} width={44} height={12} />
      </div>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/* Empty canvas (02h)                                                  */
/* ------------------------------------------------------------------ */

function EmptyCanvas({ svc }: { svc: Service }) {
  const href = useHref()
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-50 light:opacity-20"
        style={{ backgroundImage: "url(/textures/horizon.png)" }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--page)_0%,transparent_70%)] opacity-70" />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="card-gloss relative flex w-90 flex-col items-center gap-4 rounded-[18px] px-8 py-8"
      >
        <span className="flex h-8 items-center gap-2 rounded-[9px] border border-line-3 bg-surface-2 px-2.5 text-[13px] text-foreground">
          <IntegrationLogo name="kubernetes" className="size-3.5" /> {svc.name} <StatusDot health="ok" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">Nothing connected yet</h2>
        <div className="flex gap-2">
          {[
            ["Database", "postgres"],
            ["Kafka", "kafka"],
            ["Secrets", "secrets"],
          ].map(([l, t]) => (
            <Link
              key={t}
              href={href(`/services/${svc.id}/add?type=${t}`)}
              className="h-7.5 rounded-[7px] border border-dashed border-line-3 px-2.5 text-xs leading-7 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              + {l}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Btn variant="primary" href={href(`/services/${svc.id}/add`)}>
            Add resource
          </Btn>
          <Btn variant="ghost" onClick={() => toast("Import stack", { description: "Pick a Pulumi stack to import — coming soon." })}>
            Import stack
          </Btn>
        </div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* List view (02b) + Classic table (C2b)                               */
/* ------------------------------------------------------------------ */

function statusTone(r: Resource, sel: boolean, state: RState) {
  if (sel && state === "applying") return ["bg-info", "text-info", "Applying"]
  if (sel && state === "failed") return ["bg-destructive", "text-destructive", "Apply failed"]
  if (r.status === "health-fail") return ["bg-destructive", "text-destructive", r.statusLabel]
  if (r.status === "expiring") return ["bg-warning", "text-warning", r.statusLabel]
  if (r.status === "draft") return ["bg-subtle", "text-muted-foreground", r.statusLabel]
  return ["bg-success", "text-success", r.statusLabel]
}

function ResourceRows({ svc, selected, state }: { svc: Service; selected?: Resource; state: RState }) {
  const nav = useNav(svc.id)
  return (
    <div className="overflow-hidden rounded-[12px] border border-line-2 bg-surface">
      <div className="grid h-10 grid-cols-[2.2fr_1.3fr_1.6fr_1.6fr_40px] items-center border-b border-line-2 px-4 font-mono text-[11px] uppercase tracking-[0.06em] text-subtle">
        <span>Resource</span>
        <span>Type</span>
        <span>Status</span>
        <span>Detail</span>
        <span />
      </div>
      {svc.resources.map((r, i) => {
        const sel = selected?.id === r.id
        const [dot, txt, label] = statusTone(r, sel, state)
        return (
          <motion.button
            key={r.id}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease, delay: i * 0.04 }}
            onClick={() => (sel ? nav.close() : nav.open(r.id))}
            className={cn(
              "group grid h-12 w-full grid-cols-[2.2fr_1.3fr_1.6fr_1.6fr_40px] items-center border-b border-line-2 px-4 text-left text-[13px] transition-colors last:border-b-0 hover:bg-surface-2",
              sel && "bg-surface-2",
            )}
          >
            <span className="flex items-center gap-2.5 font-mono text-[12.5px] text-foreground">
              <IntegrationLogo name={r.logo} className="size-4" /> {r.name}
            </span>
            <span className="text-foreground">{r.typeLabel}</span>
            <span className={cn("flex items-center gap-2 text-xs", txt)}>
              <span className={cn("size-1.5 rounded-full", dot, (r.status === "health-fail" || (sel && state)) && "animate-pulse")} />
              {label}
            </span>
            <span className="text-foreground">{r.detail}</span>
            <ChevronRight className="size-3.5 text-subtle transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        )
      })}
    </div>
  )
}

function ListView({ svc, selected, state }: { svc: Service; selected?: Resource; state: RState }) {
  const href = useHref()
  return (
    <div className="absolute inset-0 overflow-auto px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <ViewToggle service={svc.id} view="list" />
        <Btn variant="secondary" size="sm" href={href(`/services/${svc.id}/add`)}>
          <Plus /> Add
        </Btn>
      </div>
      <ResourceRows svc={svc} selected={selected} state={state} />
      <StagedBar service={svc.id} classic />
    </div>
  )
}

function ClassicTable({ svc, selected, state }: { svc: Service; selected?: Resource; state: RState }) {
  const href = useHref()
  if (!svc.resources.length)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-line-3">
        <div className="text-sm text-foreground">Nothing connected yet</div>
        <Btn variant="primary" href={href(`/services/${svc.id}/add`)}>
          <Plus /> Add resource
        </Btn>
      </div>
    )
  return (
    <>
      <ResourceRows svc={svc} selected={selected} state={state} />
      <StagedBar service={svc.id} classic />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Inspector                                                           */
/* ------------------------------------------------------------------ */

const TABS: Record<string, [string, string][]> = {
  kafka: [
    ["details", "Details"],
    ["config", "Config"],
    ["acls", "ACLs"],
    ["history", "History"],
  ],
  postgres: [
    ["details", "Connection"],
    ["credentials", "Credentials"],
    ["history", "History"],
  ],
}

function InspectorDrawer({ svc, selected, state, classic }: { svc: Service; selected?: Resource; state: RState; classic?: boolean }) {
  return (
    <AnimatePresence>
      {selected && (
        <motion.aside
          key="inspector"
          initial={{ x: 400, opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 36 }}
          className={cn(
            "z-30 flex w-95 shrink-0 flex-col border-l border-line bg-surface",
            classic ? "fixed top-0 right-0 bottom-0 shadow-2xl" : "relative",
          )}
        >
          <Inspector svc={svc} r={selected} state={state} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function Inspector({ svc, r, state }: { svc: Service; r: Resource; state: RState }) {
  const sp = useSearchParams()
  const nav = useNav(svc.id)
  const tab = sp?.get("tab") ?? "details"
  const tabs = TABS[r.type]

  if (tab === "rotate" && r.type === "postgres") return <RotatePanel svc={svc} r={r} />

  const title = r.type === "network" ? `Access · ${r.name.split(":")[0]}` : r.name
  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <span className={cn("flex items-center gap-2.5 text-sm text-foreground", r.type === "kafka" && "font-mono text-[13px]")}>
          <IntegrationLogo name={r.logo} className="size-4" /> {title}
        </span>
        <button aria-label="Close (Esc)" title="Close · Esc" onClick={nav.close} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <X className="size-4" />
        </button>
      </header>
      {tabs && !state && (
        <nav className="flex h-11 shrink-0 items-end gap-5 border-b border-line px-5">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => nav.tab(r.id, id)}
              className={cn("relative pb-2.5 text-[13px] transition-colors", tab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
              {tab === id && <motion.span layoutId="insp-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />}
            </button>
          ))}
        </nav>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${r.id}-${tab}-${state}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {state === "applying" ? (
            <ApplyingPanel />
          ) : state === "failed" ? (
            <FailedPanel svc={svc} r={r} />
          ) : r.type === "kafka" ? (
            tab === "config" ? (
              <KafkaConfig r={r} />
            ) : tab === "acls" ? (
              <KafkaAcls />
            ) : tab === "history" ? (
              <HistoryList rows={kafkaHistory} />
            ) : (
              <KafkaDetails svc={svc} r={r} />
            )
          ) : r.type === "postgres" ? (
            tab === "credentials" ? (
              <PgCredentials svc={svc} r={r} />
            ) : tab === "history" ? (
              <HistoryList rows={resourceHistory} />
            ) : (
              <PgConnection svc={svc} r={r} />
            )
          ) : r.type === "secrets" ? (
            <SecretsPanel />
          ) : r.type === "network" ? (
            <NetworkPanel />
          ) : (
            <GenericDetails r={r} />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5", className)}>{children}</div>
}
function Footer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex shrink-0 flex-col gap-2 border-t border-line px-5 py-4", className)}>{children}</div>
}
function KV({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("truncate text-right text-foreground", mono && "font-mono text-[12.5px]")}>{v}</span>
    </div>
  )
}

function KafkaDetails({ svc, r }: { svc: Service; r: Resource }) {
  const nav = useNav(svc.id)
  return (
    <>
      <Body>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Status</span>
          <StatusText status="live" />
        </div>
        {Object.entries(r.meta).map(([k, v]) => (
          <KV key={k} k={k} v={v} mono={k !== "Consumers"} />
        ))}
        <div className="flex flex-col gap-3 border-b border-line pb-4">
          <span className="text-[13px] text-muted-foreground">Throughput · 24h</span>
          <Spark data={[3, 3, 4, 4, 5, 5, 4, 6, 6, 7, 6, 8, 8, 9, 9, 10]} step width={338} height={40} />
        </div>
      </Body>
      <Footer>
        <span className="text-[13px] text-muted-foreground">Actions</span>
        <div className="flex gap-2">
          <Btn variant="secondary" className="flex-1" onClick={() => nav.tab(r.id, "config")}>
            Edit config
          </Btn>
          <Btn variant="secondary" className="flex-1" onClick={() => nav.tab(r.id, "config")}>
            Scale
          </Btn>
          <Btn variant="secondary" className="w-9 px-0" aria-label="More" onClick={() => nav.tab(r.id, "history")}>
            <MoreHorizontal />
          </Btn>
        </div>
        <span className="text-xs text-muted-foreground">Changes are staged, then reviewed as one request.</span>
      </Footer>
    </>
  )
}

function KafkaConfig({ r }: { r: Resource }) {
  const [ret, setRet] = React.useState<string>("14d")
  const [policy, setPolicy] = React.useState("delete")
  const changed = ret !== "7d"
  const stage = () => {
    stagedStore.add({ id: `kafka-ret-${r.id}`, label: `retention ${r.name} 7d → ${ret}` })
    toast.success("Change staged", {
      description: `retention 7d → ${ret}`,
      action: { label: "Undo", onClick: () => stagedStore.remove(`kafka-ret-${r.id}`) },
    })
  }
  return (
    <>
      <Body>
        <Field label="Partitions" hint="can only increase">
          <div className="flex h-9 items-center rounded-[9px] border border-line-3 bg-surface-2 px-3 font-mono text-[13px] text-foreground">12</div>
        </Field>
        <Field label="Retention" hint={changed ? <span className="text-info">changed</span> : undefined}>
          <div className={cn("grid h-9 grid-cols-5 gap-0.5 rounded-[9px] border bg-surface-2 p-0.5", changed ? "border-info" : "border-line-3")}>
            {kafkaRetention.map((d) => (
              <button
                key={d}
                onClick={() => setRet(d)}
                className={cn("relative rounded-[7px] text-xs transition-colors", ret === d ? "text-foreground" : "text-muted-foreground hover:text-foreground", d === "7d" && changed && "line-through")}
              >
                {ret === d && <motion.span layoutId="ret-pill" className="absolute inset-0 rounded-[7px] bg-surface-3" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="relative">{d}</span>
              </button>
            ))}
          </div>
          {changed && <span className="text-[11px] text-subtle">~ +38 GB storage on makro-prod-core</span>}
        </Field>
        <Field label="Cleanup policy">
          <div className="relative">
            <select
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              className="h-9 w-full appearance-none rounded-[9px] border border-line-3 bg-surface-2 px-3 text-[13px] text-foreground outline-none focus:border-foreground/40"
            >
              <option value="delete">delete</option>
              <option value="compact">compact</option>
              <option value="compact,delete">compact,delete</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-2.5 right-3 size-4 text-muted-foreground" />
          </div>
        </Field>
        <Field label="Max message size">
          <input defaultValue="1 MB" className="h-9 rounded-[9px] border border-line-3 bg-surface-2 px-3 font-mono text-[13px] text-foreground outline-none focus:border-foreground/40" />
        </Field>
        <KV k="Replication factor · min ISR" v={<span className="text-muted-foreground">3 · 2 (locked)</span>} />
        <button className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground" onClick={() => toast("Showing all 14 broker settings")}>
          Show all 14 broker settings
        </button>
      </Body>
      <Footer>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", changed ? "bg-info" : "bg-faint")} />
          {changed ? `1 change · retention 7d → ${ret}` : "No changes"}
        </span>
        <div className="flex gap-2">
          <Btn variant="secondary" className="flex-1" onClick={() => setRet("7d")} disabled={!changed}>
            Discard
          </Btn>
          <Btn variant="outline" className="flex-1 border-foreground/70" onClick={stage} disabled={!changed}>
            Stage change
          </Btn>
        </div>
      </Footer>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[13px] text-muted-foreground">
        {label}
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function KafkaAcls() {
  const [rows, setRows] = React.useState(kafkaAclRows)
  return (
    <>
      <Body className="gap-2">
        <AnimatePresence initial={false}>
          {rows.map((a) => (
            <motion.div
              key={a.principal}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="group flex items-center justify-between rounded-[10px] border border-line-2 bg-surface-2 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono text-[12.5px] text-foreground">{a.principal}</span>
                <span className="text-[11.5px] text-muted-foreground">{a.kind}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-[5px] border px-1.5 font-mono text-[10.5px]", a.op === "WRITE" ? "border-primary/40 text-primary" : "border-line-3 text-muted-foreground")}>{a.op}</span>
                {a.status === "review" ? <StatusText status="review" label="" /> : null}
                <button
                  aria-label="Remove"
                  onClick={() => {
                    const prev = rows
                    setRows(rows.filter((x) => x !== a))
                    stagedStore.add({ id: `acl-${a.principal}`, label: `revoke ${a.op} for ${a.principal}` })
                    toast("ACL removal staged", {
                      action: {
                        label: "Undo",
                        onClick: () => {
                          setRows(prev)
                          stagedStore.remove(`acl-${a.principal}`)
                        },
                      },
                    })
                  }}
                  className="grid size-6 place-items-center rounded text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </Body>
      <Footer>
        <Btn
          variant="secondary"
          onClick={() => {
            stagedStore.add({ id: "acl-new", label: "grant READ to svc-analytics" })
            toast.success("ACL grant staged", { action: { label: "Undo", onClick: () => stagedStore.remove("acl-new") } })
          }}
        >
          <Plus /> Grant access
        </Btn>
      </Footer>
    </>
  )
}

function HistoryList({ rows }: { rows: { when: string; who: string; what: string; status: Parameters<typeof StatusText>[0]["status"]; ref?: string }[] }) {
  return (
    <Body className="gap-0">
      {rows.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3, ease }}
          className="relative flex gap-3 pb-5 last:pb-0"
        >
          <span className="relative mt-1.5 flex flex-col items-center">
            <StatusDot health={h.status === "failed" ? "fail" : h.status === "review" ? "warn" : "ok"} pulse={false} />
            {i < rows.length - 1 && <span className="absolute top-3 h-[calc(100%+4px)] w-px bg-line-3" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] text-foreground">{h.what}</span>
            <span className="text-xs text-muted-foreground">
              {h.who} · {h.when}
              {h.ref && <span className="font-mono"> · {h.ref}</span>}
            </span>
          </div>
        </motion.div>
      ))}
    </Body>
  )
}

function ApplyingPanel() {
  const [p, setP] = React.useState(7)
  React.useEffect(() => {
    const id = setInterval(() => setP((v) => (v >= 11 ? 7 : v + 1)), 1800)
    return () => clearInterval(id)
  }, [])
  const steps = [
    ["MR !509 merged", "done"],
    ["Pre-checks passed", "done"],
    [`Reassigning partitions · ${p} / 12`, "run"],
    ["Verify consumer lag", "todo"],
  ]
  return (
    <>
      <Body>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-info">
            <Loader className="size-4 animate-spin-slow" /> Applying
          </span>
          <span className="font-mono text-xs text-muted-foreground">1m 12s</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-3">
          <motion.div className="h-full rounded-full bg-info" animate={{ width: `${(p / 12) * 100}%` }} transition={{ duration: 0.6, ease }} />
        </div>
        <p className="text-xs text-muted-foreground">Scaling partitions 6 → 12 · TR-001039 · approved by daniel.w</p>
        <div className="flex flex-col gap-3 rounded-[12px] border border-line-2 bg-surface-2/50 p-4">
          {steps.map(([t, s]) => (
            <span key={s + t.slice(0, 6)} className={cn("flex items-center gap-2.5 text-[13px]", s === "run" ? "text-info" : s === "todo" ? "text-muted-foreground" : "text-foreground")}>
              {s === "done" ? <CircleCheck className="size-3.5" /> : s === "run" ? <Loader className="size-3.5 animate-spin-slow" /> : <CircleDashed className="size-3.5" />}
              {t}
            </span>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">Live log</span>
        <div className="flex flex-col gap-1 rounded-[12px] border border-line-2 bg-page p-4 font-mono text-[11.5px] text-muted-foreground">
          {[6, 7, 8].map((n, i) => (
            <span key={n}>
              14:02:{11 + i * 8} reassign p{n} → broker-{n - 2}{" "}
              {i < 2 ? <span className="text-foreground">ok</span> : <span className="animate-pulse text-info">running…</span>}
            </span>
          ))}
        </div>
      </Body>
      <Footer>
        <span className="text-xs text-muted-foreground">Safe to leave · you&apos;ll get a notification when it&apos;s live.</span>
      </Footer>
    </>
  )
}

function FailedPanel({ svc, r }: { svc: Service; r: Resource }) {
  const router = useRouter()
  const href = useHref()
  const [busy, setBusy] = React.useState(false)
  const retry = () => {
    setBusy(true)
    setTimeout(() => {
      toast.success("Retry started", { description: `${r.name} · applying` })
      router.replace(href(`/services/${svc.id}/r/${encodeURIComponent(r.id)}?state=applying`), { scroll: false })
    }, 900)
  }
  return (
    <>
      <Body>
        <div className="rounded-[12px] border border-destructive/40 bg-destructive/8 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TriangleAlert className="size-4 text-destructive" /> Apply failed — nothing was changed
          </div>
          <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
            The cluster is already moving partitions for another topic, so it rejected this one (409).
          </p>
        </div>
        <span className="text-[13px] text-foreground">What you can do</span>
        <ol className="flex flex-col gap-2 text-[13px] leading-5 text-muted-foreground">
          <li className="flex gap-3">
            <span className="text-foreground">1.</span> Retry in a few minutes — the other reassignment finishes in ~4m.
          </li>
          <li className="flex gap-3">
            <span className="text-foreground">2.</span> Schedule it for tonight&apos;s window (02:00).
          </li>
        </ol>
        <span className="text-[13px] text-muted-foreground">Error</span>
        <pre className="rounded-[12px] border border-line-2 bg-page p-4 font-mono text-[11.5px] leading-5 text-destructive">
          PATCH /topics/{r.name}
          {"\n"}409 ReassignmentInProgress (broker 4)
        </pre>
        <span className="text-xs text-muted-foreground">
          <button className="hover:text-foreground" onClick={() => { navigator.clipboard?.writeText("409 ReassignmentInProgress (broker 4)"); toast("Error copied") }}>
            Copy error
          </button>{" "}
          · <Link href={href("/activity")} className="hover:text-foreground">Open run log</Link>
        </span>
      </Body>
      <Footer className="flex-row">
        <Btn variant="secondary" className="flex-1" onClick={() => toast.success("Scheduled for 02:00 tonight", { action: { label: "Undo", onClick: () => toast("Schedule cancelled") } })}>
          Schedule
        </Btn>
        <Btn variant="primary" className="flex-1" onClick={retry} disabled={busy}>
          {busy && <Loader className="animate-spin" />} Retry apply
        </Btn>
      </Footer>
    </>
  )
}

function PgConnection({ svc, r }: { svc: Service; r: Resource }) {
  const nav = useNav(svc.id)
  const href = useHref()
  return (
    <>
      <Body>
        <div className="flex items-center justify-between rounded-[10px] border border-destructive/40 bg-destructive/8 px-3.5 py-2.5 text-[13px] text-foreground">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-destructive" /> Health check failing · 12m
          </span>
          <Link href={href("/activity")} className="text-xs text-primary hover:underline">
            Diagnose
          </Link>
        </div>
        {Object.entries(pgConnection)
          .filter(([k]) => k !== "conn")
          .map(([k, v]) => (
            <KV key={k} k={k} v={v} />
          ))}
        <span className="text-[13px] text-muted-foreground">Connection string</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(pgConnection.conn)
            toast.success("Connection string copied")
          }}
          className="flex items-center justify-between rounded-[9px] border border-line-2 bg-page px-3 py-2.5 font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {pgConnection.conn} <Copy className="size-3.5" />
        </button>
      </Body>
      <Footer className="flex-row">
        <Btn variant="secondary" className="flex-1" onClick={() => nav.tab(r.id, "rotate")}>
          Rotate password
        </Btn>
        <Btn
          variant="secondary"
          className="flex-1"
          onClick={() => toast("Rolled back to v7", { description: "DB_PASSWORD restored · pods restarting", action: { label: "Undo", onClick: () => toast("Restored v8") } })}
        >
          Roll back to v7
        </Btn>
      </Footer>
    </>
  )
}

function PgCredentials({ svc, r }: { svc: Service; r: Resource }) {
  const nav = useNav(svc.id)
  const [reveal, setReveal] = React.useState(false)
  return (
    <>
      <Body>
        <div className="flex flex-col gap-3 rounded-[12px] border border-line-2 bg-surface-2/50 p-4">
          <KV k="Role" v="order_service_app" />
          <KV k="Password" v={reveal ? "p9X!vQ2m#Lr8" : "••••••••"} />
          <KV k="Version" v="v8 · 34d old" />
          <KV k="Rotation" v="every 30 days · overdue 4d" mono={false} />
          <Btn
            variant="ghost"
            size="xs"
            className="self-start"
            onClick={() => {
              setReveal((v) => !v)
              if (!reveal) toast("Reveal logged to audit trail")
            }}
          >
            {reveal ? "Hide" : "Reveal"}
          </Btn>
        </div>
        <span className="text-[13px] text-muted-foreground">Versions</span>
        {pgCredentials.map((c) => (
          <div key={c.version} className="flex items-center justify-between text-[13px]">
            <span className="font-mono text-foreground">{c.version}</span>
            <span className="text-muted-foreground">
              {c.created} · {c.by}
            </span>
            <span className={c.state === "current" ? "text-success" : "text-subtle"}>{c.state}</span>
          </div>
        ))}
      </Body>
      <Footer>
        <Btn variant="primary" onClick={() => nav.tab(r.id, "rotate")}>
          Rotate password
        </Btn>
      </Footer>
    </>
  )
}

function RotatePanel({ svc, r }: { svc: Service; r: Resource }) {
  const nav = useNav(svc.id)
  const [step, setStep] = React.useState(-1) // -1 = confirm
  const [pods, setPods] = React.useState(0)
  React.useEffect(() => {
    if (step < 0 || step >= 3) return
    if (step === 1) {
      if (pods < 3) {
        const t = setTimeout(() => setPods((p) => p + 1), 900)
        return () => clearTimeout(t)
      }
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 1 ? 600 : 1200)
    return () => clearTimeout(t)
  }, [step, pods])
  React.useEffect(() => {
    if (step === 3) toast.success("Password rotated to v9", { description: "v8 expires in 24h · logged to Activity", action: { label: "Undo", onClick: () => toast("Rolled back to v8") } })
  }, [step])
  const bars = step < 0 ? [14, 12, 10, 6, 4, 2, 2, 2] : [14, 12, 10, 6, 4, 3 + step * 4, 8 + step * 6, 10 + step * 7]
  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <span className="flex items-center gap-2.5 text-sm text-foreground">
          <button aria-label="Back" onClick={() => nav.tab(r.id, "details")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
          Rotate password
        </span>
        <span className="rounded-[4px] bg-warning/15 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-warning">PROD</span>
      </header>
      <Body>
        <div>
          <div className="font-mono text-[13px] text-foreground">order_service_app</div>
          <div className="text-xs text-muted-foreground">v8 → v9 · zero downtime</div>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-subtle">How it works</span>
        <div className="flex flex-col gap-3">
          {rotateSteps.map((s, i) => {
            const st = step < 0 ? "todo" : i < step ? "done" : i === step ? "run" : "todo"
            const Icon = st === "done" ? CircleCheck : st === "run" ? Loader : CircleDashed
            return (
              <div key={s.title} className="flex gap-2.5">
                <Icon className={cn("mt-0.5 size-3.5 shrink-0", st === "run" && "animate-spin-slow text-foreground", st === "done" ? "text-success" : st === "todo" ? "text-subtle" : "")} />
                <div className="flex flex-col">
                  <span className={cn("text-[13px]", st === "todo" && step >= 0 ? "text-muted-foreground" : "text-foreground")}>{s.title}</span>
                  {s.sub && (
                    <span className={cn("text-[11px]", st === "run" && i === 1 ? "text-info" : "text-subtle")}>
                      {i === 1 && st === "run" ? `restarting 3 pods · ${pods}/3` : s.sub}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="rounded-[12px] border border-line-2 bg-surface-2/40 p-3.5">
          <span className="text-[13px] text-foreground">Active connections</span>
          <div className="mt-3 flex h-9 items-end gap-1">
            {bars.map((b, i) => (
              <motion.span key={i} className={cn("flex-1 rounded-[2px]", i < 5 ? "bg-subtle" : "bg-foreground")} animate={{ height: `${(b / 16) * 100}%` }} transition={{ duration: 0.5, ease }} />
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 bg-subtle" /> v8 · {step < 0 ? 31 : 14}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 bg-foreground" /> v9 · {step < 0 ? 0 : 31}
            </span>
          </div>
        </div>
      </Body>
      <Footer className="flex-row items-center justify-between">
        {step < 0 ? (
          <>
            <span className="text-xs text-muted-foreground">Restarts 3 pods on prod</span>
            <Btn variant="primary" onClick={() => setStep(0)}>
              Rotate now
            </Btn>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">Logged to Activity</span>
            <Btn variant="secondary" onClick={() => { setStep(-1); setPods(0); toast("Rolled back to v8") }}>
              Roll back to v8
            </Btn>
          </>
        )}
      </Footer>
    </>
  )
}

function SecretsPanel() {
  const [q, setQ] = React.useState("")
  const [shown, setShown] = React.useState<string | null>(null)
  const keys = secretKeys.filter((k) => k.key.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <Body className="gap-1">
        <div className="mb-3 flex gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-[9px] border border-line-3 bg-surface-2 px-3">
            <Search className="size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${secretKeys.length} keys`} className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <Btn variant="secondary" className="w-9 px-0" aria-label="Add key" onClick={() => { stagedStore.add({ id: "secret-new", label: "new secret key" }); toast.success("New key staged", { action: { label: "Undo", onClick: () => stagedStore.remove("secret-new") } }) }}>
            <Plus />
          </Btn>
        </div>
        {keys.map((k) => (
          <button
            key={k.key}
            onClick={() => setShown(shown === k.key ? null : k.key)}
            className={cn("group -mx-2 flex h-10 items-center justify-between rounded-[8px] px-2 text-left transition-colors hover:bg-surface-2", k.inherited && "opacity-70")}
          >
            <span className="font-mono text-[12px] text-foreground">{k.key}</span>
            {k.inherited ? (
              <span className="rounded-[5px] border border-line-3 px-1.5 text-[10.5px] text-muted-foreground">inherited · shared-infra</span>
            ) : (
              <span className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
                {shown === k.key ? k.value : "••••••••"}
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100">Edit</span>
              </span>
            )}
          </button>
        ))}
        <span className="mt-2 text-xs text-muted-foreground">v24 · last change 2h ago by priya.s</span>
      </Body>
      <Footer>
        <span className="flex items-center justify-between text-[13px] text-foreground">
          <span className="flex items-center gap-2">
            <Clock className="size-3.5 text-warning" /> App access SecretID expires in 3 days
          </span>
          <button className="text-primary hover:underline" onClick={() => toast.success("SecretID rotation started", { description: "New SecretID issued · old valid 24h" })}>
            Rotate
          </button>
        </span>
        <span className="text-xs text-muted-foreground">Values are masked · reveal is logged to the audit trail.</span>
      </Footer>
    </>
  )
}

function NetworkPanel() {
  const [confirm, setConfirm] = React.useState(false)
  return (
    <>
      <Body>
        <div className="flex items-center justify-between text-[13px]">
          <StatusText status="live" label="Active" />
          <span className="text-warning">expires in 12 days</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-3">
          <motion.div className="h-full bg-foreground/80" initial={{ width: 0 }} animate={{ width: "60%" }} transition={{ duration: 0.8, ease }} />
        </div>
        <span className="text-xs text-muted-foreground">Granted Nov 6 · 30-day access · approved by daniel.w</span>
        {Object.entries(networkDetail).map(([k, v]) => (
          <KV key={k} k={k} v={v} />
        ))}
        <span className="text-[13px] text-muted-foreground">Members · 3</span>
        <div className="flex items-center gap-1.5">
          {["AC", "SK", "PS"].map((m) => (
            <span key={m} className="grid size-6 place-items-center rounded-full bg-surface-3 text-[9px] text-foreground">
              {m}
            </span>
          ))}
          <button className="ml-1 text-xs text-primary hover:underline" onClick={() => toast("Manage members")}>
            Manage
          </button>
        </div>
        <AnimatePresence>
          {confirm && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[12px] border border-destructive/40 bg-destructive/8 p-4 text-[13px]">
              <div className="font-medium text-foreground">Revoke access on PROD?</div>
              <p className="mt-1 text-muted-foreground">order-service loses access to warehouse-api:443 immediately. 3 members affected.</p>
              <div className="mt-3 flex gap-2">
                <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Btn>
                <Btn size="sm" variant="destructive" onClick={() => { setConfirm(false); toast("Access revoked", { action: { label: "Undo", onClick: () => toast("Access restored") } }) }}>Revoke</Btn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Body>
      <Footer className="flex-row">
        <Btn variant="destructive" className="flex-1" onClick={() => setConfirm(true)}>
          Revoke
        </Btn>
        <Btn variant="primary" className="flex-1" onClick={() => toast.success("Renewal requested · 30 days", { description: "Auto-approved · same scope" })}>
          Renew 30 days
        </Btn>
      </Footer>
    </>
  )
}

function GenericDetails({ r }: { r: Resource }) {
  return (
    <Body>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">Status</span>
        <StatusText status="live" />
      </div>
      {Object.entries(r.meta).map(([k, v]) => (
        <KV key={k} k={k} v={v} mono={false} />
      ))}
      <Spark data={r.spark} width={338} height={40} />
    </Body>
  )
}
