"use client"

/* Shared viewers that used to be toast placeholders:
   LogViewer (build/job logs), CodeViewer (generated Pulumi code), FilterMenu (multi-select filter chip),
   and the product tour (TourHost + startTour), anchored to [data-tour] elements in the shell. */

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ArrowDownToLine, Check, ChevronDown, Copy, Download, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Btn, ease } from "@/components/idp/kit"
import { WorkingPill } from "@/components/idp/working"

/* ------------------------------------------------------------------ */
/* Right-side sheet                                                    */
/* ------------------------------------------------------------------ */

function Sheet({ open, onClose, width = 720, children }: { open: boolean; onClose: () => void; width?: number; children: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, onClose])
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] light:bg-black/15" onClick={onClose} />
          <motion.aside
            role="dialog"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="relative flex h-full flex-col border-l border-line-3 bg-surface shadow-2xl"
            style={{ width: `min(${width}px, 100vw)` }}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SheetHead({ title, sub, right, onClose }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-2 px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">{title}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-subtle">{sub}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        {right}
        <button aria-label="Close" onClick={onClose} className="rounded-[7px] p-1.5 text-subtle hover:bg-surface-3 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {}
  toast.success(`Copied ${what}`)
}

/* ------------------------------------------------------------------ */
/* Log viewer                                                          */
/* ------------------------------------------------------------------ */

export type LogLine = { t: string; text: string; level?: "info" | "warn" | "error" | "step" }

export function LogViewer({
  open,
  onClose,
  title,
  sub,
  lines,
  status,
  fileName = "job.log",
  streaming = false,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  sub?: React.ReactNode
  lines: LogLine[]
  status: { tone: "fail" | "ok" | "busy"; label: string }
  fileName?: string
  /** Replay the lines as if they were arriving. */
  streaming?: boolean
}) {
  return (
    <Sheet open={open} onClose={onClose} width={760}>
      {open && <LogBody title={title} sub={sub} lines={lines} status={status} fileName={fileName} streaming={streaming} onClose={onClose} />}
    </Sheet>
  )
}

function LogBody({
  title,
  sub,
  lines,
  status,
  fileName,
  streaming,
  onClose,
}: {
  title: React.ReactNode
  sub?: React.ReactNode
  lines: LogLine[]
  status: { tone: "fail" | "ok" | "busy"; label: string }
  fileName: string
  streaming: boolean
  onClose: () => void
}) {
  const [n, setN] = React.useState(streaming ? 0 : lines.length)
  const [q, setQ] = React.useState("")
  const [follow, setFollow] = React.useState(true)
  const [errorsOnly, setErrorsOnly] = React.useState(false)
  const scroller = React.useRef<HTMLDivElement>(null)
  const done = n >= lines.length

  React.useEffect(() => {
    if (done) return
    const t = window.setInterval(() => setN((x) => Math.min(lines.length, x + 1)), 70)
    return () => window.clearInterval(t)
  }, [done, lines.length])
  React.useEffect(() => {
    if (follow && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [n, follow])

  const ql = q.trim().toLowerCase()
  const visible = lines.slice(0, n).map((l, i) => ({ ...l, i })).filter((l) => (!errorsOnly || l.level === "error" || l.level === "warn") && (!ql || l.text.toLowerCase().includes(ql)))
  const firstError = lines.findIndex((l) => l.level === "error")
  const text = lines.map((l) => `${l.t}  ${l.text}`).join("\n")

  return (
    <>
      <SheetHead
        title={title}
        sub={sub}
        onClose={onClose}
        right={
          <>
            <Btn size="sm" variant="ghost" onClick={() => copyText(text, "log")}>
              <Copy /> Copy
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => download(fileName, text)}>
              <Download /> Download
            </Btn>
          </>
        }
      />
      <div className="flex items-center gap-2 border-b border-line-2 px-5 py-2.5">
        {done ? (
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px]", status.tone === "fail" ? "border-destructive/40 text-destructive" : status.tone === "ok" ? "border-success/40 text-success" : "border-info/40 text-info")}>
            {status.label}
          </span>
        ) : (
          <WorkingPill size="sm" label="Streaming log" pattern="scan" />
        )}
        <label className="ml-2 flex h-8 flex-1 items-center gap-2 rounded-[8px] border border-line-3 bg-page px-2.5 focus-within:border-foreground/40">
          <Search className="size-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the log" className="flex-1 bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:text-subtle" />
          {ql && <span className="text-[11px] text-subtle">{visible.length} matches</span>}
        </label>
        <Toggle on={errorsOnly} onClick={() => setErrorsOnly((v) => !v)}>
          Errors only
        </Toggle>
        <Toggle on={follow} onClick={() => setFollow((v) => !v)}>
          <ArrowDownToLine className="size-3.5" /> Follow
        </Toggle>
      </div>
      <div ref={scroller} onWheel={() => setFollow(false)} className="flex-1 overflow-auto bg-page py-2 font-mono text-[12px] leading-[20px]">
        {visible.map((l) => (
          <div
            key={l.i}
            id={l.i === firstError ? "log-first-error" : undefined}
            className={cn(
              "flex gap-4 px-5",
              l.level === "error" && "bg-destructive/10 text-destructive",
              l.level === "warn" && "text-warning",
              l.level === "step" && "mt-1.5 font-semibold text-foreground",
              !l.level || l.level === "info" ? "text-muted-foreground" : "",
            )}
          >
            <span className="w-8 shrink-0 text-right text-subtle select-none">{l.i + 1}</span>
            <span className="w-16 shrink-0 text-subtle">{l.t}</span>
            <span className="whitespace-pre-wrap">{ql ? highlight(l.text, ql) : l.text}</span>
          </div>
        ))}
        {!visible.length && <div className="px-5 py-10 text-center text-subtle">No lines match.</div>}
      </div>
      {done && firstError >= 0 && (
        <div className="flex items-center justify-between border-t border-line-2 px-5 py-3 text-[12.5px]">
          <span className="text-destructive">Failed at line {firstError + 1}</span>
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => {
              setErrorsOnly(false)
              setQ("")
              setFollow(false)
              requestAnimationFrame(() => document.getElementById("log-first-error")?.scrollIntoView({ block: "center", behavior: "smooth" }))
            }}
          >
            Jump to error
          </Btn>
        </div>
      )}
    </>
  )
}

