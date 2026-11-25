"use client"

import { PixelGrid, WorkingPill, WorkingText } from "@/components/idp/working"
import { LogViewer, type LogLine } from "@/components/idp/viewers"
import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  Plus,
  CornerDownLeft,
  ArrowLeft,
  Check,
  ChevronDown,
  Boxes,
  Loader,
  CircleCheck,
  CircleDashed,
  TriangleAlert,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { services } from "@/lib/data"
import { templates, projectsList, teamsList, provisionSteps, buildLog } from "@/lib/data-ext/add-resource"
import { Btn, IntegrationLogo, Kbd, ease, useHotkey } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"
import { FlowPanel, HintLine, inputCls } from "@/components/screens/add-resource/parts"

type Step = "pick" | "configure" | "provisioning" | "failed"

export function NewService() {
  const sp = useSearchParams()
  const step = (["pick", "configure", "provisioning", "failed"].includes(sp.get("step") ?? "") ? sp.get("step") : "pick") as Step
  const tpl = sp.get("template") ?? "go-api"
  const name = sp.get("name") ?? "payment-gateway"
  const mode = useMode()
  return (
    <>
      <Backdrop dim={step === "pick" || step === "configure"} mode={mode} name={name} step={step} />
      <AnimatePresence mode="wait">
        {step === "pick" && <Pick key="pick" />}
        {step === "configure" && <Configure key="cfg" tpl={tpl} />}
        {(step === "provisioning" || step === "failed") && <Provision key="prov" name={name} initialFail={step === "failed"} />}
      </AnimatePresence>
    </>
  )
}

/* Current provisioning step, shared from the side panel to the pill under the canvas node. */
type ProvStatus = { label: string; state: "active" | "done" | "failed" }
const provStore = (() => {
  let v: ProvStatus = { label: "", state: "active" }
  const ls = new Set<() => void>()
  return {
    get: () => v,
    set(n: ProvStatus) {
      v = n
      ls.forEach((f) => f())
    },
    subscribe(cb: () => void) {
      ls.add(cb)
      return () => {
        ls.delete(cb)
      }
    },
  }
})()
function GhostPill() {
  const v = React.useSyncExternalStore(provStore.subscribe, provStore.get, provStore.get)
  return (
    <AnimatePresence>
      {v.state === "active" && v.label && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease }}
          className="absolute top-full left-1/2 mt-5 -translate-x-1/2"
        >
          <WorkingPill label={v.label} pattern="rise" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- backdrop: canvas ground or classic services list ---------- */
function Backdrop({ dim, mode, name, step }: { dim: boolean; mode: "canvas" | "classic"; name: string; step: Step }) {
  const content =
    mode === "canvas" ? (
      <div className="dot-grid relative min-h-[calc(100vh-56px)] flex-1">
        {(step === "provisioning" || step === "failed") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease }}
            className={cn(
              "absolute top-[40%] left-[12%] w-60 rounded-[10px] border bg-surface",
              step === "failed" ? "border-destructive/60" : "border-dashed border-info/60",
            )}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
              <Boxes className="size-4 text-foreground" />
              <span className="flex-1 text-[14px] text-foreground">{name}</span>
              <span className="rounded border border-info/50 px-1.5 text-[10px] text-info">NEW</span>
            </div>
            <div id="ghost-status" className="px-3.5 py-2.5 text-xs" />
            <GhostPill />
          </motion.div>
        )}
      </div>
    ) : (
      <ClassicPage crumbs={<span className="text-[15px] font-semibold text-foreground">Services</span>}>
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold text-foreground">Services</h1>
          <p className="text-[13px] text-subtle">36 services in commerce · 3 need attention</p>
        </div>
        <div className="overflow-hidden rounded-[12px] border border-line">
          {services.slice(0, 7).map((s) => (
            <div key={s.id} className="flex h-12 items-center gap-3 border-b border-line px-4 last:border-0">
              <IntegrationLogo name="kubernetes" className="size-3.5" />
              <span className="w-56 font-mono text-[13px] text-foreground">{s.id}</span>
              <span className="text-[13px] text-muted-foreground">{s.owner}</span>
            </div>
          ))}
        </div>
      </ClassicPage>
    )
  return (
    <>
      {content}
      <AnimatePresence>
        {dim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] light:bg-black/25"
          />
        )}
      </AnimatePresence>
    </>
  )
}

