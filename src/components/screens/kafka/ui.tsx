"use client"

/* Shared primitives for the platform Kafka & Postgres modules. */
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, Database, Radio, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import type { Health } from "@/lib/data"
import { IntegrationLogo, StatusDot, ease } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"

/* ---------- URL state helpers ---------- */
export function useQueryState(key: string) {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const value = sp.get(key)
  const set = React.useCallback(
    (v: string | null) => {
      const next = new URLSearchParams(sp.toString())
      if (v == null) next.delete(key)
      else next.set(key, v)
      const qs = next.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    },
    [sp, router, pathname, key],
  )
  return [value, set] as const
}

/* ---------- Page frame (canvas body vs classic page) ---------- */
export function ModuleFrame({
  module,
  crumbs,
  children,
}: {
  module: "kafka" | "postgres"
  crumbs?: React.ReactNode
  children: React.ReactNode
}) {
  const mode = useMode()
  if (mode === "canvas") return <div className="flex flex-1 flex-col gap-4 px-10 py-7">{children}</div>
  return (
    <ClassicPage crumbs={crumbs ?? <ModuleCrumbs module={module} />} className="gap-4 px-10 py-7">
      {children}
    </ClassicPage>
  )
}

export function ModuleCrumbs({ module, tail }: { module: "kafka" | "postgres"; tail?: React.ReactNode }) {
  const href = useHref()
  const Icon = module === "kafka" ? Radio : Database
  return (
    <div className="flex items-center gap-3">
      <Link
        href={href(`/${module}`)}
        className={cn(
          "flex items-center gap-2 text-sm transition-colors",
          tail ? "text-muted-foreground hover:text-foreground" : "font-semibold text-foreground",
        )}
      >
        <Icon className="size-[15px]" />
        {module === "kafka" ? "Kafka" : "Postgres"}
      </Link>
      {tail && (
        <>
          <ChevronRight className="size-3.5 text-faint" />
          {tail}
        </>
      )}
    </div>
  )
}

export function ClusterCrumb() {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <StatusDot health="ok" />
      makro-prod-core
      <ChevronsUpDown className="size-3.5 text-subtle" />
    </span>
  )
}

/* ---------- Header ---------- */
export function PageHead({
  logo,
  title,
  sub,
  right,
}: {
  logo: "kafka" | "postgres"
  title: React.ReactNode
  sub: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <IntegrationLogo name={logo} mono={logo === "kafka"} className="size-5.5" />
        <div className="flex flex-col gap-0.75">
          <h1 className="text-lg/6 font-semibold text-foreground">{title}</h1>
          <p className="text-[13px]/4 text-subtle">{sub}</p>
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </motion.div>
  )
}

/** Segmented nav (Topics / Users / Requests) with shared-layout pill. */
export function Segmented({
  id,
  items,
  active,
}: {
  id: string
  items: { key: string; label: React.ReactNode; href?: string; onClick?: () => void }[]
  active: string
}) {
  return (
    <div className="flex gap-0.5 rounded-[8px] border border-line bg-surface p-0.75">
      {items.map((it) => {
        const on = it.key === active
        const inner = (
          <>
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[6px] bg-surface-2 light:bg-surface-3"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{it.label}</span>
          </>
        )
        const cls = cn(
          "relative rounded-[6px] px-2.5 py-1.25 text-xs/4 transition-colors",
          on ? "text-foreground" : "text-subtle hover:text-foreground",
        )
        return it.href ? (
          <Link key={it.key} href={it.href} className={cls} scroll={false}>
            {inner}
          </Link>
        ) : (
          <button key={it.key} type="button" onClick={it.onClick} className={cls}>
            {inner}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Search ---------- */
export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])
  return (
    <label
      className={cn(
        "flex h-8.5 w-80 shrink-0 items-center gap-2 rounded-[8px] border border-line-3 bg-surface px-3 transition-colors focus-within:border-primary/60",
        className,
      )}
    >
      <Search className="size-3.5 text-subtle" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px]/4 text-foreground outline-none placeholder:text-subtle"
      />
      <AnimatePresence>
        {value ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={() => onChange("")}
            className="text-subtle hover:text-foreground"
          >
            <X className="size-3.5" />
          </motion.button>
        ) : (
          <span className="font-mono text-[11px] text-faint">/</span>
        )}
      </AnimatePresence>
    </label>
  )
}

/* ---------- Filter chips ---------- */
export function ActiveChip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      type="button"
      onClick={onClear}
      className="flex h-7.5 items-center gap-1.5 rounded-[7px] border border-line-3 bg-surface-2 px-2.5 text-xs/4 text-foreground hover:border-subtle"
    >
      {children}
      <X className="size-3 text-muted-foreground" />
    </motion.button>
  )
}

/** Dashed "+ Owner" chip that opens a small menu with counts. */
export function AddFilterChip({
  label,
  options,
  onPick,
}: {
  label: string
  options: { value: string; label: React.ReactNode; count: number }[]
  onPick: (v: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener("mousedown", h)
    return () => window.removeEventListener("mousedown", h)
  }, [open])
  return (
    <motion.div layout ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7.5 items-center rounded-[7px] border border-dashed border-line-3 px-2.5 text-xs/4 text-subtle transition-colors hover:border-subtle hover:text-foreground",
          open && "border-subtle text-foreground",
        )}
      >
        + {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease }}
            className="absolute top-9 left-0 z-40 min-w-48 rounded-[10px] border border-line-3 bg-surface p-1 shadow-xl"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onPick(o.value)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-4 rounded-[7px] px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <span className="flex items-center gap-2">{o.label}</span>
                <span className="font-mono text-[11px] text-subtle">{o.count}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ---------- Table ---------- */
