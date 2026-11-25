"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ArrowRight, Check, FileUp, KeyRound, Loader2, Plus, Search, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { SecretsCanvas, ViewSwitch, useModuleView } from "@/components/screens/platform-canvas"
import { secretProjects } from "@/lib/data"
import { classicSecrets, compareRows, inheritedKeys, qaCurrent, readsPerDay, sampleEnv, type CompareCell } from "@/lib/data-ext/network-secrets"
import { Btn, Stagger, StaggerItem, StatusDot, ease } from "@/components/idp/kit"
import { FilterTabs, Frame, TableCard, Th, VaultMark } from "../network/ui"
import { SecretsCrumbs, useProject } from "./editor"
import { logEntry, nowHHMM, useAccessLog } from "./store"
import { NewVaultProjectModal } from "./vault-dialogs"

/* ---------------- C4c / canvas list ---------------- */

/** New Vault project sheet → lands in the new project's editor, ready for its first key. */
function NewProject({ open, onClose }: { open: boolean; onClose: () => void }) {
  const href = useHref()
  const router = useRouter()
  return (
    <NewVaultProjectModal
      open={open}
      onClose={onClose}
      onCreate={(p) => {
        onClose()
        toast.success(`secret/${p.ns}/${p.name} created`, { description: `${p.envs.join(" · ")} configs · inherits ${p.inherit.length ? p.inherit.join(", ") : "nothing"}` })
        router.push(href(`/secrets/${p.name}?edit=none&new=1`))
      }}
    />
  )
}

export function SecretsIndex() {
  const mode = useMode()
  const [mv, setMv] = useModuleView("secrets")
  if (mv === "canvas") return <SecretsCanvas onView={setMv} />
  if (mode === "classic") return <ClassicSecrets onView={setMv} />
  return <CanvasSecretsList onView={setMv} />
}

function CanvasSecretsList({ onView }: { onView: (v: "list" | "canvas") => void }) {
  const href = useHref()
  const [creating, setCreating] = React.useState(false)
  const [q, setQ] = React.useState("")
  const list = secretProjects.filter((p) => p.name.includes(q.toLowerCase()))
  return (
    <Frame>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3.5">
          <VaultMark className="mt-1.5" />
          <div>
            <h1 className="text-[20px] leading-7 font-semibold text-foreground">Secrets</h1>
            <p className="text-sm text-muted-foreground">vault · secret/commerce · {secretProjects.length} projects · 58 keys</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ViewSwitch view="list" onChange={onView} module="secrets" className="h-9" />
          <Btn variant="secondary" href={href("/secrets/order-service/compare")}>
            Compare envs
          </Btn>
          <Btn variant="secondary" href={href("/secrets/order-service/tree")}>
            Inheritance
          </Btn>
          <Btn variant="primary" onClick={() => setCreating(true)}>
            <Plus /> New project
          </Btn>
          <NewProject open={creating} onClose={() => setCreating(false)} />
        </div>
      </div>
      <div className="mt-5 mb-4 flex h-8.5 w-80 items-center gap-2 rounded-[9px] border border-line-3 px-3">
        <Search className="size-3.5 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter projects…" className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle" />
      </div>
      <Stagger className="grid grid-cols-3 gap-3">
        {list.map((p) => {
          const slug = p.name.replace(/^[a-z]+-/, "")
          return (
            <StaggerItem key={p.name}>
              <Link href={href(`/secrets/${slug}`)} className="group card-gloss flex flex-col gap-3 rounded-[16px] border border-line-2 p-4 transition-colors hover:border-line-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-[13px] text-foreground">
                    <KeyRound className="size-3.5 text-subtle" /> {slug}
                  </span>
                  <ArrowRight className="size-3.5 -translate-x-1 text-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <div className="text-[12px] text-subtle">secret/{p.tags[0]}/{slug}</div>
                <div className="flex gap-4 text-[12.5px] text-muted-foreground">
                  <span>{p.keys} keys</span>
                  <span>{p.configs} envs</span>
                  <span>updated {p.updated}</span>
                </div>
                {slug === "order-service" && <span className="text-[11.5px] text-warning">SecretID expires in 3d</span>}
              </Link>
            </StaggerItem>
          )
        })}
      </Stagger>
    </Frame>
  )
}