function Dialog({ children, width = 680 }: { children: React.ReactNode; width?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-[16vh]">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.25, ease }}
        style={{ width }}
        className="pointer-events-auto overflow-hidden rounded-[14px] border border-line-3 bg-surface shadow-[0_32px_80px_-20px_#000]"
      >
        {children}
      </motion.div>
    </div>
  )
}

function TplIcon({ logo }: { logo: string }) {
  if (logo === "go") return <Boxes className="size-4 text-foreground" />
  return <IntegrationLogo name={logo as never} />
}

/* ================================================================== */
/* 07a · pick a starting point                                         */
/* ================================================================== */
function Pick() {
  const href = useHref()
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [active, setActive] = React.useState(0)
  const isUrl = /^(https?:\/\/|git@)/.test(q)
  const list = isUrl ? templates.filter((t) => t.id === "repo") : templates.filter((t) => (t.name + t.desc).toLowerCase().includes(q.toLowerCase()))
  const choose = (id: string) => router.push(href(`/services/new?step=configure&template=${id}`))
  const close = () => router.push(href("/"))
  return (
    <Dialog>
      <div className="flex h-14 items-center gap-3 border-b border-line px-5">
        {q ? <Search className="size-4 text-muted-foreground" /> : <Plus className="size-4 text-muted-foreground" />}
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((a) => Math.min(list.length - 1, a + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === "Enter" && list[active]) choose(list[active].id)
            else if (e.key === "Escape") close()
          }}
          placeholder="Search templates or paste a repo URL…"
          className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button onClick={close} className="rounded-[5px] border border-line-3 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground hover:text-foreground">
          esc
        </button>
      </div>
      <div className="px-3 pt-4 pb-3">
        <div className="px-2 pb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {isUrl ? "Import" : "Start from"}
        </div>
        {list.length === 0 && <p className="px-2 py-6 text-center text-[13px] text-subtle">No template matches “{q}”.</p>}
        {list.map((t, i) => (
          <button
            key={t.id}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(t.id)}
            className={cn("relative flex h-14 w-full items-center gap-3 rounded-[8px] px-2 text-left transition-colors", i === active && "bg-surface-2")}
          >
            {i === active && <motion.span layoutId="tpl-active" className="absolute inset-0 rounded-[8px] bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative flex size-8 items-center justify-center rounded-[7px] border border-line-2 bg-page">
              <TplIcon logo={t.logo} />
            </span>
            <span className="relative flex flex-1 flex-col">
              <span className="text-[13.5px] text-foreground">{isUrl ? `Import ${q.replace(/^https?:\/\//, "")}` : t.name}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </span>
            {i === active ? <CornerDownLeft className="relative size-3 text-muted-foreground" /> : t.used ? <span className="relative text-xs text-muted-foreground">Used {t.used}×</span> : null}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted-foreground">
        <span>↑↓ to move · ↵ to choose</span>
        <span>Step 1 of 2</span>
      </div>
    </Dialog>
  )
}

/* ================================================================== */
/* 07b · configure                                                     */
/* ================================================================== */
function Configure({ tpl }: { tpl: string }) {
  const href = useHref()
  const router = useRouter()
  const t = templates.find((x) => x.id === tpl) ?? templates[1]
  const [name, setName] = React.useState("payment-gateway")
  const [project, setProject] = React.useState("commerce")
  const [team, setTeam] = React.useState("team-payments")
  const [envs, setEnvs] = React.useState({ dev: true, qa: true })
  const [busy, setBusy] = React.useState(false)
  const taken = services.some((s) => s.id === name)
  const err = !name
    ? "Name is required"
    : !/^[a-z][a-z0-9-]{2,39}$/.test(name)
      ? "3–40 chars · lowercase letters, digits and -"
      : name.endsWith("-")
        ? "Can’t end with -"
        : taken
          ? `${name} already exists in ${project}`
          : null
  const chan = team.replace("team-", "#")
  const gets = ["GitLab repo", "CI pipeline", "Argo CD app", "Vault path", "Grafana dashboard", `Alerts to ${chan}`]
  if (tpl === "kafka-consumer") gets.splice(4, 0, "Kafka topic + group")
  if (tpl === "api-postgres") gets.splice(4, 0, "Postgres DB + user")

  const create = () => {
    if (err) {
      toast.error(err)
      return
    }
    setBusy(true)
    setTimeout(() => router.push(href(`/services/new?step=provisioning&name=${name}`)), 600)
  }
  useHotkey("enter", create, { meta: true })

  return (
    <Dialog width={600}>
      <div className="flex h-14 items-center gap-3 border-b border-line px-5">
        <button onClick={() => router.push(href("/services/new?step=pick"))} aria-label="Back" className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </button>
        <TplIcon logo={t.logo} />
        <span className="flex-1 text-[15px] font-medium text-foreground">{t.name}</span>
        <span className="text-xs text-muted-foreground">Step 2 of 2</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
        className="flex flex-col gap-5 px-5 py-6"
      >
        <div>
          <div className="pb-2 text-[13px] text-foreground">Name</div>
          <label className={cn("flex h-10 items-center rounded-[8px] border bg-page px-3", err ? "border-destructive/70" : "border-foreground/80")}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, "-"))} className="flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none" />
            {!err && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-success">
                <Check className="size-3" /> available
              </motion.span>
            )}
          </label>
          <HintLine hint={err ? { tone: "err", text: err } : null} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Project" value={project} onChange={setProject} options={projectsList} />
          <SelectField label="Owner team" value={team} onChange={setTeam} options={teamsList} />
        </div>
        <div>
          <div className="pb-2 text-[13px] text-foreground">Environments</div>
          <div className="flex gap-2">
            {(["dev", "qa"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEnvs((v) => (v[e] && Object.values(v).filter(Boolean).length === 1 ? v : { ...v, [e]: !v[e] }))}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-[7px] border px-3 text-[13px] transition-colors",
                  envs[e] ? "border-foreground/80 text-foreground" : "border-line-3 text-subtle hover:text-muted-foreground",
                )}
              >
                {envs[e] && <Check className="size-3" />}
                {e}
              </button>
            ))}
            <button
              type="button"
              onClick={() => toast("Prod is added after your first QA sign-off")}
              className="flex h-8 items-center rounded-[7px] border border-line-3 px-3 text-[13px] text-subtle"
              title="Prod comes after QA sign-off"
            >
              prod · later
            </button>
          </div>
        </div>
        <div className="rounded-[10px] border border-line bg-page/40 px-4 py-3.5">
          <div className="pb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">You’ll get</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {gets.map((g) => (
              <span key={g} className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <Check className="size-3" /> {g}
              </span>
            ))}
          </div>
        </div>
        <button type="submit" hidden />
      </form>
      <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
        <span className="text-[13px] text-muted-foreground">Defaults are editable later in Settings</span>
        <Btn variant="primary" onClick={create} disabled={!!err || busy}>
          {busy && <Loader className="animate-spin" />}
          Create service
        </Btn>
      </div>
    </Dialog>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <div className="pb-2 text-[13px] text-foreground">{label}</div>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "h-10 appearance-none border-line-3 bg-page font-sans")}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}

