"use client"

/* Service canvas (02a). A small, fast node-graph engine:
   - pan / zoom run on a ref + direct DOM writes, so nodes never re-render while you move the view
   - zoom follows the cursor (⌘/ctrl + wheel or pinch), plain wheel/trackpad pans, the dot grid moves with the world
   - fits the graph on open and when the panel resizes (until you take over the view)
   - drag nodes to arrange them; the layout is remembered per service
   - live edges, hover focus, search + status filter, keyboard nav, minimap, right-click menu */

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { CircleCheck, Copy, Crosshair, History, Keyboard, Maximize, Minus, PanelRightOpen, Plus, RotateCcw, Search, Trash2, Undo2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import type { Health, Resource, Service } from "@/lib/data"
import { Btn, IntegrationLogo, Spark, StatusDot, ease, useHotkey } from "@/components/idp/kit"
import { StagedBar, ViewToggle, look, nodeTitle, useNav, type RState } from "./resources"
import { stagedStore, useStaged } from "./store"
import { CreatePalette, createDraft, discardDraft, useDrafts, type Template } from "./create"
import { useRouter } from "next/navigation"
import { PixelGrid, WorkingText } from "@/components/idp/working"

const SVC_W = 240
const SVC_H = 102
const RES_W = 220
const RES_H = 80
const GAP = 170
const SVC = "__svc"
const MIN_K = 0.4
const MAX_K = 2

type Pt = { x: number; y: number }
type Layout = Record<string, Pt>
type View = { x: number; y: number; k: number; w: number; h: number }
type Filter = "all" | "attention" | "drafts"

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const sizeOf = (id: string) => (id === SVC ? { w: SVC_W, h: SVC_H } : { w: RES_W, h: RES_H })

/* ---------- per-service layout, persisted in localStorage ---------- */
const layoutCache = new Map<string, Layout | null>()
const layoutListeners = new Set<() => void>()
const layoutKey = (s: string) => `idp.canvas.layout.v1.${s}`
function readLayout(s: string): Layout | null {
  if (!layoutCache.has(s)) {
    let v: Layout | null = null
    try {
      const raw = localStorage.getItem(layoutKey(s))
      v = raw ? (JSON.parse(raw) as Layout) : null
    } catch {}
    layoutCache.set(s, v)
  }
  return layoutCache.get(s) ?? null
}
function writeLayout(s: string, l: Layout | null) {
  layoutCache.set(s, l)
  try {
    if (l) localStorage.setItem(layoutKey(s), JSON.stringify(l))
    else localStorage.removeItem(layoutKey(s))
  } catch {}
  layoutListeners.forEach((f) => f())
}
function subscribeLayout(cb: () => void) {
  layoutListeners.add(cb)
  return () => {
    layoutListeners.delete(cb)
  }
}

/* ---------- view store: subscribed to by the HUD only, never by nodes ---------- */
function createViewStore() {
  let v: View = { x: 0, y: 0, k: 1, w: 0, h: 0 }
  const ls = new Set<() => void>()
  return {
    get: () => v,
    set: (n: Partial<View>) => {
      v = { ...v, ...n }
      ls.forEach((f) => f())
    },
    subscribe: (cb: () => void) => {
      ls.add(cb)
      return () => {
        ls.delete(cb)
      }
    },
  }
}
type ViewStore = ReturnType<typeof createViewStore>

function defaultLayout(nodes: Resource[]): Layout {
  const top0 = 150
  const span = (nodes.length - 1) * GAP + RES_H
  const l: Layout = { [SVC]: { x: 140, y: top0 + span / 2 - SVC_H / 2 } }
  nodes.forEach((r, i) => (l[r.id] = { x: 560, y: top0 + i * GAP }))
  return l
}

function bbox(l: Layout) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const [id, p] of Object.entries(l)) {
    const s = sizeOf(id)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + s.w)
    maxY = Math.max(maxY, p.y + s.h)
  }
  return { minX, minY, w: maxX - minX, h: maxY - minY }
}

/** Bezier from the service to a resource, leaving from whichever side faces it. */
function edgePath(s: Pt, r: Pt, i: number, n: number) {
  const right = r.x + RES_W / 2 >= s.x + SVC_W / 2
  const x1 = right ? s.x + SVC_W : s.x
  const y1 = s.y + SVC_H / 2 + (i - (n - 1) / 2) * 6
  const x2 = right ? r.x : r.x + RES_W
  const y2 = r.y + RES_H / 2
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}

function needsAttention(r: Resource, state: RState) {
  return state === "failed" || r.status === "health-fail" || r.status === "expiring" || r.status === "failed"
}

