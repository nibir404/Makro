"use client"

/* On-canvas create palette ("What do you need?") + the per-service store of resources created from it.
   Picking an item drops a draft node onto the canvas and stages it for review, so the review page
   (/add/review) and the staged pill both see it. Full forms stay one click away. */

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ChevronRight, CornerDownLeft, Search, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Logo, Resource, ResourceType } from "@/lib/data"
import { netHosts, readStaged, stageChange, writeStaged, type AddType } from "@/lib/data-ext/add-resource"
import { IntegrationLogo, ease } from "@/components/idp/kit"
import { stagedStore } from "./store"

export type Template = {
  id: string
  label: string
  sub: string
  add: AddType
  type: ResourceType
  logo: Logo
  typeLabel: string
  name: string
  detail: string
  lines: string[]
}
type Category = { id: AddType; label: string; logo: Logo; items: Template[] }

export function catalog(svc: string): Category[] {
  const role = `svc_${svc.replace(/-/g, "_")}`
  return [
    {
      id: "kafka",
      label: "Kafka topic",
      logo: "kafka",
      items: [
        { id: "kafka-produce", label: "Produce to a new topic", sub: "6 partitions · 7 day retention", add: "kafka", type: "kafka", logo: "kafka", typeLabel: "Kafka topic", name: `${svc.split("-")[0]}.events.v1`, detail: "6 partitions · producer", lines: ["partitions: 6   replicationFactor: 3", "retention.ms: 604800000", `acl: svc-${svc} WRITE`] },
        { id: "kafka-consume", label: "Consume payments.captured.v2", sub: "READ ACL + consumer group", add: "kafka", type: "kafka", logo: "kafka", typeLabel: "Kafka topic", name: "payments.captured.v2", detail: "consumer · group " + svc, lines: [`acl: svc-${svc} READ`, `group: ${svc}`] },
      ],
    },
    {
      id: "postgres",
      label: "Postgres user",
      logo: "postgres",
      items: [
        { id: "pg-rw", label: "Read-write user on pg-prod-orders", sub: "password in Vault · rotates every 45d", add: "postgres", type: "postgres", logo: "postgres", typeLabel: "Postgres user", name: `${role}_rw`, detail: "pg-prod-orders · read-write", lines: [`role: ${role}_rw`, "database: pg-prod-orders", "grants: SELECT, INSERT, UPDATE"] },
        { id: "pg-ro", label: "Read-only user on pg-prod-loyalty", sub: "for reporting queries", add: "postgres", type: "postgres", logo: "postgres", typeLabel: "Postgres user", name: `${role}_ro`, detail: "pg-prod-loyalty · read-only", lines: [`role: ${role}_ro`, "database: pg-prod-loyalty", "grants: SELECT"] },
      ],
    },
    {
      id: "database",
      label: "Database · cache · bucket",
      logo: "pulumi",
      items: [
        { id: "db-pg", label: "PostgreSQL", sub: "RDS · small · 2 vCPU 4 GB", add: "database", type: "database", logo: "postgres", typeLabel: "Database", name: `${svc}-db`, detail: "RDS Postgres 16 · small", lines: ["engine: postgres 16", "size: small (2 vCPU · 4 GB)", "backups: 7 days"] },
        { id: "db-redis", label: "Redis cache", sub: "ElastiCache · 1 GB", add: "database", type: "cache", logo: "pulumi", typeLabel: "Cache", name: `${svc}-cache`, detail: "Redis 7 · 1 GB", lines: ["engine: redis 7", "memory: 1 GB", "eviction: allkeys-lru"] },
        { id: "db-s3", label: "S3 bucket", sub: "private · versioned", add: "database", type: "bucket", logo: "pulumi", typeLabel: "Bucket", name: `makro-${svc}-files`, detail: "S3 · private · versioned", lines: ["versioning: on", "public access: blocked", "lifecycle: 90d to IA"] },
      ],
    },
    {
      id: "secret",
      label: "Secret",
      logo: "vault",
      items: [
        { id: "sec-path", label: "New Vault path", sub: `kv/commerce/${svc}/…`, add: "secret", type: "secrets", logo: "vault", typeLabel: "Secrets", name: `Secrets · ${svc}-jobs`, detail: "0 keys · inherits commerce/shared", lines: [`path: kv/commerce/${svc}-jobs`, "inherits: commerce/shared"] },
      ],
    },
    {
      id: "network",
      label: "Network access",
      logo: "netbird",
      items: Object.entries(netHosts).map(([host, v]) => ({
        id: `net-${host}`,
        label: `Reach ${host}`,
        sub: `owned by ${v.owner} · needs their approval`,
        add: "network" as AddType,
        type: "network" as ResourceType,
        logo: "netbird" as Logo,
        typeLabel: "Network access",
        name: `${host.replace(".internal", "")}:443`,
        detail: `${v.group} group · port 443`,
        lines: [`host: ${host}`, "port: 443", `approver: ${v.owner}`],
      })),
    },
    {
      id: "monitoring",
      label: "Monitoring",
      logo: "datadog",
      items: [
        { id: "mon-apm", label: "Datadog APM + logs", sub: "traces, logs, default monitors", add: "monitoring", type: "monitoring", logo: "datadog", typeLabel: "Monitoring", name: `${svc} · APM`, detail: "APM · logs · 3 monitors", lines: ["apm: on", "logs: on", "monitors: latency, errors, saturation"] },
      ],
    },
  ]
}