/* ================================================================== */
/* 07c / 07d · provisioning + failed/retry                             */
/* ================================================================== */
function failedBuildLog(name: string): LogLine[] {
  const L = (t: string, text: string, level?: LogLine["level"]): LogLine => ({ t, text, level })
  return [
    L("00:00", "Running with gitlab-runner 17.4.0 on makro-runner-07", "step"),
    L("00:00", `Preparing environment for ${name} · job #4471`),
    L("00:02", "Fetching changes with git depth set to 20…"),
    L("00:03", "Checking out 9f2c1ab0 as detached HEAD (ref is main)"),
    L("00:04", "$ docker buildx build --platform linux/amd64 .", "step"),
    L("00:05", "#1 [internal] load build definition from Dockerfile"),
    L("00:05", "#2 [internal] load metadata for golang:1.23-alpine"),
    L("00:07", "#5 [build 1/5] FROM golang:1.23-alpine"),
    L("00:08", "#6 [build 2/5] COPY go.mod go.sum ./"),
    L("00:08", "#7 [build 3/5] go mod download", "step"),
    L("00:09", "go: downloading github.com/makro/platform-go v2.8.0"),
    L("00:10", "go: downloading github.com/jackc/pgx/v5 v5.6.0"),
    L("00:11", "go: downloading github.com/makro/payments-sdk v1.4.0"),
    L("00:12", "go: github.com/makro/payments-sdk@v1.4.0: verifying module: checksum mismatch", "warn"),
    L("00:12", "        downloaded: h1:Qm9wX…3kA=", "warn"),
    L("00:12", "        go.sum:     h1:7aZ2c…9fQ=", "warn"),
    L("00:13", "SECURITY ERROR: this download does NOT match an earlier download recorded in go.sum.", "error"),
    L("00:13", '#7 ERROR: process "go mod download" did not complete successfully: exit code: 1', "error"),
    L("00:13", "ERROR: failed to solve: exit code: 1", "error"),
    L("00:14", "Cleaning up project directory and file based variables"),
    L("00:14", "ERROR: Job failed: exit code 1", "error"),
    L("00:14", "Hint: payments-sdk v1.4.0 was re-tagged upstream. Run `go get github.com/makro/payments-sdk@v1.4.1` and commit go.sum, then retry.", "warn"),
  ]
}