function ClassicSecrets({ onView }: { onView: (v: "list" | "canvas") => void }) {
  const href = useHref()
  const [creating, setCreating] = React.useState(false)
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const rows = classicSecrets.filter((r) => r.key.toLowerCase().includes(q.toLowerCase()))
  return (
    <Frame crumbs={<SecretsCrumbs project="order-service" />}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Secrets</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">vault · secret/commerce/order-service/prod · 11 keys</p>
        </div>
        <div className="flex gap-2">
          <ViewSwitch view="list" onChange={onView} module="secrets" className="h-9" />
          <Btn variant="secondary" href={href("/secrets/order-service/compare")}>
            Compare envs
          </Btn>
          <Btn variant="secondary" href={href("/secrets/order-service/upload")}>
            Upload .env
          </Btn>
          <Btn variant="primary" onClick={() => setCreating(true)}>
            <Plus /> New project
          </Btn>
          <NewProject open={creating} onClose={() => setCreating(false)} />
        </div>
      </div>
      <div className="mt-5 mb-5 flex h-8.5 w-80 items-center gap-2 rounded-[8px] border border-line-3 px-3">
        <Search className="size-3.5 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter keys…" className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle" />
      </div>
      <TableCard>
        <div className="grid h-10 grid-cols-[1.3fr_1fr_0.9fr_0.4fr_0.4fr] items-center border-b border-line px-4">
          <Th>Key</Th>
          <Th>Value</Th>
          <Th>Source</Th>
          <Th>Version</Th>
          <Th>Updated</Th>
        </div>
        <Stagger>
          {rows.map((r) => (
            <StaggerItem key={r.key}>
              <button
                onClick={() => router.push(href(`/secrets/order-service/versions?key=${r.key}`))}
                className="grid h-12 w-full grid-cols-[1.3fr_1fr_0.9fr_0.4fr_0.4fr] items-center border-b border-line px-4 text-left text-[13px] transition-colors last:border-0 hover:bg-surface-2/60"
              >
                <span className="font-mono text-[12.5px] text-foreground">{r.key}</span>
                <span className="truncate pr-4 font-mono text-[12.5px] text-muted-foreground">{r.value}</span>
                <span>
                  {r.source === "inherited" ? (
                    <span className="text-info">inherited · commerce</span>
                  ) : r.source === "expires" ? (
                    <span className="flex items-center gap-1.5 text-warning">
                      <StatusDot health="warn" className="size-2" /> Expires in 3d
                    </span>
                  ) : (
                    <span className="text-foreground">{r.source}</span>
                  )}
                </span>
                <span className="text-foreground">{r.version}</span>
                <span className="text-foreground">{r.updated}</span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
        {rows.length === 0 && <div className="px-4 py-10 text-center text-sm text-subtle">No keys match “{q}”.</div>}
      </TableCard>
    </Frame>
  )
}

/* ---------------- 14c compare ---------------- */

function Hash({ c, onFix }: { c: CompareCell; onFix?: () => void }) {
  if (c.tone === "missing")
    return (
      <button onClick={onFix} className="rounded-[5px] border border-dashed border-destructive/80 px-2 py-0.5 text-[11.5px] text-destructive hover:bg-destructive/10">
        missing
      </button>
    )
  if (c.tone === "none") return <span className="flex h-5.5 w-7 items-center justify-center rounded-[5px] border border-dashed border-line-3 text-[11px] text-subtle">—</span>
  return (
    <span className={cn("rounded-[5px] px-2 py-0.5 font-mono text-[11.5px]", c.tone === "warn" ? "border border-warning/40 bg-warning/10 text-warning" : "bg-surface-3 text-muted-foreground")}>{c.v}</span>
  )
}

export function CompareScreen() {
  const project = useProject()
  const [rows, setRows] = React.useState(compareRows)
  const [only, setOnly] = React.useState<"diff" | "all">("diff")
  const [busy, setBusy] = React.useState<string | null>(null)
  const shown = only === "diff" ? rows.filter((r) => r.diff) : rows
  const copy = (key: string) => {
    setBusy(key)
    setTimeout(() => {
      setBusy(null)
      const prev = rows
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, prod: { v: r.qa.v, tone: "same" }, note: "copied just now", noteTone: "muted" } : r)))
      toast.success(`${key} copied qa → prod`, { description: "Staged as v1 · pods restart on next deploy", action: { label: "Undo", onClick: () => setRows(prev) } })
    }, 800)
  }
  return (
    <Frame crumbs={<SecretsCrumbs project={project} tail="Compare" />}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Compare environments</h1>
          <p className="text-sm text-muted-foreground">{project} · values hashed, never shown</p>
        </div>
        <FilterTabs
          id="cmp"
          value={only}
          onChange={setOnly}
          options={[
            { value: "diff", label: `Differences only · ${rows.filter((r) => r.diff).length}` },
            { value: "all", label: `All ${rows.length + 4}` },
          ]}
        />
      </div>
      <TableCard className="mt-4">
        <div className="grid h-9 grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center border-b border-line px-4">
          <Th>Key</Th>
          <Th className="text-center">Dev</Th>
          <Th className="text-center">QA</Th>
          <Th className="text-center">Prod</Th>
          <span />
        </div>
        <AnimatePresence initial={false}>
          {shown.map((r) => (
            <motion.div key={r.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="grid h-[53px] grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center border-b border-line px-4 last:border-0">
              <span className="font-mono text-[12.5px] text-foreground">{r.key}</span>
              <span className="flex justify-center">
                <Hash c={r.dev} />
              </span>
              <span className="flex justify-center">
                <Hash c={r.qa} />
              </span>
              <span className="flex justify-center">
                <Hash c={r.prod} onFix={() => copy(r.key)} />
              </span>
              <span className="flex justify-end text-[12.5px]">
                {busy === r.key ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : r.noteTone === "action" ? (
                  <button onClick={() => copy(r.key)} className="rounded px-1.5 py-0.5 text-foreground hover:bg-surface-3">
                    {r.note}
                  </button>
                ) : (
                  <span className={r.noteTone === "warn" ? "text-warning" : "text-subtle"}>{r.note}</span>
                )}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </TableCard>
      <div className="mt-6 flex gap-4 text-[12.5px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 bg-subtle" /> same as previous env
        </span>
        <span className="flex items-center gap-1.5 text-warning">
          <span className="size-2 bg-warning" /> worth a look
        </span>
        <span className="flex items-center gap-1.5 text-destructive">
          <span className="size-2 bg-destructive" /> missing — app may fail
        </span>
      </div>
    </Frame>
  )
}

/* ---------------- 14d upload preview ---------------- */

type Line = { key: string; value: string; kind: "new" | "changed" | "same" | "skip"; from?: string; inherited?: boolean }

function parseEnv(text: string): Line[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      const key = l.slice(0, i).trim()
      const value = l.slice(i + 1).trim()
      if (/^sk_live_|_live_/.test(value)) return { key, value, kind: "skip" as const }
      const cur = qaCurrent[key]
      if (cur === undefined) return { key, value, kind: "new" as const }
      if (cur !== value) return { key, value, from: cur, kind: "changed" as const, inherited: inheritedKeys.includes(key) }
      return { key, value, kind: "same" as const }
    })
}

export function UploadScreen() {
  const project = useProject()
  const href = useHref()
  const router = useRouter()
  const [text, setText] = React.useState<string | null>(sampleEnv)
  const [fileName, setFileName] = React.useState("qa.env")
  const [drag, setDrag] = React.useState(false)
  const lines = React.useMemo(() => (text ? parseEnv(text) : []), [text])
  const [overrides, setChecked] = React.useState<Record<string, boolean>>({})
  const [saving, setSaving] = React.useState(false)
  const checked: Record<string, boolean> = Object.fromEntries(lines.map((l) => [l.key, overrides[l.key] ?? ((l.kind === "new" || l.kind === "changed") && !l.inherited)]))

  const n = (k: Line["kind"]) => lines.filter((l) => l.kind === k).length
  const toSave = lines.filter((l) => checked[l.key] && l.kind !== "same" && l.kind !== "skip").length
  const diffLines = lines.filter((l) => l.kind !== "same")

  const readFile = (f: File) => {
    setFileName(f.name)
    f.text().then(setText)
  }
  const save = () => {
    setSaving(true)
    setTimeout(() => {
      logEntry({ when: nowHHMM(), who: "Alex", kind: "change", verb: `uploaded ${toSave} keys from`, key: fileName, rest: " · qa" })
      toast.success(`${toSave} changes saved to qa`, { description: "pods restart once" })
      router.push(href(`/secrets/${project}?env=qa&edit=none`))
    }, 1000)
  }

  return (
    <Frame crumbs={<SecretsCrumbs project={project} env="qa" tail="Upload .env" />} className="relative">
      <h1 className="text-[20px] font-semibold text-foreground">Upload .env to {project} · qa</h1>
      <p className="text-sm text-muted-foreground">
        {text ? `${fileName} · ${text.split("\n").length} lines · nothing saved until you confirm` : "Drop a .env file or paste its contents"}
      </p>

      {!text ? (
        <motion.label
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files[0]
            if (f) readFile(f)
          }}
          animate={{ scale: drag ? 1.01 : 1 }}
          className={cn("mt-5 flex h-60 cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed text-sm transition-colors", drag ? "border-primary bg-primary/5 text-foreground" : "border-line-3 text-muted-foreground")}
        >
          <FileUp className="size-6" />
          Drop a .env here, click to choose, or paste (⌘V)
          <input type="file" accept=".env,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          <textarea
            onPaste={(e) => {
              setFileName("pasted.env")
              setText(e.clipboardData.getData("text"))
            }}
            placeholder="…or paste here"
            className="h-10 w-80 resize-none rounded-[8px] border border-line-3 bg-page px-3 py-2 font-mono text-[12px] outline-none"
          />
        </motion.label>
      ) : (
        <>
          <Stagger className="mt-5 flex gap-3">
            {[
              { n: `+${n("new")}`, l: "new", c: "text-success" },
              { n: `~${n("changed")}`, l: "changed", c: "text-info" },
              { n: `${n("same")}`, l: "same", c: "text-subtle" },
            ].map((s) => (
              <StaggerItem key={s.l} className="flex items-baseline gap-1.5 rounded-[10px] border border-line-2 bg-surface px-4 py-2.5">
                <span className={cn("text-[18px] font-semibold", s.c)}>{s.n}</span>
                <span className="text-[12.5px] text-muted-foreground">{s.l}</span>
              </StaggerItem>
            ))}
            {n("skip") > 0 && (
              <StaggerItem className="flex items-baseline gap-1.5 rounded-[10px] border border-warning/30 bg-warning/6 px-4 py-2.5">
                <span className="text-[18px] font-semibold text-warning">{n("skip")}</span>
                <span className="text-[12.5px] text-warning">skipped · looks like a prod key</span>
              </StaggerItem>
            )}
            <StaggerItem className="ml-auto self-center">
              <Btn size="sm" variant="ghost" onClick={() => setText(null)}>
                <Upload /> Choose another file
              </Btn>
            </StaggerItem>
          </Stagger>

          <TableCard className="mt-4">
            <Stagger>
              {diffLines.map((l) => {
                const on = !!checked[l.key]
                const disabled = l.kind === "skip"
                return (
                  <StaggerItem key={l.key}>
                    <div className={cn("grid h-[39px] grid-cols-[28px_20px_260px_1fr] items-center border-b border-line px-4 text-[12.5px] last:border-0", disabled && "bg-warning/5", !on && !disabled && "opacity-70")}>
                      <button
                        disabled={disabled}
                        role="checkbox"
                        aria-checked={on}
                        aria-label={l.key}
                        onClick={() => setChecked((c) => ({ ...c, [l.key]: !on }))}
                        className={cn("flex size-4 items-center justify-center rounded-[4px] border transition-colors", on ? "border-foreground bg-foreground text-page" : "border-line-3", disabled && "opacity-50")}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </button>
                      <span className={cn("font-mono", l.kind === "new" ? "text-success" : l.kind === "changed" ? "text-info" : "text-warning")}>{l.kind === "new" ? "+" : l.kind === "changed" ? "~" : "!"}</span>
                      <span className="font-mono text-foreground">{l.key}</span>
                      <span className="flex items-center gap-2 font-mono text-muted-foreground">
                        {l.kind === "skip" ? (
                          <span className="font-sans text-[11.5px] text-warning">{l.value.slice(0, 8)}… in a qa file — skipped for safety</span>
                        ) : l.kind === "changed" ? (
                          l.inherited ? (
                            <>
                              ••• <ArrowRight className="size-3" /> ••• <span className="font-sans text-[11.5px] text-warning">{on ? "will override shared" : "unchecked · inherited from shared"}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-destructive">{l.from}</span> <ArrowRight className="size-3" /> <span className="text-success">{l.value}</span>
                            </>
                          )
                        ) : /URL|KEY|SECRET|PASSWORD/.test(l.key) && l.key !== "EXPORT_BUCKET" ? (
                          "••••••••"
                        ) : (
                          l.value
                        )}
                      </span>
                    </div>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </TableCard>
          <div className="flex-1" />
          <div className="sticky bottom-6 mt-8 flex items-center justify-between rounded-[14px] border border-line-2 bg-surface px-4 py-3">
            <span className="text-sm text-foreground">
              {toSave} change{toSave === 1 ? "" : "s"} will be saved to qa · pods restart once
            </span>
            <div className="flex gap-2">
              <Btn variant="secondary" href={href(`/secrets/${project}`)}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={save} disabled={!toSave || saving}>
                {saving && <Loader2 className="animate-spin" />}
                Save {toSave} changes
              </Btn>
            </div>
          </div>
        </>
      )}
    </Frame>
  )
}

/* ---------------- 14e access log + reveal ---------------- */

export function AccessLogScreen() {
  const project = useProject()
  const log = useAccessLog()
  const [f, setF] = React.useState<"all" | "reveal" | "change" | "service">("all")
  const [ask, setAsk] = React.useState(true)
  const [reason, setReason] = React.useState("debug webhook 401")
  const [secs, setSecs] = React.useState(0)
  const [hover, setHover] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (!secs) return
    const t = setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs])
  const max = Math.max(...readsPerDay)
  const shown = log.filter((l) => f === "all" || l.kind === f)
  const reveal = () => {
    logEntry({ when: nowHHMM(), who: "Alex", kind: "reveal", verb: "revealed", key: "STRIPE_SECRET_KEY", rest: reason ? ` · "${reason}"` : " · no reason given" })
    setAsk(false)
    setSecs(30)
  }

  return (
    <Frame crumbs={<SecretsCrumbs project={project} tail="Access log" />} className="relative">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Secret access log</h1>
          <p className="text-sm text-muted-foreground">{project} · prod · every read, reveal and change</p>
        </div>
        <div className="flex items-center gap-3">
          <FilterTabs
            id="log"
            value={f}
            onChange={setF}
            options={[
              { value: "all", label: "All" },
              { value: "reveal", label: `Reveals · ${log.filter((l) => l.kind === "reveal").length}` },
              { value: "change", label: `Changes · ${log.filter((l) => l.kind === "change").length + 3}` },
              { value: "service", label: "Service reads" },
            ]}
          />
          <Btn size="sm" variant="secondary" onClick={() => setAsk(true)}>
            Reveal a key…
          </Btn>
        </div>
      </div>

      <div className="mt-4 rounded-[14px] border border-line-2 bg-surface p-4">
        <div className="flex justify-between text-[13px]">
          <span className="font-medium text-foreground">Reads per day · 14d</span>
          <span className="text-subtle">{hover !== null ? `Nov ${9 + hover} · ${readsPerDay[hover]} reads` : "humans vs services"}</span>
        </div>
        <div className="mt-4 flex h-16 items-end gap-1.5" onMouseLeave={() => setHover(null)}>
          {readsPerDay.map((v, i) => (
            <motion.span
              key={i}
              onMouseEnter={() => setHover(i)}
              initial={{ height: 0 }}
              animate={{ height: `${(v / max) * 100}%` }}
              transition={{ delay: i * 0.03, duration: 0.5, ease }}
              className={cn("flex-1 rounded-[2px] transition-colors", i === 11 ? "bg-foreground" : hover === i ? "bg-subtle" : "bg-surface-3")}
            />
          ))}
        </div>
        <div className="mt-3 text-[11.5px] text-warning">Spike Nov 20 · 3 human reveals of STRIPE_SECRET_KEY</div>
      </div>

      <TableCard className="mt-4">
        <AnimatePresence initial={false}>
          {shown.map((l) => (
            <motion.div
              key={l.id}
              layout
              initial={{ opacity: 0, backgroundColor: "rgba(232,80,2,0.14)" }}
              animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
              transition={{ duration: 0.6 }}
              className="grid h-[42px] grid-cols-[90px_120px_1fr_80px] items-center border-b border-line px-4 text-[13px] last:border-0"
            >
              <span className="text-[12px] text-subtle">{l.when}</span>
              <span className="text-foreground">{l.who}</span>
              <span className="text-muted-foreground">
                {l.verb} {l.key && <code className="font-mono text-[12px] text-foreground">{l.key}</code>}
                {l.rest}
              </span>
              <span className={cn("text-right text-[11px]", l.kind === "reveal" ? "text-warning" : "text-subtle")}>{l.kind === "service" ? "read" : l.kind}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </TableCard>

      <AnimatePresence>
        {secs > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-3 rounded-[12px] border border-warning/30 bg-warning/6 px-4 py-3">
            <code className="flex-1 font-mono text-[12.5px] text-foreground">STRIPE_SECRET_KEY = sk_live_51Hx…Qa9</code>
            <span className="text-[12px] text-warning tabular-nums">hides in {secs}s</span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
              <motion.span className="block h-full bg-warning" animate={{ width: `${(secs / 30) * 100}%` }} transition={{ ease: "linear", duration: 1 }} />
            </span>
            <Btn size="xs" variant="ghost" onClick={() => setSecs(0)}>
              Hide now
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ask && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease }}
            className="absolute top-[340px] right-10 z-20 w-[400px] rounded-[14px] border border-line-3 bg-surface p-4.5 shadow-2xl"
          >
            <div className="text-[15px] font-semibold text-foreground">Reveal STRIPE_SECRET_KEY?</div>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">Shown for 30 seconds, then hidden. Your name and reason are logged and the owner is notified.</p>
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") reveal()
                if (e.key === "Escape") setAsk(false)
              }}
              className="mt-3 h-9 w-full rounded-[9px] border border-foreground/80 bg-page px-3 text-sm text-foreground outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Btn size="sm" variant="secondary" onClick={() => setAsk(false)}>
                Cancel
              </Btn>
              <Btn size="sm" variant="primary" onClick={reveal} disabled={!reason.trim()}>
                Reveal for 30s
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  )
}