/* ---------- drafts created on the canvas, per service ---------- */
export type CanvasDraft = Resource & { pos: { x: number; y: number }; add: AddType }
const drafts = new Map<string, CanvasDraft[]>()
const listeners = new Set<() => void>()
const EMPTY: CanvasDraft[] = []
export const draftStore = {
  get: (svc: string) => drafts.get(svc) ?? EMPTY,
  add(svc: string, d: CanvasDraft) {
    drafts.set(svc, [...this.get(svc), d])
    listeners.forEach((f) => f())
  },
  remove(svc: string, id: string) {
    drafts.set(
      svc,
      this.get(svc).filter((d) => d.id !== id),
    )
    listeners.forEach((f) => f())
  },
  subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}
export function useDrafts(svc: string) {
  return React.useSyncExternalStore(draftStore.subscribe, () => draftStore.get(svc), () => EMPTY)
}

export function createDraft(svc: string, t: Template, pos: { x: number; y: number }): CanvasDraft {
  const id = `new-${t.id}-${draftStore.get(svc).length + 1}`
  const d: CanvasDraft = {
    id,
    name: t.name,
    type: t.type,
    typeLabel: t.typeLabel,
    logo: t.logo,
    status: "draft",
    statusLabel: "New · ready for review",
    detail: t.detail,
    env: "prod",
    spark: [1, 1, 1, 1, 1, 1, 1, 1],
    meta: {},
    pos,
    add: t.add,
  }
  draftStore.add(svc, d)
  stagedStore.add({ id, label: `${t.typeLabel.toLowerCase()} ${t.name}` })
  stageChange({ id, type: t.add, title: t.name, label: t.typeLabel, logo: t.logo, lines: t.lines })
  return d
}
export function discardDraft(svc: string, id: string) {
  draftStore.remove(svc, id)
  stagedStore.remove(id)
  writeStaged(readStaged().filter((c) => c.id !== id))
}

/* ---------- palette ---------- */
type Row = { kind: "cat"; cat: Category } | { kind: "item"; t: Template; cat: Category }