function highlight(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-primary/30 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] transition-colors", on ? "border-foreground/40 bg-surface-3 text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Code viewer                                                         */
/* ------------------------------------------------------------------ */

export type CodeFile = { name: string; code: string; note?: string }

const KW = /\b(import|from|export|const|let|new|return|true|false|as|type|interface|function|await|async)\b/
function tokenize(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\/\/.*$|#.*$)|("[^"]*"|'[^']*'|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(line))) {
    const [tok, comment, str, num, word] = m
    const cls = comment ? "text-subtle italic" : str ? "text-success" : num ? "text-warning" : word && KW.test(word) ? "text-primary" : word && /^[A-Z]/.test(word) ? "text-info" : "text-foreground/90"
    out.push(
      <span key={k++} className={cls}>
        {tok}
      </span>,
    )
  }
  return out
}

export function CodeViewer({ open, onClose, title, sub, files }: { open: boolean; onClose: () => void; title: React.ReactNode; sub?: React.ReactNode; files: CodeFile[] }) {
  const [active, setActive] = React.useState(0)
  const f = files[Math.min(active, files.length - 1)]
  const lines = f.code.split("\n")
  return (
    <Sheet open={open} onClose={onClose} width={780}>
      <SheetHead
        title={title}
        sub={sub}
        onClose={onClose}
        right={
          <>
            <Btn size="sm" variant="ghost" onClick={() => copyText(f.code, f.name)}>
              <Copy /> Copy
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => download(f.name, f.code)}>
              <Download /> Download
            </Btn>
          </>
        }
      />
      <div className="flex items-center gap-1 border-b border-line-2 px-4">
        {files.map((x, i) => (
          <button
            key={x.name}
            onClick={() => setActive(i)}
            className={cn("relative px-3 py-2.5 font-mono text-[12px]", i === active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {x.name}
            {i === active && <motion.span layoutId="code-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
          </button>
        ))}
      </div>
      {f.note && <div className="border-b border-line-2 bg-info/5 px-5 py-2 text-[12px] text-info">{f.note}</div>}
      <div className="flex-1 overflow-auto bg-page py-3 font-mono text-[12.5px] leading-[21px]">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-4 px-5 hover:bg-surface-2/40">
            <span className="w-7 shrink-0 text-right text-subtle select-none">{i + 1}</span>
            <span className="whitespace-pre">{tokenize(l)}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Filter menu (multi-select chip)                                     */
/* ------------------------------------------------------------------ */

export function FilterMenu({
  label,
  options,
  selected,
  onChange,
  size = "sm",
}: {
  label: string
  options: { value: string; count: number }[]
  selected: string[]
  onChange: (next: string[]) => void
  size?: "sm" | "md"
}) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const h = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("pointerdown", h)
    window.addEventListener("keydown", k)
    return () => {
      window.removeEventListener("pointerdown", h)
      window.removeEventListener("keydown", k)
    }
  }, [open])
  const on = selected.length > 0
  const shown = options.filter((o) => o.value.toLowerCase().includes(q.toLowerCase()))
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-[7px] border px-2.5 transition-colors",
          size === "md" ? "h-9 text-[12.5px]" : "h-7.5 text-[12px]",
          on ? "border-foreground/40 bg-surface-3 text-foreground" : "border-dashed border-line-3 text-subtle hover:text-foreground",
        )}
      >
        {on ? `${label}: ${selected.length === 1 ? selected[0] : `${selected.length} selected`}` : `+ ${label}`}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 z-40 mt-1.5 w-60 rounded-[10px] border border-line-3 bg-surface p-1 shadow-2xl"
          >
            {options.length > 6 && (
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find ${label.toLowerCase()}`} className="mb-1 h-8 w-full rounded-[7px] border border-line-3 bg-page px-2.5 text-[12px] text-foreground outline-none" />
            )}
            {shown.map((o) => {
              const sel = selected.includes(o.value)
              return (
                <button key={o.value} onClick={() => toggle(o.value)} className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                  <span className={cn("grid size-4 place-items-center rounded-[4px] border", sel ? "border-primary bg-primary text-primary-foreground" : "border-line-3")}>{sel && <Check className="size-3" strokeWidth={3} />}</span>
                  <span className="flex-1 truncate">{o.value}</span>
                  <span className="font-mono text-[11px] text-subtle">{o.count}</span>
                </button>
              )
            })}
            {on && (
              <button onClick={() => onChange([])} className="mt-1 w-full border-t border-line-2 px-2 pt-1.5 pb-1 text-left text-[12px] text-subtle hover:text-foreground">
                Clear {label.toLowerCase()}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Product tour                                                        */
/* ------------------------------------------------------------------ */

type Step = { target: string; title: string; body: string }
const STEPS: Step[] = [
  { target: "mode", title: "Two ways to work", body: "Canvas draws your services as a graph. Classic gives dense tables. Switch any time — you stay on the same screen." },
  { target: "services", title: "Everything starts at a service", body: "Kafka topics, Postgres users, secrets and network access are resources of a service. Open one to see its canvas." },
  { target: "inbox", title: "One inbox for every change", body: "Requests you need to review and your own changes in flight. PROD changes always need a second approver." },
  { target: "platform", title: "The platform modules", body: "Infrastructure, network access, secrets, Kafka, Postgres and projects. Each has a list and a canvas view." },
  { target: "search", title: "⌘K does almost anything", body: "Jump to a service, rotate a password, roll back a deploy. Press ⌘K from any screen." },
]
const tourSubs = new Set<() => void>()
let tourStep = -1
const setStep = (n: number) => {
  tourStep = n
  tourSubs.forEach((f) => f())
}
export function startTour() {
  setStep(0)
}

export function TourHost() {
  const step = React.useSyncExternalStore(
    (cb) => {
      tourSubs.add(cb)
      return () => {
        tourSubs.delete(cb)
      }
    },
    () => tourStep,
    () => -1,
  )
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const s = STEPS[step]

  // Measure the anchor; skip steps whose anchor isn't on this layout.
  React.useEffect(() => {
    if (step < 0) return
    const measure = () => {
      const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`)
      if (!el) {
        if (step < STEPS.length - 1) setStep(step + 1)
        else setStep(-1)
        return
      }
      setRect(el.getBoundingClientRect())
    }
    const raf = requestAnimationFrame(measure)
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
    }
  }, [step])

  React.useEffect(() => {
    if (step < 0) return
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStep(-1)
      if (e.key === "ArrowRight") setStep(step < STEPS.length - 1 ? step + 1 : -1)
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1)
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [step])

  const finish = () => {
    setStep(-1)
    toast.success("You're all set", { description: "Replay the tour any time from the avatar menu → What's new" })
  }

  if (step < 0 || !s || !rect) return null
  const pad = 6
  const cardW = 320
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 16)
  const top = rect.bottom + pad + 14
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <motion.div
        className="pointer-events-none absolute rounded-[10px] ring-2 ring-primary"
        initial={false}
        animate={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
        transition={{ duration: 0.35, ease }}
        style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)" }}
      />
      <div className="absolute inset-0" onClick={() => setStep(-1)} />
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease, delay: 0.1 }}
        className="absolute rounded-[14px] border border-line-3 bg-surface p-4 shadow-2xl"
        style={{ left, top, width: cardW }}
      >
        <div className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-primary uppercase">
          Step {step + 1} of {STEPS.length}
        </div>
        <div className="text-[15px] font-semibold text-foreground">{s.title}</div>
        <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-4 bg-primary" : "w-1.5 bg-line-3")} />
            ))}
          </div>
          <div className="flex gap-1.5">
            <Btn size="sm" variant="ghost" onClick={() => setStep(-1)}>
              Skip
            </Btn>
            {step > 0 && (
              <Btn size="sm" variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Btn>
            )}
            <Btn size="sm" variant="primary" onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}>
              {step < STEPS.length - 1 ? "Next" : "Done"}
            </Btn>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