export function NodeCanvas({ svc, selected, state }: { svc: Service; selected?: Resource; state: RState }) {
  const href = useHref()
  const nav = useNav(svc.id)
  const router = useRouter()
  const base = React.useMemo(() => svc.resources.filter((r) => r.type !== "monitoring"), [svc])
  const drafts = useDrafts(svc.id)
  const nodes = React.useMemo<Resource[]>(() => [...base, ...drafts], [base, drafts])
  const defaults = React.useMemo(() => {
    const l = defaultLayout(base)
    drafts.forEach((d) => (l[d.id] = d.pos))
    return l
  }, [base, drafts])
  const saved = React.useSyncExternalStore(subscribeLayout, () => readLayout(svc.id), () => null)
  const [drag, setDrag] = React.useState<{ id: string; pos: Pt } | null>(null)
  const layout = React.useMemo<Layout>(() => ({ ...defaults, ...(saved ?? {}), ...(drag ? { [drag.id]: drag.pos } : {}) }), [defaults, saved, drag])

  const [view] = React.useState(createViewStore)
  const box = React.useRef<HTMLDivElement>(null)
  const world = React.useRef<HTMLDivElement>(null)
  const layoutRef = React.useRef(layout)
  const touched = React.useRef(false) // user took over the view: stop auto-fitting
  const suppressClick = React.useRef(false)

  const [hover, setHover] = React.useState<string | null>(null)
  const [q, setQ] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [menu, setMenu] = React.useState<{ id: string; x: number; y: number } | null>(null)
  const [help, setHelp] = React.useState(false)
  const [confirmRm, setConfirmRm] = React.useState<Resource | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [arriving, setArriving] = React.useState<string | null>(null)
  const staged = useStaged()
  const removing = new Set(staged.filter((c) => c.id.startsWith("rm-")).map((c) => c.id.slice(3)))
  const stageRemoval = (r: Resource) => {
    setConfirmRm(null)
    stagedStore.add({ id: `rm-${r.id}`, label: `remove ${nodeTitle(r)}` })
    if (selected?.id === r.id) nav.close()
    toast(`Removal of ${nodeTitle(r)} staged`, {
      description: "Nothing is deleted until the change set is reviewed and applied",
      action: { label: "Undo", onClick: () => stagedStore.remove(`rm-${r.id}`) },
    })
  }
  const searchRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    layoutRef.current = layout
  })

  /* ----- viewport engine ----- */
  const paint = React.useCallback(
    (animate = false) => {
      const el = box.current
      const w = world.current
      if (!el || !w) return
      const { x, y, k } = view.get()
      w.style.transition = animate ? "transform 420ms cubic-bezier(0.22,1,0.36,1)" : "none"
      w.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`
      el.style.backgroundSize = `${20 * k}px ${20 * k}px`
      el.style.backgroundPosition = `${x}px ${y}px`
      el.style.transition = animate ? "background-position 420ms cubic-bezier(0.22,1,0.36,1), background-size 420ms cubic-bezier(0.22,1,0.36,1)" : "none"
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
    (px: number, py: number, factor: number, animate = false) => {
      const { x, y, k } = view.get()
      const k2 = clamp(k * factor, MIN_K, MAX_K)
      move({ k: k2, x: px - (px - x) * (k2 / k), y: py - (py - y) * (k2 / k) }, animate)
    },
    [view, move],
  )
  const fitTo = React.useCallback(
    (l: Layout, animate: boolean, maxK = 1.1) => {
      const { w, h } = view.get()
      if (!w || !h) return
      const b = bbox(l)
      const pad = 96
      const k = clamp(Math.min((w - pad * 2) / b.w, (h - pad * 2) / b.h), MIN_K, maxK)
      move({ k, x: (w - b.w * k) / 2 - b.minX * k, y: (h - b.h * k) / 2 - b.minY * k }, animate)
    },
    [view, move],
  )
  const fit = React.useCallback((animate = true) => fitTo(layoutRef.current, animate), [fitTo])
  const focusNode = React.useCallback(
    (id: string) => {
      const p = layoutRef.current[id]
      if (!p) return
      touched.current = true
      fitTo({ [id]: p }, true, 1.35)
    },
    [fitTo],
  )

  // Measure, fit once, refit on resize until the user takes over; wheel needs a non-passive listener.
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      view.set({ w: el.clientWidth, h: el.clientHeight })
      if (!touched.current) fitTo(layoutRef.current, false)
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

  // Keep the selected node on screen when it is opened from the keyboard or the list.
  React.useEffect(() => {
    if (!selected) return
    const p = layoutRef.current[selected.id]
    const { x, y, k, w, h } = view.get()
    if (!p || !w) return
    const sx = p.x * k + x
    const sy = p.y * k + y
    const m = 40
    if (sx < m || sy < m || sx + RES_W * k > w - m || sy + RES_H * k > h - m) {
      move({ x: w / 2 - (p.x + RES_W / 2) * k, y: h / 2 - (p.y + RES_H / 2) * k }, true)
    }
  }, [selected, view, move])

  /* ----- create on canvas: drop a draft, swoop the camera to it, then settle back ----- */
  const pick = (t: Template) => {
    const l = layoutRef.current
    const ys = nodes.map((n) => l[n.id]?.y ?? 0)
    const lastX = nodes.length ? (l[nodes[nodes.length - 1].id]?.x ?? 560) : 560
    const d = createDraft(svc.id, t, { x: lastX, y: (ys.length ? Math.max(...ys) : 150) + GAP })
    setCreating(false)
    setArriving(d.id)
    toast.success(`${t.typeLabel} added as a draft`, {
      description: "Review the change set to create it · ⌘↵",
      action: { label: "Review", onClick: () => router.push(href(`/services/${svc.id}/add/review`)) },
    })
  }
  React.useEffect(() => {
    if (!arriving) return
    const raf = requestAnimationFrame(() => focusNode(arriving))
    const t = window.setTimeout(() => {
      touched.current = false
      fit()
      setArriving(null)
    }, 1700)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [arriving, focusNode, fit])
  useHotkey(
    "c",
    (e) => {
      e.preventDefault() // don't let the key land in the palette's input
      setCreating(true)
    },
    { enabled: !creating },
  )
  useHotkey("enter", () => {
    if (staged.length) router.push(href(`/services/${svc.id}/add/review`))
  }, { meta: true })

  /* ----- background pan ----- */
  const pan = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const onBgDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node],[data-ui]")) return
    setMenu(null)
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = view.get()
    pan.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }
    box.current?.setAttribute("data-panning", "")
    touched.current = true
  }
  const onBgMove = (e: React.PointerEvent) => {
    const p = pan.current
    if (p) move({ x: p.ox + e.clientX - p.sx, y: p.oy + e.clientY - p.sy })
  }
  const onBgUp = () => {
    pan.current = null
    box.current?.removeAttribute("data-panning")
  }

  /* ----- node drag ----- */
  const nd = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
  const onNodeDown = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = layoutRef.current[id]
    nd.current = { id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false }
  }
  const onNodeMove = (e: React.PointerEvent) => {
    const d = nd.current
    if (!d) return
    const k = view.get().k
    const dx = (e.clientX - d.sx) / k
    const dy = (e.clientY - d.sy) / k
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    setDrag({ id: d.id, pos: { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) } })
  }
  const onNodeUp = () => {
    const d = nd.current
    nd.current = null
    if (!d?.moved) return
    suppressClick.current = true
    const current = layoutRef.current
    writeLayout(svc.id, { ...current })
    setDrag(null)
  }
  const resetLayout = () => {
    writeLayout(svc.id, null)
    touched.current = false
    requestAnimationFrame(() => fitTo(defaults, true))
    toast("Layout reset")
  }

  /* ----- filter + keyboard ----- */
  const ql = q.trim().toLowerCase()
  const match = (r: Resource) =>
    (!ql || `${r.name} ${r.typeLabel} ${r.detail}`.toLowerCase().includes(ql)) &&
    (filter === "all" || (filter === "attention" ? needsAttention(r, selected?.id === r.id ? state : undefined) : r.status === "draft"))
  const filtering = !!ql || filter !== "all"
  const counts = {
    attention: nodes.filter((r) => needsAttention(r, selected?.id === r.id ? state : undefined)).length,
    drafts: nodes.filter((r) => r.status === "draft").length,
  }
  const order = [...nodes].filter(match).sort((a, b) => layout[a.id].y - layout[b.id].y || layout[a.id].x - layout[b.id].x)
  const step = (d: 1 | -1) => {
    if (!order.length) return
    const i = selected ? order.findIndex((r) => r.id === selected.id) : -1
    const next = order[(i + d + order.length) % order.length]
    nav.open(next.id)
  }
  useHotkey("arrowdown", (e) => (e.preventDefault(), step(1)))
  useHotkey("arrowup", (e) => (e.preventDefault(), step(-1)))
  useHotkey("j", () => step(1))
  useHotkey("k", () => step(-1))
  useHotkey("f", () => ((touched.current = false), fit()))
  useHotkey("=", () => {
    const { w, h } = view.get()
    touched.current = true
    zoomAt(w / 2, h / 2, 1.2, true)
  })
  useHotkey("-", () => {
    const { w, h } = view.get()
    touched.current = true
    zoomAt(w / 2, h / 2, 1 / 1.2, true)
  })
  useHotkey("0", () => {
    const { w, h, k } = view.get()
    touched.current = true
    zoomAt(w / 2, h / 2, 1 / k, true)
  })
  useHotkey("/", (e) => (e.preventDefault(), searchRef.current?.focus()))
  useHotkey("?", () => setHelp((h) => !h))

  const lit = (id: string) => !hover || hover === id || hover === SVC || id === SVC

  return (
    <div
      ref={box}
      className="dot-grid absolute inset-0 cursor-grab overflow-hidden select-none data-[panning]:cursor-grabbing"
      onPointerDown={onBgDown}
      onPointerMove={onBgMove}
      onPointerUp={onBgUp}
      onPointerCancel={onBgUp}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-node],[data-ui]")) return
        const r = box.current!.getBoundingClientRect()
        touched.current = true
        zoomAt(e.clientX - r.left, e.clientY - r.top, 1.4, true)
      }}
      onContextMenu={(e) => {
        if (!(e.target as HTMLElement).closest("[data-node]")) e.preventDefault()
      }}
    >
      <div ref={world} className="absolute top-0 left-0 origin-top-left will-change-transform">
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1}>
          {nodes.map((r, i) => {
            const d = edgePath(layout[SVC], layout[r.id], i, nodes.length)
            const sel = selected?.id === r.id
            const rs = sel ? state : undefined
            const applying = rs === "applying"
            const gone = removing.has(r.id)
            const failing = rs === "failed" || r.status === "health-fail" || gone
            const idle = r.status === "draft"
            const hot = sel || hover === r.id
            const dim = (hover && !lit(r.id)) || (filtering && !match(r))
            const color = applying ? "var(--info)" : failing ? "var(--destructive)" : r.status === "expiring" ? "var(--warning)" : hot ? "var(--foreground)" : "var(--subtle)"
            const speed = clamp(6 - (r.spark.reduce((a, b) => a + b, 0) / r.spark.length) / 3, 1.6, 5)
            return (
              <g key={r.id} style={{ opacity: dim ? 0.18 : 1, transition: "opacity 200ms" }}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={hot ? 1 : 0.55}
                  strokeWidth={hot ? 1.6 : 1}
                  strokeDasharray={idle || applying || failing ? "4 4" : undefined}
                  className={applying ? "animate-[svc-dash_0.8s_linear_infinite]" : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.7, ease, delay: 0.1 + i * 0.06 }}
                />
                {arriving === r.id && (
                  <motion.path
                    d={d}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={10}
                    strokeLinecap="round"
                    style={{ filter: "blur(5px)" }}
                    initial={{ pathLength: 0, opacity: 0.95 }}
                    animate={{ pathLength: 1, opacity: [0.95, 0.95, 0] }}
                    transition={{ duration: 1.5, ease, times: [0, 0.55, 1] }}
                  />
                )}
                {arriving === r.id && (
                  <motion.path d={d} fill="none" stroke="var(--primary)" strokeWidth={1.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease }} />
                )}
                {!idle && !failing && (
                  <>
                    {[0, 0.5].map((off) => (
                      <circle key={off} r={hot ? 2.6 : 2} fill={color} opacity={hot ? 1 : 0.8}>
                        <animateMotion dur={`${applying ? 1 : speed}s`} begin={`${-off * speed}s`} repeatCount="indefinite" path={d} />
                      </circle>
                    ))}
                  </>
                )}
              </g>
            )
          })}
        </svg>
        <style>{`@keyframes svc-dash{to{stroke-dashoffset:-16}}`}</style>

        <ServiceNode svc={svc} p={layout[SVC]} dim={false} onContext={(e) => { e.preventDefault(); const b = box.current!.getBoundingClientRect(); setMenu({ id: SVC, x: Math.min(e.clientX - b.left, b.width - 204), y: Math.min(e.clientY - b.top, b.height - 120) }) }} onDown={(e) => onNodeDown(SVC, e)} onMove={onNodeMove} onUp={onNodeUp} dragging={drag?.id === SVC} />
        {nodes.map((r, i) => (
          <ResourceNode
            key={r.id}
            r={r}
            p={layout[r.id]}
            i={i}
            selected={selected?.id === r.id}
            state={selected?.id === r.id ? state : undefined}
            dim={(!!hover && !lit(r.id)) || (filtering && !match(r))}
            removing={removing.has(r.id)}
            arriving={arriving === r.id}
            dragging={drag?.id === r.id}
            onDown={(e) => onNodeDown(r.id, e)}
            onMove={onNodeMove}
            onUp={onNodeUp}
            onEnter={() => setHover(r.id)}
            onLeave={() => setHover((h) => (h === r.id ? null : h))}
            onClick={() => {
              if (suppressClick.current) return void (suppressClick.current = false)
              const draft = drafts.find((d) => d.id === r.id)
              if (draft) return router.push(href(`/services/${svc.id}/add/${draft.add}`))
              if (selected?.id === r.id) nav.close()
              else nav.open(r.id)
            }}
            onDoubleClick={() => focusNode(r.id)}
            onContext={(e) => {
              e.preventDefault()
              const b = box.current!.getBoundingClientRect()
              setMenu({ id: r.id, x: Math.min(e.clientX - b.left, b.width - 204), y: Math.min(e.clientY - b.top, b.height - 236) })
            }}
          />
        ))}
      </div>

      {/* Top-left: view toggle + search + filters */}
      <div data-ui className="absolute top-6 left-6 z-10 flex items-center gap-2">
        <ViewToggle service={svc.id} view="canvas" />
        <label className="flex h-8.5 w-56 items-center gap-2 rounded-[10px] border border-line-2 bg-surface/90 px-2.5 backdrop-blur focus-within:border-primary/50">
          <Search className="size-3.5 text-subtle" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQ("")
                e.currentTarget.blur()
              }
              if (e.key === "Enter" && order[0]) {
                nav.open(order[0].id)
                e.currentTarget.blur()
              }
            }}
            placeholder="Find a resource"
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
        <div className="flex h-8.5 items-center gap-0.5 rounded-[10px] border border-line-2 bg-surface/90 p-0.5 backdrop-blur">
          {(
            [
              ["all", "All", nodes.length],
              ["attention", "Needs attention", counts.attention],
              ["drafts", "Drafts", counts.drafts],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              disabled={id !== "all" && !n}
              className={cn(
                "relative flex h-full items-center gap-1.5 rounded-[8px] px-2.5 text-xs transition-colors disabled:opacity-35",
                filter === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter === id && <motion.span layoutId="cv-filter" className="absolute inset-0 rounded-[8px] bg-surface-3" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              {id === "attention" && <StatusDot health={n ? "fail" : "idle"} className="relative size-1.5" />}
              <span className="relative">{label}</span>
              <span className="relative font-mono text-[10.5px] text-subtle">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div data-ui className="absolute top-6 right-6 z-10 flex items-center gap-2">
        {saved && (
          <Btn variant="ghost" size="sm" onClick={resetLayout}>
            <RotateCcw /> Reset layout
          </Btn>
        )}
        <Btn variant="secondary" size="sm" kbd="C" onClick={() => setCreating(true)}>
          <Plus /> Create
        </Btn>
      </div>

      {/* Bottom-left: zoom HUD */}
      <div data-ui className="absolute bottom-6 left-6 z-10 flex h-10 items-center gap-0.5 rounded-[10px] border border-line-2 bg-surface/90 px-1 backdrop-blur">
        <HudBtn
          label="Zoom out (-)"
          onClick={() => {
            const { w, h } = view.get()
            touched.current = true
            zoomAt(w / 2, h / 2, 1 / 1.2, true)
          }}
        >
          <Minus className="size-3.5" />
        </HudBtn>
        <ZoomLabel view={view} />
        <HudBtn
          label="Zoom in (=)"
          onClick={() => {
            const { w, h } = view.get()
            touched.current = true
            zoomAt(w / 2, h / 2, 1.2, true)
          }}
        >
          <Plus className="size-3.5" />
        </HudBtn>
        <span className="mx-0.5 h-4 w-px bg-line-2" />
        <HudBtn
          label="Fit to screen (F)"
          onClick={() => {
            touched.current = false
            fit()
          }}
        >
          <Maximize className="size-3.5" />
        </HudBtn>
        <HudBtn label="Shortcuts (?)" onClick={() => setHelp((h) => !h)} on={help}>
          <Keyboard className="size-3.5" />
        </HudBtn>
      </div>

      {/* Bottom-right: minimap */}
      <div data-ui className={cn("absolute right-6 bottom-6 z-10 transition-opacity", selected && "opacity-0 pointer-events-none")}>
        <Minimap
          view={view}
          layout={layout}
          nodes={nodes}
          selected={selected?.id}
          onJump={(wx, wy, animate) => {
            const { w, h, k } = view.get()
            touched.current = true
            move({ x: w / 2 - wx * k, y: h / 2 - wy * k }, animate)
          }}
        />
      </div>

      <AnimatePresence>
        {help && (
          <motion.div
            data-ui
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease }}
            className="absolute bottom-19 left-6 z-20 w-64 rounded-[12px] border border-line-3 bg-surface/95 p-3 shadow-2xl backdrop-blur"
          >
            <p className="mb-2 text-xs font-medium text-foreground">Canvas shortcuts</p>
            {[
              ["↑ ↓ / J K", "Previous / next resource"],
              ["Esc", "Close inspector"],
              ["/", "Find a resource"],
              ["F", "Fit to screen"],
              ["= / -", "Zoom in / out"],
              ["0", "Zoom to 100%"],
              ["⌘ + scroll", "Zoom at cursor"],
              ["Drag", "Pan, or move a node"],
              ["Double-click", "Zoom to node"],
              ["Right-click", "Node actions"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1 text-[11.5px]">
                <span className="text-muted-foreground">{v}</span>
                <kbd className="rounded-[5px] border border-line-3 bg-surface-2 px-1.5 font-mono text-[10.5px] text-foreground">{k}</kbd>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && menu.id === SVC && (
          <ServiceMenu key="svc" at={menu} name={svc.name} deleteHref={`${href(`/services/${svc.id}`)}?op=delete`} onClose={() => setMenu(null)} onFocus={() => focusNode(SVC)} />
        )}
        {menu && menu.id !== SVC && (
          <NodeMenu
            key={menu.id}
            at={menu}
            r={nodes.find((r) => r.id === menu.id)!}
            removing={removing.has(menu.id)}
            onClose={() => setMenu(null)}
            onOpen={() => nav.open(menu.id)}
            onFocus={() => focusNode(menu.id)}
            onHistory={() => nav.tab(menu.id, "history")}
            onRemove={() => {
              const r = nodes.find((n) => n.id === menu.id)!
              if (drafts.some((d) => d.id === r.id)) {
                discardDraft(svc.id, r.id)
                toast(`Discarded draft ${r.name}`)
              } else setConfirmRm(r)
            }}
            onUndoRemove={() => stagedStore.remove(`rm-${menu.id}`)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {filtering && !order.length && (
          <motion.div
            data-ui
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-line-3 bg-surface/95 px-4 py-3 text-center shadow-xl backdrop-blur"
          >
            <p className="text-[13px] text-foreground">Nothing matches</p>
            <button
              onClick={() => {
                setQ("")
                setFilter("all")
              }}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creating && (
          <CreatePalette
            svc={svc.id}
            onPick={pick}
            onClose={() => setCreating(false)}
            onFullForm={(t) => router.push(href(`/services/${svc.id}/add${t ? `/${t}` : ""}`))}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{confirmRm && <RemoveDialog key={confirmRm.id} r={confirmRm} svcName={svc.name} onClose={() => setConfirmRm(null)} onConfirm={() => stageRemoval(confirmRm)} />}</AnimatePresence>

      <div data-ui>
        <StagedBar service={svc.id} />
      </div>
    </div>
  )
}

/** Removing a resource is a staged change like adding one: reviewed, then applied. PROD asks for the name. */
function RemoveDialog({ r, svcName, onClose, onConfirm }: { r: Resource; svcName: string; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = React.useState("")
  const prod = r.env === "prod" && r.status !== "draft"
  const name = nodeTitle(r)
  const ok = !prod || typed === r.name
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  const impact: Record<string, string> = {
    kafka: `${svcName} stops producing to this topic. Its ACLs are removed; the topic itself is kept for other consumers.`,
    postgres: `${svcName} loses its database user and connection secret. The database and its data are kept.`,
    secrets: `${svcName} can no longer read this Vault path. Keys stay in Vault until someone deletes the path.`,
    network: `${svcName} loses network access to this host on the next policy sync.`,
  }
  return (
    <motion.div
      data-ui
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[2px] light:bg-black/15"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.form
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onConfirm()
        }}
        className="w-[420px] rounded-[14px] border border-line-3 bg-surface p-5 shadow-2xl"
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <IntegrationLogo name={r.logo} className="size-4" /> Remove {name}?
        </span>
        <p className="mt-2 text-xs/4.5 text-muted-foreground">{impact[r.type] ?? `${svcName} loses this resource.`}</p>
        <p className="mt-2 text-xs/4.5 text-muted-foreground">This only stages the removal. Nothing changes until the change set is reviewed and applied.</p>
        {prod && (
          <label className="mt-3.5 flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              Type <span className="font-mono text-foreground">{r.name}</span> to confirm (PROD)
            </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="h-9 rounded-[8px] border border-line-3 bg-page px-3 font-mono text-[13px] text-foreground outline-none focus:border-destructive/60"
            />
          </label>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Btn type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" variant="destructive" disabled={!ok}>
            <Trash2 /> Stage removal
          </Btn>
        </div>
      </motion.form>
    </motion.div>
  )
}

function ServiceMenu({ at, name, deleteHref, onClose, onFocus }: { at: { x: number; y: number }; name: string; deleteHref: string; onClose: () => void; onFocus: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  return (
    <motion.div
      data-ui
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      style={{ left: at.x, top: at.y }}
      className="absolute z-30 w-48 origin-top-left rounded-[10px] border border-line-3 bg-surface p-1 shadow-2xl"
    >
      <p className="truncate px-2.5 pt-1 pb-1.5 font-mono text-[11px] text-subtle">{name}</p>
      <button onClick={() => (onFocus(), onClose())} className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground">
        <Crosshair className="size-3.5" /> Zoom to service
      </button>
      <a href={deleteHref} className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">
        <Trash2 className="size-3.5" /> Delete service…
      </a>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */

function HudBtn({ label, onClick, on, children }: { label: string; onClick: () => void; on?: boolean; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
        on && "bg-surface-2 text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function ZoomLabel({ view }: { view: ViewStore }) {
  const k = React.useSyncExternalStore(view.subscribe, () => view.get().k, () => 1)
  return <span className="w-11 text-center font-mono text-[11px] text-muted-foreground tabular-nums">{Math.round(k * 100)}%</span>
}

const MM_W = 176
const MM_H = 112
function Minimap({
  view,
  layout,
  nodes,
  selected,
  onJump,
}: {
  view: ViewStore
  layout: Layout
  nodes: Resource[]
  selected?: string
  onJump: (wx: number, wy: number, animate: boolean) => void
}) {
  const v = React.useSyncExternalStore(view.subscribe, view.get, view.get)
  const b = bbox(layout)
  const pad = 60
  const s = Math.min(MM_W / (b.w + pad * 2), MM_H / (b.h + pad * 2))
  const ox = (MM_W - b.w * s) / 2 - b.minX * s
  const oy = (MM_H - b.h * s) / 2 - b.minY * s
  const vr = v.w ? { x: (-v.x / v.k) * s + ox, y: (-v.y / v.k) * s + oy, w: (v.w / v.k) * s, h: (v.h / v.k) * s } : null
  const dragging = React.useRef(false)
  const jump = (e: React.PointerEvent, animate: boolean) => {
    const r = e.currentTarget.getBoundingClientRect()
    onJump((e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s, animate)
  }
  const tone = (r: Resource): Health => (r.status === "health-fail" ? "fail" : r.status === "expiring" ? "warn" : r.status === "draft" ? "idle" : "ok")
  const fill = { ok: "var(--subtle)", warn: "var(--warning)", fail: "var(--destructive)", idle: "var(--line-3)", busy: "var(--info)" }
  return (
    <svg
      width={MM_W}
      height={MM_H}
      className="cursor-pointer rounded-[10px] border border-line-2 bg-surface/90 backdrop-blur"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        dragging.current = true
        jump(e, true)
      }}
      onPointerMove={(e) => dragging.current && jump(e, false)}
      onPointerUp={() => (dragging.current = false)}
    >
      <rect x={layout[SVC].x * s + ox} y={layout[SVC].y * s + oy} width={SVC_W * s} height={SVC_H * s} rx={3} fill="var(--muted-foreground)" opacity={0.7} />
      {nodes.map((r) => (
        <rect
          key={r.id}
          x={layout[r.id].x * s + ox}
          y={layout[r.id].y * s + oy}
          width={RES_W * s}
          height={RES_H * s}
          rx={3}
          fill={fill[tone(r)]}
          opacity={selected === r.id ? 1 : 0.75}
          stroke={selected === r.id ? "var(--foreground)" : "none"}
        />
      ))}
      {vr && <rect x={vr.x} y={vr.y} width={vr.w} height={vr.h} rx={4} fill="var(--foreground)" fillOpacity={0.04} stroke="var(--primary)" strokeOpacity={0.8} />}
    </svg>
  )
}

function NodeMenu({
  at,
  r,
  onClose,
  onOpen,
  onFocus,
  onHistory,
  removing,
  onRemove,
  onUndoRemove,
}: {
  at: { x: number; y: number }
  r: Resource
  onClose: () => void
  onOpen: () => void
  onFocus: () => void
  onHistory: () => void
  removing: boolean
  onRemove: () => void
  onUndoRemove: () => void
}) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  const item = (Icon: typeof Copy, label: string, fn: () => void) => (
    <button
      onClick={() => {
        fn()
        onClose()
      }}
      className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
    >
      <Icon className="size-3.5" /> {label}
    </button>
  )
  return (
    <motion.div
      data-ui
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      style={{ left: at.x, top: at.y }}
      className="absolute z-30 w-48 origin-top-left rounded-[10px] border border-line-3 bg-surface p-1 shadow-2xl"
    >
      <p className="truncate px-2.5 pt-1 pb-1.5 font-mono text-[11px] text-subtle">{nodeTitle(r)}</p>
      {item(PanelRightOpen, "Open inspector", onOpen)}
      {item(Crosshair, "Zoom to node", onFocus)}
      {item(History, "View history", onHistory)}
      {item(Copy, "Copy name", () => {
        navigator.clipboard?.writeText(r.name).catch(() => {})
        toast.success("Copied", { description: r.name })
      })}
      <div className="my-1 h-px bg-line-2" />
      {removing ? (
        item(Undo2, "Undo removal", onUndoRemove)
      ) : (
        <button
          onClick={() => {
            onRemove()
            onClose()
          }}
          className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" /> Remove from service…
        </button>
      )}
    </motion.div>
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

/** Sparkline that keeps moving, so the canvas reads as live. */
function useLive(data: number[], on: boolean) {
  const [d, setD] = React.useState(data)
  React.useEffect(() => {
    if (!on) return
    const t = window.setInterval(() => {
      setD((p) => {
        const last = p[p.length - 1]
        const next = clamp(last + (Math.random() - 0.48) * 2.4, 1, 14)
        return [...p.slice(1), +next.toFixed(1)]
      })
    }, 1800)
    return () => window.clearInterval(t)
  }, [on])
  return d
}

type DragHandlers = {
  onDown: (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void
  onUp: () => void
  dragging: boolean
}

const ServiceNode = React.memo(function ServiceNode({ svc, p, dim, onContext, onDown, onMove, onUp, dragging }: { svc: Service; p: Pt; dim: boolean; onContext: (e: React.MouseEvent) => void } & DragHandlers) {
  const spark = useLive([5, 6, 5, 7, 6, 8, 7, 9, 8, 9, 10, 9, 11], true)
  return (
    <motion.div
      data-node
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onContextMenu={onContext}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: dim ? 0.35 : 1, scale: dragging ? 1.03 : 1 }}
      transition={{ duration: 0.3, ease }}
      className={cn(
        "absolute flex cursor-grab flex-col gap-1 rounded-[14px] border border-line-3 bg-surface p-1 shadow-lg active:cursor-grabbing",
        dragging && "z-10 shadow-2xl",
      )}
      style={{ left: p.x, top: p.y, width: SVC_W, height: SVC_H }}
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
        <Spark data={spark} width={44} height={12} />
      </div>
    </motion.div>
  )
})

const ResourceNode = React.memo(function ResourceNode({
  r,
  p,
  i,
  selected,
  state,
  dim,
  onEnter,
  onLeave,
  onClick,
  onDoubleClick,
  onContext,
  onDown,
  onMove,
  onUp,
  dragging,
  removing,
  arriving,
}: {
  r: Resource
  p: Pt
  i: number
  selected: boolean
  state: RState
  dim: boolean
  removing: boolean
  arriving: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
  onDoubleClick: () => void
  onContext: (e: React.MouseEvent) => void
} & DragHandlers) {
  const base = look(r, state)
  const l = removing ? { ...base, tone: "idle" as Health, Icon: Trash2, spin: false, text: "Removal staged · not applied", cls: "text-destructive", dots: ["idle", "idle"] as Health[] } : base
  const spark = useLive(r.spark, r.status !== "draft" && state !== "failed" && !removing)
  const ring = selected
    ? state === "applying"
      ? "border-info ring-2 ring-info/25"
      : state === "failed"
        ? "border-destructive ring-2 ring-destructive/25"
        : "border-foreground ring-2 ring-foreground/10"
    : removing
      ? "border-dashed border-destructive/60"
      : r.status === "draft"
        ? "border-dashed border-line-3"
        : "border-line-3"
  return (
    <motion.button
      data-node
      type="button"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContext}
      initial={arriving ? { opacity: 0, scale: 0.6, y: 24 } : { opacity: 0, x: 12 }}
      animate={{ opacity: dim ? 0.3 : 1, x: 0, y: 0, scale: dragging ? 1.03 : 1 }}
      transition={arriving ? { type: "spring", stiffness: 260, damping: 18, delay: 0.25 } : { duration: 0.3, ease, delay: dragging ? 0 : 0.08 + i * 0.04 }}
      className={cn(
        "group absolute flex cursor-pointer flex-col gap-1.5 rounded-[14px] border bg-surface p-1 text-left shadow-lg outline-none transition-[border-color,box-shadow] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary",
        ring,
        dragging && "z-10 cursor-grabbing shadow-2xl",
        arriving && "z-10 border-primary/70 shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_22%,transparent),0_0_60px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
      )}
      style={{ left: p.x, top: p.y, width: RES_W, height: RES_H }}
    >
      {r.id.startsWith("new-") && !removing && (
        <span className="absolute -top-2 right-2.5 rounded-[5px] border border-success/40 bg-success/15 px-1.5 py-px text-[10px] font-medium text-success">New</span>
      )}
      <div className="flex h-9 w-full items-center justify-between rounded-[10px] border border-line-2 bg-surface-2 px-2.5">
        <span className={cn("flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground", r.type === "kafka" && "font-mono text-[12.5px]")}>
          <IntegrationLogo name={r.logo} className="size-4" />
          <span className={cn("truncate", removing && "text-muted-foreground line-through decoration-destructive/70")}>{nodeTitle(r)}</span>
        </span>
        <Dots d={l.dots} />
      </div>
      <div className="flex w-full items-center justify-between gap-2 px-2">
        <span className={cn("flex min-w-0 items-center gap-1.5 text-[11.5px]", l.cls)}>
          {state === "applying" ? (
            <PixelGrid pattern="ripple" size={3} cell={3} gap={1.5} className="mx-px" />
          ) : (
            <l.Icon className={cn("size-3.5 shrink-0", l.spin && "animate-spin-slow")} />
          )}
          <span className="truncate">{state === "applying" ? <WorkingText>{l.text}</WorkingText> : l.text}</span>
        </span>
        <Spark data={spark} tone={l.tone === "busy" ? "ok" : l.tone} width={44} height={12} />
      </div>
    </motion.button>
  )
})