export function CreatePalette({
  svc,
  onPick,
  onClose,
  onFullForm,
}: {
  svc: string
  onPick: (t: Template) => void
  onClose: () => void
  onFullForm: (type?: AddType) => void
}) {
  const cats = React.useMemo(() => catalog(svc), [svc])
  const [cat, setCat] = React.useState<Category | null>(null)
  const [q, setQ] = React.useState("")
  const [idx, setIdx] = React.useState(0)
  const input = React.useRef<HTMLInputElement>(null)

  const ql = q.trim().toLowerCase()
  const rows: Row[] = ql
    ? cats.flatMap((c) => c.items.filter((t) => `${c.label} ${t.label} ${t.sub}`.toLowerCase().includes(ql)).map((t) => ({ kind: "item" as const, t, cat: c })))
    : cat
      ? cat.items.map((t) => ({ kind: "item" as const, t, cat }))
      : cats.map((c) => ({ kind: "cat" as const, cat: c }))
  const active = Math.min(idx, Math.max(0, rows.length - 1))

  const enter = (r: Row | undefined) => {
    if (!r) return
    if (r.kind === "cat") {
      setCat(r.cat)
      setIdx(0)
    } else onPick(r.t)
    input.current?.focus()
  }
  const back = () => {
    setCat(null)
    setIdx(0)
  }

  return (
    <motion.div
      data-ui
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-40 flex items-start justify-center bg-black/35 pt-[14vh] backdrop-blur-[1.5px] light:bg-black/10"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.2, ease }}
        className="w-[460px]"
      >
        <div className="mb-2 flex items-center gap-1.5 px-1 text-xs text-subtle">
          <button onClick={back} className={cn("hover:text-foreground", !cat && "text-muted-foreground")}>
            Create
          </button>
          {cat && (
            <>
              <ChevronRight className="size-3" />
              <span className="text-muted-foreground">{cat.label}</span>
            </>
          )}
        </div>
        <div className="overflow-hidden rounded-[14px] border border-line-3 bg-surface/95 shadow-2xl backdrop-blur">
          <div className="flex h-12 items-center gap-2.5 border-b border-line-2 px-3.5">
            {cat && !ql ? (
              <button aria-label="Back" onClick={back} className="text-subtle hover:text-foreground">
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <Search className="size-4 text-subtle" />
            )}
            <input
              ref={input}
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setIdx(0)
              }}
              onKeyDown={(e) => {
                const n = Math.max(1, rows.length)
                let handled = true
                if (e.key === "ArrowDown") setIdx((i) => (i + 1) % n)
                else if (e.key === "ArrowUp") setIdx((i) => (i - 1 + n) % n)
                else if (e.key === "Enter") enter(rows[active])
                else if (e.key === "ArrowRight" && rows[active]?.kind === "cat") enter(rows[active])
                else if ((e.key === "Backspace" || e.key === "ArrowLeft") && !q && cat) back()
                else if (e.key === "Escape") {
                  e.stopPropagation()
                  if (cat && !q) back()
                  else onClose()
                } else handled = false
                if (handled) e.preventDefault()
              }}
              placeholder={cat ? `Search ${cat.label.toLowerCase()}` : "What do you need?"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle"
            />
            <kbd className="rounded-[5px] border border-line-3 px-1.5 font-mono text-[10px] text-subtle">esc</kbd>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={cat?.id ?? (ql ? "search" : "root")}
              initial={{ opacity: 0, x: cat ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease }}
              className="max-h-[320px] overflow-y-auto p-1.5"
            >
              {rows.map((r, i) => {
                const on = i === active
                const logo = r.kind === "cat" ? r.cat.logo : r.t.logo
                return (
                  <button
                    key={r.kind === "cat" ? r.cat.id : r.t.id}
                    onMouseMove={() => setIdx(i)}
                    onClick={() => enter(r)}
                    className={cn("relative flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left", on ? "text-foreground" : "text-muted-foreground")}
                  >
                    {on && <motion.span layoutId="cp-hl" className="absolute inset-0 rounded-[9px] bg-surface-3" transition={{ type: "spring", stiffness: 600, damping: 45 }} />}
                    <span className="relative grid size-7 place-items-center rounded-[7px] border border-line-2 bg-surface-2">
                      <IntegrationLogo name={logo} className="size-3.5" />
                    </span>
                    <span className="relative flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px]">{r.kind === "cat" ? r.cat.label : r.t.label}</span>
                      {r.kind === "item" && (
                        <span className="truncate text-[11px] text-subtle">
                          {ql ? `${r.cat.label} · ` : ""}
                          {r.t.sub}
                        </span>
                      )}
                    </span>
                    {r.kind === "cat" ? (
                      <span className="relative flex items-center gap-1.5 text-[11px] text-subtle">
                        {r.cat.items.length}
                        <ChevronRight className="size-3.5" />
                      </span>
                    ) : (
                      on && <CornerDownLeft className="relative size-3.5 text-subtle" />
                    )}
                  </button>
                )
              })}
              {!rows.length && <p className="px-3 py-6 text-center text-[13px] text-subtle">Nothing matches “{q}”</p>}
            </motion.div>
          </AnimatePresence>
          <button
            onClick={() => onFullForm(cat?.id)}
            className="flex w-full items-center gap-2 border-t border-line-2 px-3.5 py-2.5 text-left text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            {cat ? `Configure a ${cat.label.toLowerCase()} in the full form` : "Open the full add-resource panel"}
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-subtle">New resources land as drafts. Nothing is created until the change set is reviewed.</p>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Import a Pulumi stack (empty service canvas, 02h)                   */
/* ------------------------------------------------------------------ */

type ImportStack = { id: string; name: string; env: string; updated: string; items: (Template & { found: string })[] }
const T = (t: Omit<Template, "lines"> & { found: string; lines?: string[] }): Template & { found: string } => ({ lines: [], ...t })

export function importStacks(svc: string): ImportStack[] {
  return [
    {
      id: "pricing-legacy",
      name: `pricing/${svc}-legacy`,
      env: "prod",
      updated: "41d · CI",
      items: [
        T({ id: "imp-db", label: "PostgreSQL", sub: "", add: "database", type: "database", logo: "postgres", typeLabel: "Database", name: `${svc}-db`, detail: "RDS Postgres 14 · imported", found: "aws:rds/Instance · db.t4g.medium" }),
        T({ id: "imp-redis", label: "Redis", sub: "", add: "database", type: "cache", logo: "pulumi", typeLabel: "Cache", name: `${svc}-cache`, detail: "ElastiCache · imported", found: "aws:elasticache/Cluster · 1 node" }),
        T({ id: "imp-bucket", label: "S3", sub: "", add: "database", type: "bucket", logo: "pulumi", typeLabel: "Bucket", name: `makro-${svc}-exports`, detail: "S3 · imported", found: "aws:s3/Bucket · versioned" }),
        T({ id: "imp-secret", label: "Secrets", sub: "", add: "secret", type: "secrets", logo: "vault", typeLabel: "Secrets", name: `Secrets · ${svc}`, detail: "6 keys · imported from SSM", found: "aws:ssm/Parameter × 6" }),
      ],
    },
    {
      id: "pricing-events",
      name: "pricing/events",
      env: "prod",
      updated: "12d · Sam",
      items: [
        T({ id: "imp-topic", label: "Kafka topic", sub: "", add: "kafka", type: "kafka", logo: "kafka", typeLabel: "Kafka topic", name: "pricing.updates", detail: "6 partitions · producer", found: "kafka:index/Topic · 6 partitions" }),
      ],
    },
  ]
}

export function ImportStackDialog({ svc, onClose, onImported }: { svc: string; onClose: () => void; onImported: (n: number) => void }) {
  const stacks = React.useMemo(() => importStacks(svc), [svc])
  const [stackId, setStackId] = React.useState(stacks[0].id)
  const stack = stacks.find((s) => s.id === stackId) ?? stacks[0]
  const [picked, setPicked] = React.useState<string[]>(stacks[0].items.map((i) => i.id))
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose, busy])
  const choose = (id: string) => {
    setStackId(id)
    setPicked((stacks.find((s) => s.id === id) ?? stacks[0]).items.map((i) => i.id))
  }
  const run = () => {
    setBusy(true)
    window.setTimeout(() => {
      const items = stack.items.filter((i) => picked.includes(i.id))
      items.forEach((t, i) => createDraft(svc, { ...t, lines: [`import: ${stack.name}`, `urn: ${t.found}`] }, { x: 560, y: 150 + i * 170 }))
      onImported(items.length)
    }, 900)
  }
  return (
    <motion.div
      data-ui
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[2px] light:bg-black/15"
      onPointerDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="w-[560px] overflow-hidden rounded-[14px] border border-line-3 bg-surface shadow-2xl"
      >
        <div className="flex flex-col gap-1 border-b border-line-2 px-5 py-4">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <IntegrationLogo name="pulumi" className="size-4" /> Import a Pulumi stack
          </span>
          <span className="text-xs text-muted-foreground">Existing cloud resources become resources of {svc}. Nothing is changed in the cloud; the import is reviewed like any change.</span>
        </div>
        <div className="flex flex-col gap-1.5 px-5 pt-4">
          <span className="text-xs text-muted-foreground">Stack</span>
          {stacks.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => choose(s.id)}
              className={cn("flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left", s.id === stackId ? "border-foreground/50 bg-surface-2" : "border-line-3 hover:border-foreground/30")}
            >
              <span className={cn("grid size-4 place-items-center rounded-full border", s.id === stackId ? "border-primary" : "border-line-3")}>{s.id === stackId && <span className="size-2 rounded-full bg-primary" />}</span>
              <span className="flex-1 font-mono text-[12.5px] text-foreground">{s.name}</span>
              <span className="text-[11.5px] text-subtle">
                {s.env} · {s.items.length} resource{s.items.length === 1 ? "" : "s"} · {s.updated}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 px-5 pt-4 pb-4">
          <span className="text-xs text-muted-foreground">Resources found · pick what belongs to {svc}</span>
          {stack.items.map((i) => {
            const on = picked.includes(i.id)
            return (
              <label key={i.id} className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-1.5 hover:bg-surface-2">
                <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== i.id) : [...p, i.id]))} className="accent-[var(--color-primary)]" />
                <IntegrationLogo name={i.logo} className="size-4" />
                <span className="flex-1 font-mono text-[12.5px] text-foreground">{i.name}</span>
                <span className="text-[11.5px] text-subtle">{i.found}</span>
              </label>
            )
          })}
        </div>
        <div className="flex items-center justify-between border-t border-line-2 px-5 py-3.5">
          <span className="text-[12px] text-subtle">{picked.length} selected · lands as drafts</span>
          <span className="flex gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="h-8.5 rounded-[8px] px-3 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40">
              Cancel
            </button>
            <button
              type="button"
              disabled={!picked.length || busy}
              onClick={run}
              className="btn-primary-gloss flex h-8.5 items-center gap-2 rounded-[8px] px-3.5 text-[13px] font-medium disabled:opacity-40"
            >
              {busy ? "Reading stack state…" : `Import ${picked.length}`}
            </button>
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
