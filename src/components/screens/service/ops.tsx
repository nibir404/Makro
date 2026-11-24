"use client"

/**
 * OWNER: service-ops agent.
 * Renders deploy-operation dialogs driven by `?op=` on any /services/[service] route:
 * promote | rollout | scale | image-updater | edit-config | rollback | delete
 */
import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ArrowRight, Check, ChevronDown, Loader, Pause, Play, Trash2, TriangleAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getService } from "@/lib/data"
import { Btn, ease, useHotkey } from "@/components/idp/kit"
import { autoUpdates, deleteImpact, promoteChecks, rollbackChanges } from "@/lib/data-ext/service-ops"
import { AreaChart, Segmented, Toggle } from "@/components/screens/service-ops/common"

type Op = "promote" | "rollout" | "scale" | "image-updater" | "edit-config" | "rollback" | "delete"
const OPS: Op[] = ["promote", "rollout", "scale", "image-updater", "edit-config", "rollback", "delete"]

function ProdTag() {
  return <span className="rounded-[5px] bg-warning/15 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-warning">PROD</span>
}

export function ServiceOpsHost({ service }: { service: string }) {
  const sp = useSearchParams()
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const raw = sp?.get("op")
  const op = OPS.includes(raw as Op) ? (raw as Op) : null

  const go = React.useCallback(
    (next: Op | null, extra: Record<string, string> = {}) => {
      const p = new URLSearchParams(sp?.toString())
      ;["op", "to", "env"].forEach((k) => p.delete(k))
      if (next) p.set("op", next)
      for (const [k, v] of Object.entries(extra)) p.set(k, v)
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [sp, pathname, router],
  )
  const close = React.useCallback(() => go(null), [go])
  useHotkey("escape", close, { enabled: !!op })

  const svc = getService(service)
  const sheet = op === "rollout" || op === "scale" || op === "image-updater" || op === "edit-config"
  const width = op === "edit-config" ? "w-[560px]" : "w-[420px]"

  return (
    <AnimatePresence>
      {op && (
        <motion.div key="ops" className="fixed inset-0 z-50">
          <motion.div
            className={cn("absolute inset-0", sheet ? "bg-black/20" : "bg-black/60 backdrop-blur-[1px]")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          {sheet ? (
            <motion.aside
              key={op}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className={cn("absolute top-14 right-0 bottom-0 flex flex-col border-l border-line-2 bg-surface shadow-2xl", width)}
            >
              {op === "rollout" && <Rollout close={close} />}
              {op === "scale" && <Scale close={close} />}
              {op === "image-updater" && <ImageUpdater close={close} />}
              {op === "edit-config" && <EditConfig close={close} env={sp?.get("env") ?? "qa"} />}
            </motion.aside>
          ) : (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <motion.div
                key={op}
                role="dialog"
                aria-modal
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.25, ease }}
                className={cn(
                  "pointer-events-auto overflow-hidden rounded-[16px] border border-line-3 bg-surface shadow-2xl",
                  op === "promote" ? "w-[600px]" : op === "delete" ? "w-[520px]" : "w-[560px]",
                )}
              >
                {op === "promote" && <Promote name={svc.name} close={close} onDone={() => go("rollout")} />}
                {op === "rollback" && <Rollback name={svc.name} to={sp?.get("to") ?? "v1.39.0"} close={close} />}
                {op === "delete" && <Delete name={svc.name} close={close} />}
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- tier 2: promote ---------------- */
function Promote({ name, close, onDone }: { name: string; close: () => void; onDone: () => void }) {
  const [checks, setChecks] = React.useState(promoteChecks)
  const [strategy, setStrategy] = React.useState<"canary" | "rolling">("canary")
  const [busy, setBusy] = React.useState(false)
  const failing = checks.filter((c) => !c.ok).length
  return (
    <>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <ProdTag />
            <h2 className="text-base font-semibold text-foreground">Promote {name} to prod</h2>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">v1.40.3 → v1.42.0 · 2 releases · 9 commits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-[10px] border border-line-3 px-3 py-2">
            <div className="text-[11px] text-subtle">qa · source</div>
            <div className="font-mono text-sm text-foreground">v1.42.0</div>
          </div>
          <ArrowRight className="size-4 text-subtle" />
          <div className="flex-1 rounded-[10px] border border-warning/40 px-3 py-2">
            <div className="text-[11px] text-subtle">prod · now</div>
            <div className="font-mono text-sm text-foreground">v1.40.3</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] tracking-wider text-subtle uppercase">Checks</div>
          {checks.map((c, i) => (
            <div key={c.text} className="flex items-center gap-2 text-[13px] text-foreground">
              <AnimatePresence mode="wait">
                {c.ok ? (
                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="size-3.5 text-success" /></motion.span>
                ) : (
                  <motion.span key="x" exit={{ scale: 0 }}><X className="size-3.5 text-destructive" /></motion.span>
                )}
              </AnimatePresence>
              <span className={cn("flex-1", c.ok && c.fix && "text-muted-foreground line-through decoration-subtle")}>{c.text}</span>
              {!c.ok && c.fix && (
                <button
                  className="text-xs text-foreground underline underline-offset-2 hover:text-primary"
                  onClick={() => {
                    setChecks((cs) => cs.map((x, j) => (j === i ? { ...x, ok: true } : x)))
                    toast.success("Copied FEATURE_NEW_CHECKOUT from qa to prod")
                  }}
                >
                  {c.fix}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] tracking-wider text-subtle uppercase">Strategy</div>
          <div className="grid grid-cols-2 gap-2">
            {([["canary", "Canary · 10% → 50% → 100%"], ["rolling", "Rolling · all at once"]] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStrategy(v)}
                className={cn(
                  "rounded-[8px] border px-3 py-2 text-left text-[13px] transition-colors",
                  strategy === v ? "border-foreground text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-subtle">Auto-rolls back if errors &gt; 1% or p95 &gt; 250ms at any step</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line-2 px-5 py-3.5">
        <span className={cn("text-xs", failing ? "text-destructive" : "text-subtle")}>
          {failing ? `Fix ${failing} check to continue` : "Blast radius: prod · 4 pods · ~2.1k req/s"}
        </span>
        <div className="flex gap-2">
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!!failing || busy}
            onClick={() => {
              setBusy(true)
              setTimeout(() => {
                toast.success("Promotion started · v1.42.0 → prod")
                onDone()
              }, 700)
            }}
          >
            {busy && <Loader className="animate-spin" />} Promote
          </Btn>
        </div>
      </div>
    </>
  )
}

/* ---------------- tier 2: rollback ---------------- */
function Rollback({ name, to, close }: { name: string; to: string; close: () => void }) {
  const [busy, setBusy] = React.useState(false)
  const changes = rollbackChanges.map((c) => (c.key === "image" ? { ...c, to } : c))
  return (
    <>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <ProdTag />
          <h2 className="text-base font-semibold text-foreground">Roll back {name} to {to}?</h2>
        </div>
        <p className="text-[13px] text-muted-foreground">
          prod moves from v1.40.3 to {to}. Traffic shifts gradually. You can roll forward again from the history.
        </p>
        <div className="overflow-hidden rounded-[10px] border border-line-3">
          <div className="border-b border-line-2 px-3 py-2 text-[11px] tracking-wider text-subtle uppercase">What changes · {changes.length}</div>
          {changes.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="grid grid-cols-[20px_120px_1fr] px-3 py-1.5 font-mono text-xs"
            >
              <span className={c.sign === "-" ? "text-destructive" : "text-subtle"}>{c.sign}</span>
              <span className="text-muted-foreground">{c.key}</span>
              {"from" in c && c.from ? (
                <span className="flex items-center gap-2"><span className="text-destructive">{c.from}</span><ArrowRight className="size-3 text-subtle" /><span className="text-success">{c.to}</span></span>
              ) : (
                <span className={c.sign === "-" ? "text-destructive" : "text-foreground"}>{c.value}</span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-[10px] border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs text-foreground">
          <TriangleAlert className="size-3.5 text-warning" /> The schema migration in v1.40.0 stays applied. {to} is compatible.
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line-2 px-5 py-3.5">
        <span className="text-xs text-subtle">Logged to Activity as Alex</span>
        <div className="flex gap-2">
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setTimeout(() => {
                toast.success(`prod rolled back to ${to}`, { description: "Traffic shifting · 4 pods" })
                close()
              }, 900)
            }}
          >
            {busy && <Loader className="animate-spin" />} Roll back prod
          </Btn>
        </div>
      </div>
    </>
  )
}

/* ---------------- tier 3: delete ---------------- */
function Delete({ name, close }: { name: string; close: () => void }) {
  const [v, setV] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const ok = v === name
  return (
    <>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Trash2 className="size-4 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Delete {name}?</h2>
        </div>
        <p className="text-[13px] text-muted-foreground">This can&apos;t be undone. Shared resources stay; only what belongs to this service is removed.</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[10px] border border-destructive/30 bg-destructive/8 p-3 text-xs">
            <div className="mb-1.5 tracking-wider text-destructive uppercase">Removed</div>
            {deleteImpact.removed.map((r) => <div key={r} className="py-0.5 text-foreground">{r}</div>)}
          </div>
          <div className="rounded-[10px] border border-line-3 p-3 text-xs">
            <div className="mb-1.5 tracking-wider text-subtle uppercase">Kept</div>
            {deleteImpact.kept.map((r) => <div key={r} className="py-0.5 text-foreground">{r}</div>)}
          </div>
        </div>
        <label className="text-xs text-muted-foreground">
          Type <span className="font-mono text-foreground">{name}</span> to confirm
        </label>
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ok && setBusy(true)}
          className={cn(
            "h-10 rounded-[8px] border bg-surface-2 px-3 font-mono text-[13px] text-foreground outline-none transition-colors",
            ok ? "border-destructive" : "border-line-3 focus:border-subtle",
          )}
        />
      </div>
      <div className="flex items-center justify-between border-t border-line-2 px-5 py-3.5">
        <span className="text-xs text-subtle">Pause instead? It&apos;s reversible.</span>
        <div className="flex gap-2">
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            variant="destructive"
            disabled={!ok || busy}
            onClick={() => {
              setBusy(true)
              setTimeout(() => {
                toast.error(`${name} deleted`, { description: "3 environments removed · shared resources kept" })
                close()
              }, 1000)
            }}
          >
            {busy && <Loader className="animate-spin" />} Delete service
          </Btn>
        </div>
      </div>
    </>
  )
}

/* ---------------- sheets ---------------- */
function SheetHead({ title, sub, right, close }: { title: React.ReactNode; sub?: string; right?: React.ReactNode; close: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-line-2 px-5 py-4">
      <div>
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">{title}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">
        {right}
        <button onClick={close} aria-label="Close" className="rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

/* rollout: live canary */
const STEPS = [10, 50, 100]
function Rollout({ close }: { close: () => void }) {
  const [pct, setPct] = React.useState(10)
  const [paused, setPaused] = React.useState(false)
  const [aborted, setAborted] = React.useState(false)
  React.useEffect(() => {
    if (paused || aborted || pct >= 100) return
    const t = setTimeout(() => setPct((p) => Math.min(100, p + 2)), 220)
    return () => clearTimeout(t)
  }, [pct, paused, aborted])
  const done = pct >= 100
  const step = pct < 50 ? 1 : pct < 100 ? 2 : 3
  const newPods = aborted ? 0 : Math.round((pct / 100) * 4)
  const left = Math.max(0, Math.round(((100 - pct) / 90) * 192))
  const leftLabel = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`
  const segs = [10, 40, 50]
  const prog = [Math.min(pct, 10) / 10, Math.max(0, Math.min(pct, 50) - 10) / 40, Math.max(0, pct - 50) / 50]
  return (
    <>
      <SheetHead
        close={close}
        title={
          <>
            {aborted ? <X className="size-4 text-destructive" /> : done ? <Check className="size-4 text-success" /> : <Loader className={cn("size-4 text-info", !paused && "animate-spin")} />}
            {aborted ? "Rolled back · prod" : done ? "v1.42.0 live · prod" : "Rolling out v1.42.0 · prod"}
          </>
        }
        sub={`Canary · step ${step} of 3 · started 6 min ago by Alex${paused ? " · paused" : ""}`}
      />
      <div className="border-b border-line-2 px-5 py-4">
        <div className="flex gap-1">
          {segs.map((w, i) => (
            <div key={i} className="h-1.5 overflow-hidden rounded-full bg-surface-3" style={{ flex: w }}>
              <motion.div
                className={cn("h-full rounded-full", aborted ? "bg-destructive" : prog[i] >= 1 ? "bg-success" : "bg-info")}
                animate={{ width: `${prog[i] * 100}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px]">
          {STEPS.map((s) => (
            <span key={s} className={pct >= s ? "text-success" : pct >= s - 40 && !done ? "text-info" : "text-subtle"}>
              {s}%{pct >= s && " ✓"}
              {s === 50 && pct > 10 && pct < 50 && !aborted && ` · ${leftLabel}`}
            </span>
          ))}
        </div>
      </div>
      <div className="border-b border-line-2 px-5 py-4">
        <div className="mb-3 text-[11px] tracking-wider text-subtle uppercase">New vs old · live</div>
        <div className="flex justify-between py-1 text-[13px]"><span className="text-muted-foreground">Error rate</span><span className="text-foreground">0.18% <span className="text-subtle">vs 0.31%</span></span></div>
        <div className="flex justify-between py-1 text-[13px]"><span className="text-muted-foreground">p95 latency</span><span className="text-foreground">176ms <span className="text-subtle">vs 184ms</span></span></div>
        <div className="relative mt-4">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-destructive/70" />
          <div className="pt-4">
            <div className="relative h-10">
              <div className="absolute inset-0"><AreaChart data={[20, 21, 20, 19, 21, 20, 20, 21, 20, 20, 21, 20]} color="var(--subtle)" height={40} /></div>
              <div className="absolute inset-0"><AreaChart data={[14, 13, 14, 13, 14, 13, 13, 14, 13, 13, 14, 13]} color="var(--info)" height={40} delay={0.2} /></div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-[11px]">
          <span className="text-subtle">— v1.40.3</span><span className="text-info">— v1.42.0</span><span className="text-destructive">— rollback threshold</span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="mb-2 text-[11px] tracking-wider text-subtle uppercase">Pods</div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              animate={{ scale: i === newPods - 1 && !done ? [1, 1.15, 1] : 1 }}
              className={cn(
                "size-5 rounded-[5px] border transition-colors duration-500",
                i < newPods ? (done ? "border-success bg-success/25" : "border-info bg-info/20") : "border-line-3 bg-surface-3",
              )}
            />
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{newPods} new · {4 - newPods} old</div>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line-2 px-5 py-4">
        <Btn disabled={done || aborted} onClick={() => setPaused((p) => !p)}>
          {paused ? <><Play /> Resume</> : <><Pause /> Pause</>}
        </Btn>
        <Btn
          variant="destructive"
          disabled={done || aborted}
          onClick={() => {
            setAborted(true)
            toast.error("Rollout aborted · prod back on v1.40.3")
          }}
        >
          Abort & roll back
        </Btn>
        <Btn variant="outline" disabled={done || aborted} onClick={() => setPct(100)}>Skip to 100%</Btn>
      </div>
    </>
  )
}

/* scale: tier 1 */
function Scale({ close }: { close: () => void }) {
  const [mode, setMode] = React.useState<"fixed" | "auto">("auto")
  const [min, setMin] = React.useState(2)
  const [max, setMax] = React.useState(12)
  const [fixed, setFixed] = React.useState(4)
  const [metric, setMetric] = React.useState("CPU")
  const [thr, setThr] = React.useState(60)
  const cur = [3, 3, 4, 4, 6, 7, 7, 6, 4, 4, 3, 3]
  const nu = cur.map((v, i) => (i > 1 && i < 10 ? v + Math.round((70 - thr) / 10) : v))
  const apply = () => {
    toast.success(mode === "auto" ? `Autoscale ${min}–${max} on ${metric} ${thr}%` : `Fixed at ${fixed} replicas`, {
      description: "Applied to prod",
      action: { label: "Undo", onClick: () => toast("Scaling reverted") },
    })
    close()
  }
  return (
    <>
      <SheetHead close={close} title="Scale · prod" right={<ProdTag />} />
      <div className="flex flex-col gap-4 px-5 py-4">
        <Segmented id="scale-mode" value={mode} onChange={setMode} options={[{ value: "fixed", label: "Fixed" }, { value: "auto", label: "Autoscale" }]} />
        <div>
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-foreground">Replicas</span>
            <span className="font-mono text-xs text-foreground">{mode === "auto" ? `min ${min} · max ${max}` : fixed}</span>
          </div>
          {mode === "auto" ? (
            <div className="relative h-5">
              <div className="absolute top-2 h-0.5 w-full bg-surface-3" />
              <div className="absolute top-2 h-0.5 bg-foreground" style={{ left: `${((min - 1) / 19) * 100}%`, right: `${100 - ((max - 1) / 19) * 100}%` }} />
              <div className="absolute top-0.5 h-3.5 w-0.5 bg-info" style={{ left: `${(3 / 19) * 100}%` }} />
              {([[min, (v: number) => setMin(Math.min(v, max - 1))], [max, (v: number) => setMax(Math.max(v, min + 1))]] as const).map(([v, set], i) => (
                <input key={i} type="range" min={1} max={20} value={v} onChange={(e) => set(+e.target.value)} className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground" />
              ))}
            </div>
          ) : (
            <input type="range" min={1} max={20} value={fixed} onChange={(e) => setFixed(+e.target.value)} className="w-full accent-foreground" />
          )}
          <div className="mt-1 text-[11px] text-info">running 4 now</div>
        </div>
        {mode === "auto" && (
          <>
            <div>
              <div className="mb-2 text-[13px] text-foreground">Scale up when</div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select value={metric} onChange={(e) => setMetric(e.target.value)} className="h-9 w-full appearance-none rounded-[8px] border border-line-3 bg-surface-2 px-3 text-[13px] text-foreground outline-none">
                    <option>CPU</option><option>Memory</option><option>Requests / s</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-2.5 right-3 size-4 text-subtle" />
                </div>
                <div className="relative w-24">
                  <input type="number" value={thr} min={10} max={95} onChange={(e) => setThr(+e.target.value)} className={cn("h-9 w-full rounded-[8px] border bg-surface-2 px-3 font-mono text-[13px] text-foreground outline-none", thr !== 70 ? "border-info" : "border-line-3")} />
                  <span className="pointer-events-none absolute top-2 right-3 text-[13px] text-subtle">%</span>
                </div>
              </div>
              {thr !== 70 && <div className="mt-1 text-[11px] text-info">changed from 70%</div>}
            </div>
            <div className="rounded-[12px] border border-line-2 p-3">
              <div className="mb-3 flex justify-between text-xs"><span className="text-muted-foreground">Last 24h with this rule</span><span className="text-subtle">preview</span></div>
              <div className="relative h-12">
                <div className="absolute inset-0"><AreaChart key={`c`} data={cur} step color="var(--subtle)" height={48} /></div>
                <div className="absolute inset-0"><AreaChart key={thr} data={nu} step color="var(--info)" height={48} /></div>
              </div>
              <div className="mt-2 flex gap-3 text-[11px]"><span className="text-subtle">— current (70%)</span><span className="text-info">— new ({thr}%)</span></div>
            </div>
          </>
        )}
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Cost impact</span>
          <span className="text-foreground">{mode === "auto" ? `+$${Math.max(0, (70 - thr) * 4 - 2)}/mo · peak ${Math.min(max, 7 + Math.round((70 - thr) / 10))} pods` : `${fixed > 4 ? "+" : ""}$${(fixed - 4) * 19}/mo`}</span>
        </div>
      </div>
      <div className="mt-auto border-t border-line-2 px-5 py-4">
        <div className="mb-3 text-xs text-subtle">Applies right away · undo for 30 min</div>
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={close}>Cancel</Btn>
          <Btn variant="primary" onClick={apply}>Apply</Btn>
        </div>
      </div>
    </>
  )
}

/* image updater: tier 1 */
function ImageUpdater({ close }: { close: () => void }) {
  const [on, setOn] = React.useState({ dev: true, qa: true })
  const flip = (env: "dev" | "qa", v: boolean) => {
    setOn((s) => ({ ...s, [env]: v }))
    toast(`Auto-update ${v ? "on" : "off"} for ${env}`, { action: { label: "Undo", onClick: () => setOn((s) => ({ ...s, [env]: !v })) } })
  }
  const allOff = !on.dev && !on.qa
  return (
    <>
      <SheetHead close={close} title={<>🍄 Image updater</>} sub="Deploy new images automatically when CI builds them" />
      <div className="border-b border-line-2 px-5 py-2">
        {([["dev", "every build on main"], ["qa", "semver tags · v1.*"]] as const).map(([e, d]) => (
          <div key={e} className="flex items-center justify-between border-b border-line-2 py-3">
            <span className="text-[13px] text-foreground">{e}</span>
            <span className="flex items-center gap-4 text-xs text-muted-foreground">{d}<Toggle on={on[e]} onChange={(v) => flip(e, v)} /></span>
          </div>
        ))}
        <div className="flex items-center justify-between py-3">
          <span className="text-[13px] text-foreground">prod</span>
          <span className="flex items-center gap-4 text-xs text-muted-foreground">manual promote only<Toggle on={false} disabled /></span>
        </div>
        <p className="pb-2 text-[11px] text-subtle">Prod can&apos;t auto-update. That keeps the approval rule in place.</p>
      </div>
      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="text-[11px] tracking-wider text-subtle uppercase">Recent auto-updates</div>
        {autoUpdates.map((u) => (
          <div key={u.ref} className="flex justify-between font-mono text-xs">
            <span className="text-foreground">{u.env} · {u.ref}</span>
            <span className={cn("font-sans", u.ok ? "text-success" : "text-destructive")}>{u.result}</span>
          </div>
        ))}
        <div className="mt-2 text-xs text-muted-foreground">Registry</div>
        <input defaultValue="ccr.makro.io/commerce/order-service" className="h-9 rounded-[8px] border border-line-3 bg-surface-2 px-3 font-mono text-xs text-foreground outline-none focus:border-info" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line-2 px-5 py-4">
        <span className="text-xs text-subtle">Saved automatically</span>
        <Btn
          onClick={() => {
            const prev = on
            setOn(allOff ? { dev: true, qa: true } : { dev: false, qa: false })
            toast(allOff ? "Auto-updates resumed" : "All auto-updates paused", { action: { label: "Undo", onClick: () => setOn(prev) } })
          }}
        >
          {allOff ? "Resume all" : "Pause all"}
        </Btn>
      </div>
    </>
  )
}

/* edit config: form / yaml */
function EditConfig({ close, env }: { close: () => void; env: string }) {
  const [view, setView] = React.useState<"form" | "yaml">("yaml")
  const [mem, setMem] = React.useState("256Mi")
  const [cpu, setCpu] = React.useState("500m")
  const [busy, setBusy] = React.useState(false)
  const bad = parseInt(mem) < 512
  const lines: [string, string?, ("info" | "err")?, string?][] = [
    ["resources:"],
    ["  requests:"],
    ["    cpu: ", cpu, cpu !== "250m" ? "info" : undefined, cpu !== "250m" ? "was 250m" : undefined],
    ["    memory: 512Mi"],
    ["  limits:"],
    ["    memory: ", mem, bad ? "err" : mem !== "256Mi" ? "info" : undefined, bad ? "less than request" : mem !== "256Mi" ? "was 256Mi" : undefined],
    ["probes:"],
    ["  readiness: /healthz"],
    ["ports: [8080]"],
  ]
  return (
    <>
      <SheetHead
        close={close}
        title={`Edit config · ${env}`}
        right={<Segmented id="cfg-view" className="w-36" value={view} onChange={setView} options={[{ value: "form", label: "Form" }, { value: "yaml", label: "YAML" }]} />}
      />
      <div className="flex flex-col gap-3 px-5 py-4">
        {view === "yaml" ? (
          <div className="rounded-[12px] border border-line-2 bg-page py-3 font-mono text-xs">
            {lines.map(([pre, val, tone, note], i) => (
              <div key={i} className={cn("flex items-center px-3 py-0.5", tone === "info" && "bg-info/8", tone === "err" && "bg-destructive/10")}>
                <span className="w-7 text-subtle">{i + 1}</span>
                <span className="flex-1 whitespace-pre text-muted-foreground">
                  {pre}
                  {val && <span className={tone === "err" ? "text-destructive" : tone === "info" ? "text-info" : "text-foreground"}>{val}</span>}
                </span>
                {note && <span className={cn("font-sans text-[11px]", tone === "err" ? "text-destructive" : "text-info")}>{note}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-[12px] border border-line-2 p-4">
            {([["CPU request", cpu, setCpu], ["Memory limit", mem, setMem]] as const).map(([l, v, set]) => (
              <label key={l} className="flex items-center justify-between text-[13px] text-foreground">
                {l}
                <input value={v} onChange={(e) => set(e.target.value)} className={cn("h-9 w-40 rounded-[8px] border bg-surface-2 px-3 font-mono text-xs text-foreground outline-none", l === "Memory limit" && bad ? "border-destructive" : "border-line-3")} />
              </label>
            ))}
            <div className="flex justify-between text-[13px] text-muted-foreground"><span>Memory request</span><span className="font-mono text-xs">512Mi</span></div>
          </div>
        )}
        <AnimatePresence>
          {bad && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-start gap-3 rounded-[12px] border border-destructive/40 bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex-1">Line 6: memory limit ({mem}) is below the request (512Mi). Pods won&apos;t start.</span>
                <button className="text-foreground underline underline-offset-2" onClick={() => setMem("768Mi")}>Set to 768Mi</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="rounded-[12px] border border-line-2 px-3 py-2.5">
          <div className="mb-1 text-[11px] tracking-wider text-subtle uppercase">What changes</div>
          <div className="text-xs text-foreground">cpu request 250m → {cpu} · +$6/mo · pods restart one at a time{mem !== "256Mi" && !bad ? ` · memory limit 256Mi → ${mem}` : ""}</div>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line-2 px-5 py-4">
        <span className={cn("text-xs", bad ? "text-destructive" : "text-success")}>{bad ? "1 error to fix" : "Ready to deploy"}</span>
        <div className="flex gap-2">
          <Btn onClick={close}>Discard</Btn>
          <Btn
            variant="primary"
            disabled={bad || busy}
            onClick={() => {
              setBusy(true)
              setTimeout(() => {
                toast.success(`Config deployed to ${env}`, { description: "Pods restarting one at a time" })
                close()
              }, 800)
            }}
          >
            {busy && <Loader className="animate-spin" />} Save & deploy
          </Btn>
        </div>
      </div>
    </>
  )
}
