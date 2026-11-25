"use client"

/* Shared node-graph canvas for the platform modules (Postgres, Infrastructure, Projects, Secrets).
   Same feel as the service canvas: pan/zoom outside React (zoom at cursor), fit on open and resize,
   drag nodes (layout saved per graph), hover highlights a node's neighbours, search, minimap, live edges. */

import * as React from "react"
import { motion } from "motion/react"
import { Keyboard, Maximize, Minus, Plus, RotateCcw, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Health } from "@/lib/data"
import { Btn, StatusDot, ease, useHotkey } from "@/components/idp/kit"

export type GraphNode = {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** Text matched by the search box. */
  search: string
  tone?: Health
  content: React.ReactNode
  onOpen?: () => void
}
export type GraphEdge = { from: string; to: string; tone?: Health; flow?: boolean; dashed?: boolean }
type Pt = { x: number; y: number }
type View = { x: number; y: number; k: number; w: number; h: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Lay out columns left to right, each column centred on the tallest one. */
export function layered(columns: { id: string; w: number; h: number }[][], opts: { x0?: number; colGap?: number; rowGap?: number } = {}) {
  const { x0 = 80, colGap = 150, rowGap = 26 } = opts
  const heights = columns.map((c) => c.reduce((a, n) => a + n.h, 0) + Math.max(0, c.length - 1) * rowGap)
  const tallest = Math.max(...heights, 0)
  const out: Record<string, Pt> = {}
  let x = x0
  columns.forEach((col, ci) => {
    let y = 80 + (tallest - heights[ci]) / 2
    const colW = Math.max(...col.map((n) => n.w), 0)
    col.forEach((n) => {
      out[n.id] = { x: x + (colW - n.w) / 2, y }
      y += n.h + rowGap
    })
    x += colW + colGap
  })
  return out
}

/* ---------- saved layouts, per graph ---------- */
const cache = new Map<string, Record<string, Pt> | null>()
const subs = new Set<() => void>()
const key = (id: string) => `idp.graph.layout.v1.${id}`
function readSaved(id: string) {
  if (!cache.has(id)) {
    let v: Record<string, Pt> | null = null
    try {
      const raw = localStorage.getItem(key(id))
      v = raw ? JSON.parse(raw) : null
    } catch {}
    cache.set(id, v)
  }
  return cache.get(id) ?? null
}
function writeSaved(id: string, v: Record<string, Pt> | null) {
  cache.set(id, v)
  try {
    if (v) localStorage.setItem(key(id), JSON.stringify(v))
    else localStorage.removeItem(key(id))
  } catch {}
  subs.forEach((f) => f())
}
const subscribeSaved = (cb: () => void) => {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}

function createView() {
  let v: View = { x: 0, y: 0, k: 1, w: 0, h: 0 }
  const ls = new Set<() => void>()
  return {
    get: () => v,
    set(n: Partial<View>) {
      v = { ...v, ...n }
      ls.forEach((f) => f())
    },
    subscribe(cb: () => void) {
      ls.add(cb)
      return () => {
        ls.delete(cb)
      }
    },
  }
}
type ViewStore = ReturnType<typeof createView>

function bounds(nodes: GraphNode[], pos: Record<string, Pt>) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  nodes.forEach((n) => {
    const p = pos[n.id]
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + n.w)
    maxY = Math.max(maxY, p.y + n.h)
  })
  return { minX, minY, w: maxX - minX, h: maxY - minY }
}

const toneColor: Record<Health, string> = {
  ok: "var(--subtle)",
  warn: "var(--warning)",
  fail: "var(--destructive)",
  busy: "var(--info)",
  idle: "var(--line-3)",
}