const FAIL_AT = 3 // "First build · dev"

function Provision({ name, initialFail }: { name: string; initialFail: boolean }) {
  const href = useHref()
  const router = useRouter()
  const [at, setAt] = React.useState(initialFail ? FAIL_AT : 0)
  const [failed, setFailed] = React.useState(initialFail)
  const [elapsed, setElapsed] = React.useState(0)
  const [logN, setLogN] = React.useState(2)
  const [logOpen, setLogOpen] = React.useState(false)
  const total = provisionSteps.length
  const done = at >= total

  // advance through steps
  React.useEffect(() => {
    if (failed || done) return
    const dur = at === FAIL_AT ? 4200 : 1300
    const t = setTimeout(() => {
      setAt((a) => a + 1)
      setElapsed(0)
      if (at + 1 === total) toast.success(`${name} is live in dev`, { description: "Argo CD synced · dashboard and alerts ready." })
    }, dur)
    return () => clearTimeout(t)
  }, [at, failed, done, name, total])
  // ticking seconds + log for the active step
  React.useEffect(() => {
    if (failed || done) return
    const t = setInterval(() => {
      setElapsed((e) => e + 1)
      setLogN((n) => Math.min(buildLog.length, n + 1))
    }, 700)
    return () => clearInterval(t)
  }, [failed, done])

  // keep the ghost node on the canvas in sync
  React.useEffect(() => {
    const el = document.getElementById("ghost-status")
    if (!el) return
    el.className = cn("px-3.5 py-2.5 text-xs", failed ? "text-destructive" : done ? "text-success" : "text-info")
    el.textContent = failed ? "Build failed · retry available" : done ? "Live · dev" : `Setting up · ${Math.min(at + 1, total)}/${total}`
    provStore.set({ label: done || failed ? "" : `${provisionSteps[at].label}…`, state: failed ? "failed" : done ? "done" : "active" })
  }, [at, failed, done, total])

  const retry = () => {
    setFailed(false)
    setElapsed(0)
    setLogN(2)
    toast("Retrying from step 4 on a fresh runner")
    router.replace(href(`/services/new?step=provisioning&name=${name}`), { scroll: false })
  }

  const pct = done ? 100 : ((at + (failed ? 0 : 0.5)) / total) * 100

  return (
    <FlowPanel top="bar">
      <div className="border-b border-line px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          {failed ? (
            <TriangleAlert className="size-4 text-destructive" />
          ) : done ? (
            <CircleCheck className="size-4 text-success" />
          ) : (
            <PixelGrid pattern="rise" size={5} cell={2.6} />
          )}
          <span className="text-[15px] font-semibold text-foreground">{name}</span>
        </div>
        <p className={cn("pt-1 text-xs", failed ? "text-destructive" : "text-muted-foreground")}>
          {failed
            ? `Stopped at step ${FAIL_AT + 1} of ${total} · nothing was deployed`
            : done
              ? `Ready · ${total} of ${total} steps done`
              : <WorkingText>{`Setting up · step ${at + 1} of ${total} · about ${Math.max(1, total - at - 2)} min left`}</WorkingText>}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className={cn("h-full rounded-full", failed ? "bg-destructive" : done ? "bg-success" : "bg-info")}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease }}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-4">
        {provisionSteps.map((s, i) => {
          const state = i < at ? "done" : i === at && !done ? (failed ? "fail" : "active") : "todo"
          return (
            <motion.div key={s.id} layout className="flex h-9 items-center gap-2.5 text-[13px]">
              {state === "done" && (
                <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                  <CircleCheck className="size-4 text-muted-foreground" />
                </motion.span>
              )}
              {state === "active" && <PixelGrid pattern="ripple" size={3} cell={3.5} gap={1.5} className="mx-px" />}
              {state === "fail" && <TriangleAlert className="size-4 text-destructive" />}
              {state === "todo" && <CircleDashed className="size-4 text-subtle" />}
              <span className={cn("flex-1", state === "todo" ? "text-subtle" : "text-foreground")}>{state === "active" ? <WorkingText>{s.label}</WorkingText> : s.label}</span>
              <span className={cn("font-mono text-xs", state === "active" ? "text-info" : state === "fail" ? "text-destructive" : "text-subtle")}>
                {state === "done" ? `${s.secs}s` : state === "active" ? `${elapsed}s` : state === "fail" ? "Failed" : ""}
              </span>
            </motion.div>
          )
        })}

        <AnimatePresence mode="wait">
          {failed ? (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-[10px] border border-destructive/40 bg-destructive/6 px-4 py-3.5"
            >
              <p className="text-[13px] font-medium text-foreground">Build runner ran out of quota</p>
              <p className="pt-1.5 text-xs leading-[18px] text-muted-foreground">
                The shared runner pool for commerce is full. Your code is fine. Retry uses a fresh runner.
              </p>
              <p className="pt-2 font-mono text-[11px] text-destructive">ERROR: no runners available (quota 20/20)</p>
            </motion.div>
          ) : (
            at === FAIL_AT && (
              <motion.pre
                key="log"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-[10px] border border-line bg-surface px-3.5 py-3 font-mono text-[11px] leading-[18px] text-muted-foreground"
              >
                {buildLog.slice(Math.max(0, logN - 3), logN).map((l) => (
                  <motion.div key={l} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}>
                    {l}
                  </motion.div>
                ))}
              </motion.pre>
            )
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
        {failed ? (
          <div className="flex justify-end gap-2.5">
            <Btn variant="secondary" onClick={() => setLogOpen(true)}>
              View full log
            </Btn>
            <LogViewer
              open={logOpen}
              onClose={() => setLogOpen(false)}
              title={`${name} · first build`}
              sub={`gitlab.makro/commerce/${name}/-/jobs/4471 · step ${FAIL_AT + 1} of ${total}`}
              lines={failedBuildLog(name)}
              status={{ tone: "fail", label: "Failed · exit code 1" }}
              fileName={`${name}-job-4471.log`}
              streaming
            />
            <Btn variant="primary" onClick={retry}>
              Retry from step {FAIL_AT + 1}
            </Btn>
          </div>
        ) : done ? (
          <div className="flex gap-2.5">
            <Btn variant="secondary" className="flex-1" href={href("/")}>
              Close
            </Btn>
            <Btn variant="primary" className="flex-1" href={href("/services/order-service")}>
              Open service
            </Btn>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-subtle">You can close this. We’ll notify you in Inbox when it’s live.</span>
            <Kbd>esc</Kbd>
          </div>
        )}
      </div>
    </FlowPanel>
  )
}