export type SortDir = "asc" | "desc"
export function SortHead({
  label,
  k,
  sort,
  onSort,
  className,
}: {
  label: string
  k?: string
  sort?: { key: string; dir: SortDir }
  onSort?: (k: string) => void
  className?: string
}) {
  const on = k && sort?.key === k
  const content = (
    <>
      {label}
      {k && (
        <span className={cn("inline-flex transition-opacity", on ? "opacity-100" : "opacity-0 group-hover:opacity-60")}>
          {on && sort?.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
        </span>
      )}
    </>
  )
  return (
    <div className={cn("shrink-0 text-[11px]/3.5 tracking-[0.06em] text-subtle uppercase", className)}>
      {k ? (
        <button
          type="button"
          onClick={() => onSort?.(k)}
          className={cn("group inline-flex items-center gap-1 uppercase hover:text-foreground", on && "text-foreground")}
        >
          {content}
        </button>
      ) : (
        content
      )}
    </div>
  )
}

export function TableCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: 0.05 }}
      className={cn("flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface", className)}
    >
      {children}
    </motion.div>
  )
}

export const rowMotion = (i: number) => ({
  layout: true as const,
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: { duration: 0.32, ease, delay: Math.min(i, 10) * 0.035, layout: { type: "spring" as const, stiffness: 420, damping: 36 } },
})

export function useSort<T>(rows: T[], init: { key: string; dir: SortDir }, get: (r: T, key: string) => string | number) {
  const [sort, setSort] = React.useState(init)
  const onSort = (k: string) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }))
  const sorted = React.useMemo(() => {
    const out = [...rows]
    out.sort((a, b) => {
      const x = get(a, sort.key)
      const y = get(b, sort.key)
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))
      return sort.dir === "asc" ? c : -c
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort])
  return { sorted, sort, onSort, setSort }
}

export function EmptyRow({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-2 px-4 py-12 text-center"
    >
      <Search className="size-5 text-faint" />
      <p className="text-[13px] text-foreground">No matches for “{query}”</p>
      <p className="text-xs text-subtle">Try a different name, owner or clear the filters.</p>
      <button type="button" onClick={onClear} className="mt-1 text-xs text-primary hover:underline">
        Clear search & filters
      </button>
    </motion.div>
  )
}

/** Coloured health text with a leading dot — "● healthy". */
export function HealthText({ tone, children, className }: { tone: Health; children: React.ReactNode; className?: string }) {
  const color = { ok: "text-success", warn: "text-warning", fail: "text-destructive", busy: "text-info", idle: "text-subtle" }[tone]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs/4", color, className)}>
      {tone === "idle" ? (
        <span className="size-[7px] rounded-full border border-current" />
      ) : (
        <StatusDot health={tone} pulse={tone === "fail"} />
      )}
      {children}
    </span>
  )
}

/* ---------- Live sparkline ---------- */
function seeded(n: number, base: number, trend?: "up" | "flat") {
  return Array.from({ length: 16 }, (_, i) => {
    const wobble = Math.sin(i * 1.7 + n) * 0.12 + Math.cos(i * 0.9 + n * 2) * 0.08
    const t = trend === "up" ? (i / 15) * 0.6 : 0
    return Math.max(0, base * (0.8 + wobble + t))
  })
}
export function LiveSpark({
  base,
  seed,
  trend,
  tone = "neutral",
  width = 120,
  height = 20,
}: {
  base: number
  seed: number
  trend?: "up" | "flat"
  tone?: "neutral" | "warn"
  width?: number
  height?: number
}) {
  const [data, setData] = React.useState(() => seeded(seed, base, trend))
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setData((d) => {
        const last = d[d.length - 1]
        const drift = trend === "up" ? 1.01 : 1
        const next = Math.max(0, last * drift * (0.94 + Math.random() * 0.12))
        return [...d.slice(1), next]
      })
    }, 1600 + (seed % 5) * 170)
    return () => window.clearInterval(id)
  }, [seed, trend])
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / (max - min || 1)) * (height - 6)).toFixed(1)}`)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <motion.polyline
        points={pts.join(" ")}
        fill="none"
        stroke={tone === "warn" ? "var(--warning)" : "var(--muted-foreground)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, points: pts.join(" ") }}
        transition={{ pathLength: { duration: 0.9, ease }, points: { duration: 0.6, ease } }}
      />
    </svg>
  )
}

/* ---------- Dialogs ---------- */
export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  React.useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] light:bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn("w-[440px] rounded-[14px] border border-line-3 bg-surface p-5 shadow-2xl", className)}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Anchored confirm card (16b "Rotate svc-analytics-etl?"). */
export function ConfirmCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 460, damping: 34 }}
      className={cn("w-105 rounded-[12px] border border-line-3 bg-surface p-4.5 shadow-2xl", className)}
    >
      {children}
    </motion.div>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-subtle">{hint}</span>}
    </label>
  )
}
export const inputCls =
  "h-9 rounded-[8px] border border-line-3 bg-page px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/60"