export function GraphCanvas({
  id,
  nodes,
  edges,
  header,
  legend,
  placeholder = "Find a node",
}: {
  /** Storage key for the saved layout. */
  id: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  header?: React.ReactNode
  legend?: React.ReactNode
  placeholder?: string
}) {
  const saved = React.useSyncExternalStore(subscribeSaved, () => readSaved(id), () => null)
  const [drag, setDrag] = React.useState<{ id: string; p: Pt } | null>(null)
  const pos = React.useMemo(() => {
    const p: Record<string, Pt> = {}
    nodes.forEach((n) => (p[n.id] = saved?.[n.id] ?? { x: n.x, y: n.y }))
    if (drag) p[drag.id] = drag.p
    return p
  }, [nodes, saved, drag])

  const [view] = React.useState(createView)
  const box = React.useRef<HTMLDivElement>(null)
  const world = React.useRef<HTMLDivElement>(null)
  const posRef = React.useRef(pos)
  const touched = React.useRef(false)
  const suppress = React.useRef(false)
  const [hover, setHover] = React.useState<string | null>(null)
  const [q, setQ] = React.useState("")
  const [help, setHelp] = React.useState(false)
  const search = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    posRef.current = pos
  })

  const paint = React.useCallback(
    (animate = false) => {
      const el = box.current
      const w = world.current
      if (!el || !w) return
      const { x, y, k } = view.get()
      const t = animate ? "420ms cubic-bezier(0.22,1,0.36,1)" : "0s"
      w.style.transition = `transform ${t}`
      w.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`
      el.style.transition = `background-position ${t}, background-size ${t}`
      el.style.backgroundSize = `${20 * k}px ${20 * k}px`
      el.style.backgroundPosition = `${x}px ${y}px`
    },
    [view],
  )
  const move = React.useCallback(
    (n: Partial<View>, animate = false) => {
      view.set(n)
      paint(animate)
    },
    [view, paint],
  )
  const zoomAt = React.useCallback(
    (px: number, py: number, f: number, animate = false) => {
      const { x, y, k } = view.get()
      const k2 = clamp(k * f, 0.3, 2)
      move({ k: k2, x: px - (px - x) * (k2 / k), y: py - (py - y) * (k2 / k) }, animate)
    },
    [view, move],
  )
  const fitTo = React.useCallback(
    (ids: string[] | null, animate: boolean, maxK = 1.05) => {
      const { w, h } = view.get()
      const list = ids ? nodes.filter((n) => ids.includes(n.id)) : nodes
      if (!w || !list.length) return
      const b = bounds(list, posRef.current)
      const pad = 90
      const k = clamp(Math.min((w - pad * 2) / b.w, (h - pad * 2 - 40) / b.h), 0.3, maxK)
      move({ k, x: (w - b.w * k) / 2 - b.minX * k, y: (h - b.h * k) / 2 - b.minY * k + 20 }, animate)
    },
    [nodes, view, move],
  )

  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      view.set({ w: el.clientWidth, h: el.clientHeight })
      if (!touched.current) fitTo(null, false)
      else paint()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("[data-ui]")) return
      e.preventDefault()
      touched.current = true
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012))
      else {
        const { x, y } = view.get()
        move({ x: x - e.deltaX, y: y - e.deltaY })
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      ro.disconnect()
      el.removeEventListener("wheel", onWheel)
    }
  }, [view, fitTo, paint, zoomAt, move])

  /* pan */
  const pan = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  /* node drag */
  const nd = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)

  const ql = q.trim().toLowerCase()
  const matches = ql ? new Set(nodes.filter((n) => n.search.toLowerCase().includes(ql)).map((n) => n.id)) : null
  const neighbours = React.useMemo(() => {
    if (!hover) return null
    const s = new Set([hover])
    edges.forEach((e) => {
      if (e.from === hover) s.add(e.to)
      if (e.to === hover) s.add(e.from)
    })
    return s
  }, [hover, edges])
  const dimmed = (nid: string) => (neighbours ? !neighbours.has(nid) : false) || (matches ? !matches.has(nid) : false)

  useHotkey("f", () => ((touched.current = false), fitTo(null, true)))
  useHotkey("/", (e) => (e.preventDefault(), search.current?.focus()))
  useHotkey("?", () => setHelp((h) => !h))
  const zoomCenter = (f: number) => {
    const { w, h } = view.get()
    touched.current = true
    zoomAt(w / 2, h / 2, f, true)
  }
  useHotkey("=", () => zoomCenter(1.2))
  useHotkey("-", () => zoomCenter(1 / 1.2))

  const nodeById = React.useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes])

  return (
    <div
      ref={box}
      className="dot-grid relative h-[calc(100vh-56px)] min-h-[620px] w-full cursor-grab overflow-hidden select-none data-[panning]:cursor-grabbing"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-node],[data-ui]") || e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const { x, y } = view.get()
        pan.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }
        box.current?.setAttribute("data-panning", "")
        touched.current = true
      }}
      onPointerMove={(e) => {
        const p = pan.current
        if (p) move({ x: p.ox + e.clientX - p.sx, y: p.oy + e.clientY - p.sy })
      }}
      onPointerUp={() => {
        pan.current = null
        box.current?.removeAttribute("data-panning")
      }}
    >
      <div ref={world} className="absolute top-0 left-0 origin-top-left will-change-transform">
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1}>
          {edges.map((e, i) => {
            const a = nodeById[e.from]
            const b = nodeById[e.to]
            if (!a || !b) return null
            const pa = pos[a.id]
            const pb = pos[b.id]
            const right = pb.x + b.w / 2 >= pa.x + a.w / 2
            const x1 = right ? pa.x + a.w : pa.x
            const y1 = pa.y + a.h / 2
            const x2 = right ? pb.x : pb.x + b.w
            const y2 = pb.y + b.h / 2
            const mx = (x1 + x2) / 2
            const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
            const hot = !!hover && (e.from === hover || e.to === hover)
            const dim = (!!hover && !hot) || (!!matches && !(matches.has(e.from) && matches.has(e.to)))
            const color = hot && (!e.tone || e.tone === "ok") ? "var(--foreground)" : toneColor[e.tone ?? "ok"]
            return (
              <g key={`${e.from}-${e.to}-${i}`} style={{ opacity: dim ? 0.15 : 1, transition: "opacity 200ms" }}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={hot ? 1 : 0.6}
                  strokeWidth={hot ? 1.6 : 1.1}
                  strokeDasharray={e.dashed ? "4 4" : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease, delay: 0.1 + Math.min(i, 20) * 0.02 }}
                />
                {e.flow && (
                  <circle r={hot ? 2.5 : 1.8} fill={color}>
                    <animateMotion dur={`${2.2 + (i % 4) * 0.5}s`} begin={`${-(i % 5) * 0.4}s`} repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
        {nodes.map((n, i) => {
          const p = pos[n.id]
          const isDrag = drag?.id === n.id
          return (
            <motion.div
              key={n.id}
              data-node
              role={n.onOpen ? "button" : undefined}
              tabIndex={n.onOpen ? 0 : undefined}
              onKeyDown={(e) => e.key === "Enter" && n.onOpen?.()}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.stopPropagation()
                e.currentTarget.setPointerCapture(e.pointerId)
                nd.current = { id: n.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false }
              }}
              onPointerMove={(e) => {
                const d = nd.current
                if (!d) return
                const k = view.get().k
                const dx = (e.clientX - d.sx) / k
                const dy = (e.clientY - d.sy) / k
                if (!d.moved && Math.hypot(dx, dy) < 4) return
                d.moved = true
                setDrag({ id: d.id, p: { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) } })
              }}
              onPointerUp={() => {
                const d = nd.current
                nd.current = null
                if (!d?.moved) return
                suppress.current = true
                writeSaved(id, { ...posRef.current })
                setDrag(null)
              }}
              onClick={() => {
                if (suppress.current) return void (suppress.current = false)
                n.onOpen?.()
              }}
              onDoubleClick={() => {
                touched.current = true
                fitTo([n.id], true, 1.4)
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: dimmed(n.id) ? 0.28 : 1, y: 0, scale: isDrag ? 1.03 : 1 }}
              transition={{ duration: 0.3, ease, delay: isDrag ? 0 : Math.min(i, 24) * 0.02 }}
              className={cn(
                "absolute outline-none focus-visible:ring-2 focus-visible:ring-primary",
                n.onOpen ? "cursor-pointer" : "cursor-grab",
                isDrag && "z-10 cursor-grabbing",
              )}
              style={{ left: p.x, top: p.y, width: n.w, height: n.h }}
            >
              {n.content}
            </motion.div>
          )
        })}
      </div>

      {/* header + search */}
      <div data-ui className="absolute top-6 right-6 left-6 z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">{header}</div>
        <div className="flex items-center gap-2">
          <label className="flex h-8.5 w-56 items-center gap-2 rounded-[10px] border border-line-2 bg-surface/90 px-2.5 backdrop-blur focus-within:border-primary/50">
            <Search className="size-3.5 text-subtle" />
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQ("")
                  e.currentTarget.blur()
                }
                if (e.key === "Enter" && matches?.size) {
                  touched.current = true
                  fitTo([...matches], true, 1.2)
                }
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-subtle"
            />
            {q ? (
              <button aria-label="Clear search" onClick={() => setQ("")} className="text-subtle hover:text-foreground">
                <X className="size-3" />
              </button>
            ) : (
              <kbd className="font-mono text-[10px] text-subtle">/</kbd>
            )}
          </label>
          {saved && (
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                writeSaved(id, null)
                touched.current = false
                requestAnimationFrame(() => fitTo(null, true))
              }}
            >
              <RotateCcw /> Reset layout
            </Btn>
          )}
        </div>
      </div>

      {legend && (
        <div data-ui className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-[10px] border border-line-2 bg-surface/90 px-3 py-2 backdrop-blur">
          {legend}
        </div>
      )}

      <div data-ui className="absolute bottom-6 left-6 z-10 flex h-10 items-center gap-0.5 rounded-[10px] border border-line-2 bg-surface/90 px-1 backdrop-blur">
        <Hud label="Zoom out (-)" onClick={() => zoomCenter(1 / 1.2)}>
          <Minus className="size-3.5" />
        </Hud>
        <ZoomLabel view={view} />
        <Hud label="Zoom in (=)" onClick={() => zoomCenter(1.2)}>
          <Plus className="size-3.5" />
        </Hud>
        <span className="mx-0.5 h-4 w-px bg-line-2" />
        <Hud
          label="Fit to screen (F)"
          onClick={() => {
            touched.current = false
            fitTo(null, true)
          }}
        >
          <Maximize className="size-3.5" />
        </Hud>
        <Hud label="Shortcuts (?)" onClick={() => setHelp((h) => !h)}>
          <Keyboard className="size-3.5" />
        </Hud>
      </div>
      {help && (
        <div data-ui className="absolute bottom-19 left-6 z-20 w-60 rounded-[12px] border border-line-3 bg-surface/95 p-3 shadow-2xl backdrop-blur">
          {[
            ["/", "Find a node"],
            ["F", "Fit to screen"],
            ["= / -", "Zoom in / out"],
            ["⌘ + scroll", "Zoom at cursor"],
            ["Drag", "Pan, or move a node"],
            ["Double-click", "Zoom to node"],
            ["Hover", "Highlight connections"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1 text-[11.5px]">
              <span className="text-muted-foreground">{v}</span>
              <kbd className="rounded-[5px] border border-line-3 bg-surface-2 px-1.5 font-mono text-[10.5px] text-foreground">{k}</kbd>
            </div>
          ))}
        </div>
      )}

      <div data-ui className="absolute right-6 bottom-6 z-10">
        <Minimap
          view={view}
          nodes={nodes}
          pos={pos}
          onJump={(wx, wy, animate) => {
            const { w, h, k } = view.get()
            touched.current = true
            move({ x: w / 2 - wx * k, y: h / 2 - wy * k }, animate)
          }}
        />
      </div>
    </div>
  )
}

function Hud({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="grid size-8 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
      {children}
    </button>
  )
}

function ZoomLabel({ view }: { view: ViewStore }) {
  const k = React.useSyncExternalStore(view.subscribe, () => view.get().k, () => 1)
  return <span className="w-11 text-center font-mono text-[11px] text-muted-foreground tabular-nums">{Math.round(k * 100)}%</span>
}

function Minimap({ view, nodes, pos, onJump }: { view: ViewStore; nodes: GraphNode[]; pos: Record<string, Pt>; onJump: (x: number, y: number, a: boolean) => void }) {
  const v = React.useSyncExternalStore(view.subscribe, view.get, view.get)
  const W = 176
  const H = 112
  const b = bounds(nodes, pos)
  const pad = 60
  const s = Math.min(W / (b.w + pad * 2), H / (b.h + pad * 2))
  const ox = (W - b.w * s) / 2 - b.minX * s
  const oy = (H - b.h * s) / 2 - b.minY * s
  const dragging = React.useRef(false)
  const jump = (e: React.PointerEvent, a: boolean) => {
    const r = e.currentTarget.getBoundingClientRect()
    onJump((e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s, a)
  }
  return (
    <svg
      width={W}
      height={H}
      className="cursor-pointer rounded-[10px] border border-line-2 bg-surface/90 backdrop-blur"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        dragging.current = true
        jump(e, true)
      }}
      onPointerMove={(e) => dragging.current && jump(e, false)}
      onPointerUp={() => (dragging.current = false)}
    >
      {nodes.map((n) => (
        <rect key={n.id} x={pos[n.id].x * s + ox} y={pos[n.id].y * s + oy} width={n.w * s} height={n.h * s} rx={2} fill={toneColor[n.tone ?? "ok"]} opacity={0.8} />
      ))}
      {v.w > 0 && (
        <rect x={(-v.x / v.k) * s + ox} y={(-v.y / v.k) * s + oy} width={(v.w / v.k) * s} height={(v.h / v.k) * s} rx={4} fill="var(--foreground)" fillOpacity={0.04} stroke="var(--primary)" strokeOpacity={0.8} />
      )}
    </svg>
  )
}

/* ---------- a standard node card, so every module graph reads the same ---------- */
export function GraphCard({
  icon,
  title,
  sub,
  status,
  badge,
  mono,
  emphasis,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  sub?: React.ReactNode
  status?: { tone: Health; text: React.ReactNode }
  badge?: React.ReactNode
  mono?: boolean
  emphasis?: boolean
}) {
  const ring = status?.tone === "fail" ? "border-destructive/60" : status?.tone === "warn" ? "border-warning/50" : status?.tone === "idle" ? "border-dashed border-line-3" : "border-line-3"
  return (
    <div className={cn("flex h-full w-full flex-col justify-center gap-1 rounded-[12px] border bg-surface px-3 shadow-lg transition-shadow hover:shadow-xl", ring, emphasis && "bg-surface-2")}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground", mono && "font-mono text-[12.5px]")}>
          {icon}
          <span className="truncate">{title}</span>
        </span>
        {badge}
      </div>
      {sub && <div className="truncate text-[11.5px] text-subtle">{sub}</div>}
      {status && (
        <div className={cn("flex items-center gap-1.5 truncate text-[11.5px]", { ok: "text-success", warn: "text-warning", fail: "text-destructive", busy: "text-info", idle: "text-muted-foreground" }[status.tone])}>
          <StatusDot health={status.tone} pulse={status.tone === "fail"} className="size-1.5" />
          <span className="truncate">{status.text}</span>
        </div>
      )}
    </div>
  )
}

/** Column heading drawn on the canvas above a layer. */
export function LegendItem({ tone, label }: { tone: Health; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
      <StatusDot health={tone} className="size-1.5" /> {label}
    </span>
  )
}
