"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Waypoints, Check, ChevronDown, Loader, Plus, RotateCw, Search, Trash2, TriangleAlert, X, Network, CircleCheck } from "lucide-react"
import { ReactFlow, Background, Handle, Position, type Edge, type Node, type NodeTypes } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { CodeViewer, type CodeFile } from "@/components/idp/viewers"
import { InfraCanvas, ViewSwitch, useModuleView } from "@/components/screens/platform-canvas"
import { Btn, EnvChip, FadeIn, IntegrationLogo, Stagger, StaggerItem, StatusDot, StatusPill, ease, useHotkey } from "@/components/idp/kit"
import {
  getStack,
  infraStacks,
  planDiff,
  resourceCatalog,
  rollout,
  stackCost,
  stackOutputs,
  stackResources,
  stackUpdates,
} from "@/lib/data-ext/infra-projects"
import { Card, CountUp, Crumbs, Field, Screen, Seg, TH, inputCls } from "./ui"
import { TypeToConfirm } from "../projects/projects"

const STATE = {
  sync: { cls: "text-success", h: "ok" as const, label: "In sync" },
  drift: { cls: "text-warning", h: "warn" as const, label: "Drifted" },
  error: { cls: "text-destructive", h: "fail" as const, label: "Error" },
}

function useQ() {
  const router = useRouter()
  const sp = useSearchParams()
  return [
    sp,
    (k: string, v: string | null) => {
      const n = new URLSearchParams(sp.toString())
      if (v === null) n.delete(k)
      else n.set(k, v)
      const s = n.toString()
      router.replace(s ? `?${s}` : "?", { scroll: false })
    },
  ] as const
}

/* ---------------- 12a stacks / 16g requests ---------------- */
export function InfraHome() {
  const mode = useMode()
  const [mv, setMv] = useModuleView("infra")
  if (mode === "classic") return <ClassicInfra />
  if (mv === "canvas") return <InfraCanvas onView={setMv} />
  return <CanvasInfra />
}
function CanvasInfra() {
  const href = useHref()
  const router = useRouter()
  const [sp, setQ] = useQ()
  const tab = sp.get("tab") === "requests" ? "requests" : "stacks"
  const [, setMv] = useModuleView("infra")
  useHotkey("n", () => router.push(href("/infra/new")))
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure" }]} />}>
      <FadeIn className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IntegrationLogo name="pulumi" mono className="size-6" />
          <div>
            <h1 className="text-[20px] font-semibold">Infrastructure</h1>
            <p className="text-[14px] text-muted-foreground">{tab === "requests" ? "2 waiting for approval · 1 applying" : "12 stacks · 2 requests waiting · 1 error"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitch view="list" onChange={setMv} module="infra" />
          <Seg
            id="infratab"
            value={tab}
            onChange={(v) => setQ("tab", v === "requests" ? "requests" : null)}
            options={[
              { value: "stacks", label: "Stacks" },
              { value: "requests", label: "Requests · 2" },
            ]}
          />
          <Btn variant="primary" href={href("/infra/new")} kbd="N">New request</Btn>
        </div>
      </FadeIn>
      <AnimatePresence mode="wait">
        {tab === "stacks" ? (
          <motion.div key="s" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }} className="flex flex-col gap-4">
            <Stacks />
          </motion.div>
        ) : (
          <motion.div key="r" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}>
            <Requests />
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  )
}

function Donut() {
  const C = 2 * Math.PI * 30
  const segs = [
    { v: 9, cls: "stroke-foreground" },
    { v: 2, cls: "stroke-warning" },
    { v: 1, cls: "stroke-destructive" },
  ]
  let off = 0
  return (
    <svg viewBox="0 0 72 72" className="size-[72px] -rotate-90">
      {segs.map((s, i) => {
        const len = (s.v / 12) * C
        const el = (
          <motion.circle
            key={i}
            cx="36"
            cy="36"
            r="30"
            fill="none"
            strokeWidth="8"
            className={s.cls}
            strokeDasharray={`${len} ${C}`}
            initial={{ strokeDashoffset: len }}
            animate={{ strokeDashoffset: -off }}
            transition={{ duration: 0.8, ease, delay: i * 0.12 }}
          />
        )
        off += len
        return el
      })}
    </svg>
  )
}

function Bars({ values, h = 12 }: { values: number[]; h?: number }) {
  const max = Math.max(...values)
  return (
    <div className="flex items-end gap-1" style={{ height: h }}>
      {values.map((v, i) => (
        <motion.span
          key={i}
          className={cn("flex-1 rounded-[2px]", i === values.length - 1 ? "bg-foreground" : "bg-surface-3")}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ duration: 0.5, ease, delay: i * 0.05 }}
        />
      ))}
    </div>
  )
}

function Stacks() {
  const href = useHref()
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="relative">
            <Donut />
            <span className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold">12</span>
          </div>
          <div className="flex flex-col gap-1 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="size-2 bg-foreground" />9 in sync</span>
            <span className="flex items-center gap-1.5 text-warning"><span className="size-2 bg-warning" />2 drifted</span>
            <span className="flex items-center gap-1.5 text-destructive"><span className="size-2 bg-destructive" />1 error</span>
          </div>
        </Card>
        <Card className="flex flex-col gap-1.5 p-4">
          <span className="text-[12px] text-muted-foreground">Managed resources</span>
          <span className="text-[22px] font-semibold"><CountUp to={186} /></span>
          <span className="text-[12px] text-muted-foreground">across AWS + Tencent Cloud</span>
        </Card>
        <Card className="flex flex-col gap-1.5 p-4">
          <span className="text-[12px] text-muted-foreground">Monthly cost</span>
          <span className="text-[22px] font-semibold">$<CountUp to={11.8} decimals={1} />k</span>
          <Bars values={[10, 10, 10, 10, 10, 18]} />
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_110px_130px_110px_130px] border-b border-line-2 px-4 py-2.5">
          <TH>Stack</TH><TH>Env</TH><TH>Resources</TH><TH>Last update</TH><TH>Cost / mo</TH><TH className="text-right">State</TH>
        </div>
        <Stagger>
          {infraStacks.map((s) => {
            const st = STATE[s.state]
            return (
              <StaggerItem key={s.id}>
                <Link
                  href={href(`/infra/stacks/${s.id}${s.state === "error" ? "?state=error" : ""}`)}
                  className="grid grid-cols-[1fr_110px_110px_130px_110px_130px] items-center border-b border-line-2 px-4 py-3 text-[14px] transition-colors hover:bg-surface-2"
                >
                  <span className="font-mono text-[13px] text-foreground">{s.name}</span>
                  <span className={s.env === "prod" ? "text-warning" : "text-muted-foreground"}>{s.env}</span>
                  <span className="text-muted-foreground">{s.resources}</span>
                  <span className="text-muted-foreground">{s.updated}</span>
                  <span className="text-muted-foreground">{s.cost}</span>
                  <span className={cn("flex items-center justify-end gap-1.5", st.cls)}>
                    <StatusDot health={st.h} /> {st.label}
                    {s.drift ? ` · ${s.drift}` : ""}
                  </span>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
        <div className="px-4 py-3 text-[13px] text-muted-foreground">+ 8 more stacks</div>
      </Card>
    </>
  )
}

const REQS = [
  { id: "IR-1042", t: "Add exports storage", plan: [["+2", "text-success"], ["~1", "text-info"]], env: "prod", by: "Alex", st: "waiting", sub: "Priya", mine: true, href: "" },
  { id: "IR-1043", t: "Redis for pricing cache", plan: [["+3", "text-success"]], env: "qa", by: "nattaya.k", st: "waiting", sub: "you", mine: false, href: "" },
  { id: "IR-1041", t: "Bigger replenish DB", plan: [["~1", "text-info"]], env: "dev", by: "CI", st: "applying", sub: "3/9", mine: true, href: "?outcome=verifying" },
  { id: "IR-1040", t: "+1 bucket", plan: [["+1", ""]], env: "prod", by: "Alex", st: "applied", sub: "6d", mine: true, href: "?outcome=done" },
  { id: "IR-1037", t: "Public bucket for assets", plan: [["+1", ""]], env: "prod", by: "Sam", st: "rejected", sub: "policy", mine: false, href: "?outcome=rejected" },
]
const REQ_ST: Record<string, { cls: string; icon: React.ReactNode }> = {
  waiting: { cls: "text-warning", icon: <span className="size-2.5 rounded-full border border-warning/70" /> },
  applying: { cls: "text-info", icon: <RotateCw className="size-3 animate-spin" /> },
  applied: { cls: "text-success", icon: <Check className="size-3" /> },
  rejected: { cls: "text-destructive", icon: <X className="size-3" /> },
}

function Requests() {
  const href = useHref()
  const [f, setF] = React.useState("open")
  const rows = REQS.filter((r) =>
    f === "open" ? true : f === "mine" ? r.mine : f === "done" ? r.st === "applied" : r.st === "rejected",
  )
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {[["open", "Open 3"], ["mine", "Mine 2"], ["done", "Done"], ["rejected", "Rejected"]].map(([k, l]) => (
          <button key={k} onClick={() => setF(k)} className={cn("relative rounded-[7px] px-2.5 py-1.5 text-[13px]", f === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {f === k && <motion.span layoutId="reqf" className="absolute inset-0 rounded-[7px] bg-surface-3" transition={{ duration: 0.25, ease }} />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_110px_90px_140px_150px] border-b border-line-2 px-4 py-2.5">
          <TH>ID</TH><TH>Change</TH><TH>Plan</TH><TH>Env</TH><TH>Requester</TH><TH className="text-right">Status</TH>
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r) => {
            const done = r.st === "applied" || r.st === "rejected"
            const st = REQ_ST[r.st]
            return (
              <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link
                  href={href(`/infra/requests/${r.id}${r.href}`)}
                  className={cn("grid grid-cols-[100px_1fr_110px_90px_140px_150px] items-center border-b border-line-2 px-4 py-3 text-[14px] transition-colors hover:bg-surface-2", done && "opacity-60")}
                >
                  <span className="font-mono text-[12px] text-muted-foreground">{r.id}</span>
                  <span className="text-foreground">{r.t}</span>
                  <span className="flex gap-1.5 font-mono text-[12px]">
                    {r.plan.map(([p, c]) => <span key={p} className={done ? "text-muted-foreground" : c}>{p}</span>)}
                  </span>
                  <span className={r.env === "prod" && !done ? "text-warning" : "text-muted-foreground"}>{r.env}</span>
                  <span className="text-muted-foreground">{r.by}</span>
                  <span className={cn("flex items-center justify-end gap-1.5 text-[12px]", st.cls)}>
                    {st.icon} {r.st} · {r.sub}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {rows.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-subtle">Nothing here</div>}
      </Card>
    </div>
  )
}

/* C4a — Classic infrastructure: tabs + stacks table */
const CLASSIC_STACKS = [
  { id: "commerce-order-service", name: "commerce-prod", acct: "aws-prod", n: 48, st: "Up to date", h: "ok" as const, cls: "text-success", up: "2d" },
  { id: "payments-ledger", name: "pricing-qa", acct: "aws-nonprod", n: 21, st: "Applying 3/7", h: "busy" as const, cls: "text-info", up: "now" },
  { id: "supply-chain-replenish", name: "replenish-dev", acct: "aws-nonprod", n: 14, st: "Stalled", h: "fail" as const, cls: "text-destructive", up: "1h", q: "?state=error" },
  { id: "commerce-order-service", name: "search-prod", acct: "aws-prod", n: 33, st: "Drift · 2", h: "warn" as const, cls: "text-warning", up: "5d" },
  { id: "ecommerce-checkout", name: "shared-network", acct: "aws-shared", n: 61, st: "Up to date", h: "ok" as const, cls: "text-success", up: "12d" },
]
export function ClassicInfra() {
  const href = useHref()
  const router = useRouter()
  const [sp, setQ] = useQ()
  const tab = sp.get("tab") ?? "stacks"
  useHotkey("n", () => router.push(href("/infra/new")))
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure" }]} />}>
      <FadeIn className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Infrastructure</h1>
          <p className="text-[13px] text-muted-foreground">
            {tab === "requests" ? "2 waiting for approval · 1 applying" : "22 Pulumi stacks across 4 accounts · 1 stalled"}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn href={href("/infra/stacks/commerce-order-service?view=graph")}><Waypoints /> Stack graph</Btn>
          <Btn variant="primary" href={href("/infra/new")}><Plus /> New request</Btn>
        </div>
      </FadeIn>
      <div className="flex gap-6 border-b border-line-2">
        {[["stacks", "Stacks"], ["requests", "Requests · 4"], ["drift", "Drift"]].map(([k, l]) => (
          <button key={k} onClick={() => setQ("tab", k === "stacks" ? null : k)} className={cn("relative pb-2.5 text-[13px]", tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {l}
            {tab === k && <motion.span layoutId="cinfra" className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
          </button>
        ))}
      </div>
      {tab === "requests" ? (
        <Requests />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr_0.7fr] border-b border-line-2 px-4 py-3">
            <TH>Stack</TH><TH>Account</TH><TH>Resources</TH><TH>Status</TH><TH>Updated</TH>
          </div>
          <Stagger>
            {CLASSIC_STACKS.filter((s) => tab !== "drift" || s.h === "warn").map((s) => (
              <StaggerItem key={s.name}>
                <Link href={href(`/infra/stacks/${s.id}${s.q ?? ""}`)} className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr_0.7fr] items-center border-b border-line-2 px-4 py-3.5 text-[13px] last:border-0 hover:bg-surface-2">
                  <span className="flex items-center gap-2.5 font-mono text-foreground"><IntegrationLogo name="pulumi" className="size-4" />{s.name}</span>
                  <span className="text-muted-foreground">{s.acct}</span>
                  <span className="text-muted-foreground">{s.n}</span>
                  <span className={cn("flex items-center gap-1.5 text-[12px]", s.cls)}><StatusDot health={s.h} />{s.st}</span>
                  <span className="text-muted-foreground">{s.up}</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Card>
      )}
    </Screen>
  )
}

/* ---------------- 12b detail / 12e error / 12f graph ---------------- */
export function StackDetail({ id }: { id: string }) {
  const [sp] = useQ()
  const s = getStack(id)
  if (sp.get("view") === "graph") return <StackGraphPage name={s.state === "error" ? "commerce/order-service" : s.name} />
  if (sp.get("state") === "error" || s.state === "error") return <StackError />
  return <StackDrift s={s} />
}

function StackHeader({ name, env, right }: { name: string; env: React.ReactNode; right: React.ReactNode }) {
  const href = useHref()
  return (
    <FadeIn className="flex items-end justify-between">
      <div className="flex flex-col gap-1">
        <Link href={href("/infra")} className="text-[13px] text-muted-foreground hover:text-foreground">Infrastructure /</Link>
        <div className="flex items-center gap-2.5">
          <h1 className="font-mono text-[22px] font-semibold tracking-[-0.01em]">{name}</h1>
          {env}
        </div>
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </FadeIn>
  )
}

const ProdTag = () => <span className="rounded-[4px] bg-warning/15 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-warning">PROD</span>

function StackDrift({ s }: { s: ReturnType<typeof getStack> }) {
  const href = useHref()
  const [fixing, setFixing] = React.useState(false)
  const [fixed, setFixed] = React.useState(false)
  const [diff, setDiff] = React.useState(false)
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure", href: href("/infra") }, { label: s.name }]} />}>
      <StackHeader
        name={s.name}
        env={s.env === "prod" ? <ProdTag /> : <span className="text-[12px] text-muted-foreground">{s.env}</span>}
        right={
          <>
            <Btn size="sm" variant="ghost" href={href(`/infra/stacks/${s.id}?view=graph`)}><Network /> Graph</Btn>
            <Btn href={href("/infra/new")}>Request change</Btn>
            <Btn
              variant="primary"
              disabled={fixing || fixed}
              onClick={() => {
                setFixing(true)
                setTimeout(() => {
                  setFixing(false)
                  setFixed(true)
                  toast.success("Drift fixed", { description: "pulumi refresh + up · 2 resources reconciled", action: { label: "Undo", onClick: () => setFixed(false) } })
                }, 1400)
              }}
            >
              {fixing ? <><Loader className="animate-spin" /> Fixing…</> : fixed ? <><Check /> In sync</> : "Fix drift"}
            </Btn>
          </>
        }
      />
      <AnimatePresence>
        {!fixed && (
          <motion.div exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-[10px] border border-warning/30 bg-warning/6 text-[14px] text-warning">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2.5">
                <TriangleAlert className="size-4" /> 2 resources changed outside Pulumi · detected 4h ago by nightly refresh
              </span>
              <button className="text-[13px] text-foreground underline underline-offset-2" onClick={() => setDiff((d) => !d)}>{diff ? "Hide diff" : "See diff"}</button>
            </div>
            <AnimatePresence>
              {diff && (
                <motion.pre initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-warning/20 px-4 font-mono text-[12px] leading-5">
                  <div className="py-3">
                    <div className="text-foreground">orders-sg · ingress 5432</div>
                    <div className="text-destructive">- 10.30.0.0/16</div>
                    <div className="text-success">+ 0.0.0.0/0 (console · Nov 23)</div>
                    <div className="mt-2 text-foreground">orders-bucket · versioning</div>
                    <div className="text-destructive">- Enabled</div>
                    <div className="text-success">+ Suspended</div>
                  </div>
                </motion.pre>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid flex-1 grid-cols-[1fr_368px] gap-3">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_220px_80px] border-b border-line-2 px-4 py-2.5">
            <TH>Resource · 18</TH><TH>Type</TH><TH className="text-right">State</TH>
          </div>
          <Stagger>
            {stackResources.map((r) => {
              const drift = r.state === "drifted" && !fixed
              return (
                <StaggerItem key={r.name}>
                  <div className={cn("grid grid-cols-[1fr_220px_80px] items-center border-b border-line-2 px-4 py-3 text-[13px] transition-colors duration-500", drift && "bg-warning/5")}>
                    <span className="font-mono text-foreground">{r.name}</span>
                    <span className="text-muted-foreground">{r.type}</span>
                    <span className={cn("text-right", drift ? "text-warning" : "text-success")}>{drift ? "drifted" : "ok"}</span>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
          <div className="px-4 py-3 text-[13px] text-muted-foreground">+ 13 more</div>
        </Card>
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-2 p-4">
            <span className="text-[14px] text-foreground">Outputs</span>
            {stackOutputs.map((o) => (
              <div key={o.k} className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">{o.k}</span>
                <span className="font-mono text-muted-foreground">{o.v}</span>
              </div>
            ))}
          </Card>
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex justify-between text-[14px]">
              <span>Cost · 6 months</span>
              <span className="text-[13px] text-muted-foreground">{s.cost}/mo</span>
            </div>
            <Bars values={stackCost} h={58} />
          </Card>
          <Card className="flex flex-col gap-2 p-4">
            <span className="text-[14px]">Last updates</span>
            {stackUpdates.map((u) => (
              <Link key={u} href={href(`/infra/requests/${u.slice(0, 7)}?outcome=done`)} className="text-[13px] text-muted-foreground hover:text-foreground">{u}</Link>
            ))}
          </Card>
        </div>
      </div>
    </Screen>
  )
}

function StackError() {
  const href = useHref()
  const router = useRouter()
  const [sp, setQ] = useQ()
  const del = sp.get("delete") === "1"
  const [fix, setFix] = React.useState<string | null>(null)
  const [retrying, setRetrying] = React.useState(false)
  const name = "supply-chain/replenish"
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure", href: href("/infra") }, { label: name }]} />}>
      <StackHeader
        name={name}
        env={<span className="text-[12px] text-muted-foreground">dev</span>}
        right={
          <>
            <Btn onClick={() => toast("pulumi up · run #481", { description: "Streaming logs…" })}>View logs</Btn>
            <Btn
              variant="primary"
              disabled={retrying}
              onClick={() => {
                setRetrying(true)
                setTimeout(() => {
                  setRetrying(false)
                  toast.success("Retry queued", { description: `pulumi up · run #482${fix ? ` · ${fix}` : ""}` })
                }, 1200)
              }}
            >
              {retrying ? <><Loader className="animate-spin" /> Retrying…</> : "Retry update"}
            </Btn>
          </>
        }
      />
      <FadeIn delay={0.05} className="flex flex-col gap-3 rounded-[12px] border border-destructive/30 bg-destructive/6 p-4">
        <div className="flex items-center gap-2.5 text-[14px] font-medium text-foreground">
          <TriangleAlert className="size-4 text-destructive" /> Update failed at 3 of 9 resources · 3h ago
        </div>
        <p className="text-[14px] text-muted-foreground">
          The replenish-db instance class isn&apos;t available in ap-southeast-1b. Nothing was half-applied; the 6 other resources are unchanged.
        </p>
        <pre className="rounded-[8px] border border-line-2 bg-page px-3 py-2.5 font-mono text-[11px] leading-[18px]">
          <div className="text-muted-foreground">tencentcloud:postgres replenish-db</div>
          <div className="text-destructive">error: InvalidParameter.InstanceTypeNotSupported (db.s5.large)</div>
        </pre>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Suggested fix:
          {["db.s5.medium", "ap-southeast-1a"].map((f, i) => (
            <React.Fragment key={f}>
              {i === 1 && <span>or switch zone to</span>}
              <button
                onClick={() => {
                  setFix(f)
                  toast.success(`Fix applied: ${f}`, { description: "Retry update to apply", action: { label: "Undo", onClick: () => setFix(null) } })
                }}
                className={cn("rounded-[6px] border px-2 py-1 font-mono text-[12px] text-foreground transition-colors", fix === f ? "border-success/60 bg-success/10" : "border-line-3 bg-surface-2 hover:border-foreground/40")}
              >
                {fix === f && <Check className="mr-1 inline size-3 text-success" />}
                {f}
              </button>
            </React.Fragment>
          ))}
        </div>
      </FadeIn>
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1.5 p-4">
          <span className="text-[13px] text-muted-foreground">Resources</span>
          <span className="text-[22px] font-semibold"><CountUp to={9} /></span>
          <span className="text-[12px] text-muted-foreground">6 ok · 1 failed · 2 pending</span>
        </Card>
        <Card className="flex flex-col gap-1.5 p-4">
          <span className="text-[13px] text-muted-foreground">Last good state</span>
          <span className="text-[22px] font-semibold">Nov 18</span>
          <span className="text-[12px] text-muted-foreground">
            IR-1029 ·{" "}
            <button className="hover:text-foreground hover:underline" onClick={() => toast("Rollback plan created", { description: "IR-1045 · revert to Nov 18 state" })}>roll back available</button>
          </span>
        </Card>
      </div>
      <div className="flex-1" />
      <Card className="flex items-center justify-between p-4">
        <div>
          <div className="text-[14px] text-foreground">Delete stack</div>
          <div className="text-[13px] text-muted-foreground">Destroys all 9 cloud resources and the state. Type the stack name to confirm. dev only needs you; prod needs a second approver.</div>
        </div>
        <Btn variant="destructive" size="sm" onClick={() => setQ("delete", "1")}><Trash2 /> Delete stack…</Btn>
      </Card>
      <TypeToConfirm
        open={del}
        onClose={() => setQ("delete", null)}
        name={name}
        title={`Delete stack "${name}"?`}
        cta="Delete stack"
        footnote="dev · only needs you"
        body={
          <ul>
            <li>• 9 cloud resources (pulumi destroy)</li>
            <li>• replenish-db · replenish-bucket · 2 queues</li>
            <li>• Stack state and 14 outputs</li>
            <li>• Request history stays in Activity</li>
          </ul>
        }
        onConfirm={() => {
          toast.success(`${name} destroy queued`, { description: "IR-1044 · running pulumi destroy" })
          router.push(href("/infra"))
        }}
      />
    </Screen>
  )
}

/* 12f — stack resources as a dependency graph */
type RData = { type: string; label: string; state?: "ok" | "drifted"; k8s?: boolean; sel?: boolean }
function RNode({ data }: { data: RData }) {
  const drift = data.state === "drifted"
  return (
    <div className={cn("w-[200px] rounded-[8px] border bg-surface px-3.5 py-2.5", drift ? "border-dashed border-warning/80 bg-warning/5" : "border-line-3", data.sel && "shadow-[0_0_0_3px_var(--color-warning)]/20")}>
      <Handle type="target" position={Position.Left} className="!size-1 !min-h-0 !border-0 !bg-transparent" />
      <div className="text-[11px] text-subtle">{data.type}</div>
      <div className="flex items-center gap-2">
        {data.k8s && <IntegrationLogo name="kubernetes" className="size-3.5" />}
        <span className={cn("flex-1 text-[13px] text-foreground", !data.k8s && "font-mono")}>{data.label}</span>
        {data.state && <span className={cn("text-[11px]", drift ? "text-warning" : "text-success")}>{data.state}</span>}
      </div>
      <Handle type="source" position={Position.Right} className="!size-1 !min-h-0 !border-0 !bg-transparent" />
    </div>
  )
}
const rTypes = { r: RNode } as unknown as NodeTypes

function StackGraphPage({ name }: { name: string }) {
  const href = useHref()
  const [, setQ] = useQ()
  const [sel, setSel] = React.useState<string | null>("sg")
  const [fixed, setFixed] = React.useState<Record<string, boolean>>({})
  const drifted = (id: string) => (id === "sg" || id === "bucket") && !fixed[id]
  const R = (id: string, x: number, y: number, d: RData): Node => ({ id, position: { x, y }, type: "r", data: { ...d, state: d.state && (drifted(id) ? "drifted" : "ok"), sel: sel === id } })
  const nodes: Node[] = [
    R("vpc", 100, 390, { type: "aws:ec2/vpc", label: "commerce-vpc" }),
    R("subnet", 420, 230, { type: "aws:ec2/subnet × 2", label: "private-a, b" }),
    R("iam", 420, 550, { type: "aws:iam/role", label: "order-service-task" }),
    R("db", 740, 150, { type: "tencentcloud:postgres", label: "orders-db", state: "ok" }),
    R("sg", 740, 310, { type: "aws:ec2/securityGroup", label: "orders-sg", state: "drifted" }),
    R("redis", 740, 470, { type: "aws:elasticache", label: "orders-redis", state: "ok" }),
    R("bucket", 740, 630, { type: "aws:s3/bucket", label: "orders-bucket", state: "drifted" }),
    R("k8s", 1040, 390, { type: "k8s workload", label: "order-service", k8s: true }),
  ]
  const E = (s: string, t: string): Edge => {
    const d = drifted(t)
    return { id: s + t, source: s, target: t, animated: d, style: d ? { stroke: "var(--color-warning)", strokeDasharray: "4 4", strokeWidth: 1.25 } : { stroke: "var(--color-faint)", strokeWidth: 1.25 } }
  }
  const edges = [E("vpc", "subnet"), E("vpc", "iam"), E("subnet", "db"), E("subnet", "sg"), E("iam", "redis"), E("iam", "bucket"), E("sg", "k8s"), E("redis", "k8s")]
  const count = ["sg", "bucket"].filter(drifted).length
  const pop =
    sel === "sg"
      ? { t: "orders-sg changed outside Pulumi", l: ["ingress 5432", "- 10.30.0.0/16", "+ 0.0.0.0/0 (console · Nov 23)"] }
      : sel === "bucket"
        ? { t: "orders-bucket changed outside Pulumi", l: ["versioning", "- Enabled", "+ Suspended (console · Nov 22)"] }
        : null
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure", href: href("/infra") }, { label: name }]} />} className="gap-0 p-0">
      <div className="dot-grid relative h-[calc(100vh-56px)] min-h-[760px] w-full overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={rTypes}
          onNodeClick={(_, n) => setSel(n.id)}
          onPaneClick={() => setSel(null)}
          defaultViewport={{ x: 0, y: -56, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
        >
          <Background gap={20} size={1} color="transparent" />
        </ReactFlow>
        <div className="absolute inset-x-6 top-6 flex items-center gap-3">
          <Seg id="sgv" value="canvas" onChange={(v) => v === "list" && setQ("view", null)} options={[{ value: "canvas", label: "Canvas" }, { value: "list", label: "List" }]} />
          <IntegrationLogo name="pulumi" mono className="ml-2 size-4" />
          <span className="font-mono text-[15px] font-semibold">{name}</span>
          <ProdTag />
          <AnimatePresence mode="wait">
            <motion.span key={count} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className={cn("text-[12px]", count ? "text-warning" : "text-success")}>
              {count ? `${count} drifted` : "in sync"}
            </motion.span>
          </AnimatePresence>
          <span className="flex-1" />
          <Btn variant="primary" disabled={!count} onClick={() => (setFixed({ sg: true, bucket: true }), toast.success("Drift fixed", { description: "2 resources reverted to code", action: { label: "Undo", onClick: () => setFixed({}) } }))}>
            Fix drift
          </Btn>
        </div>
        <AnimatePresence>
          {pop && drifted(sel!) && (
            <motion.div
              key={sel}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
              className="absolute top-[170px] left-[970px] w-[300px] rounded-[8px] border border-line-3 bg-surface p-3.5 shadow-xl"
            >
              <div className="text-[13px] font-medium">{pop.t}</div>
              <div className="mt-2 font-mono text-[11px] leading-4">
                <div className="text-muted-foreground">{pop.l[0]}</div>
                <div className="text-destructive">{pop.l[1]}</div>
                <div className="text-success">{pop.l[2]}</div>
              </div>
              <div className="mt-2.5 flex gap-3 text-[12px]">
                <button className="underline underline-offset-2" onClick={() => (setFixed((f) => ({ ...f, [sel!]: true })), toast.success("Reverted to code"))}>Revert to code</button>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => (setFixed((f) => ({ ...f, [sel!]: true })), toast("Change accepted", { description: "Pulumi code updated in MR !522" }))}>Accept change</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-[8px] border border-line-3 bg-surface px-3 py-2 text-[11px]">
          <span className="text-muted-foreground">— depends on</span>
          <span className="text-warning">┄ drifted</span>
          <span className="text-muted-foreground">18 resources · 6 shown · grouped by type</span>
        </div>
      </div>
    </Screen>
  )
}

/* ---------------- 12c new request ---------------- */
type Added = { id: string; name: string; lifecycle: string }

/** Pulumi program generated from the picked resources (what the MR will contain). */
function pulumiFiles(added: Added[], env: string): CodeFile[] {
  const v = (s: string) => s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
  const block = (a: Added) => {
    const n = v(a.name)
    switch (a.id) {
      case "s3":
        return [
          `const ${n} = new aws.s3.Bucket("${a.name}", {`,
          `  versioning: { enabled: true },`,
          `  serverSideEncryptionConfiguration: { rule: { applyServerSideEncryptionByDefault: { sseAlgorithm: "aws:kms" } } },`,
          ...(a.lifecycle && a.lifecycle !== "Keep forever" ? [`  lifecycleRules: [{ enabled: true, expiration: { days: ${a.lifecycle.match(/\d+/)?.[0] ?? 30} } }],`] : []),
          `  tags,`,
          `})`,
          `new aws.s3.BucketPublicAccessBlock("${a.name}-private", { bucket: ${n}.id, blockPublicAcls: true, blockPublicPolicy: true })`,
        ]
      case "sqs":
        return [`const ${n} = new aws.sqs.Queue("${a.name}", { messageRetentionSeconds: 1209600, tags })`]
      case "redis":
        return [`const ${n} = new aws.elasticache.Cluster("${a.name}", { engine: "redis", nodeType: "cache.t4g.small", numCacheNodes: 1, tags })`]
      case "pg":
        return [`const ${n} = new tencentcloud.PostgresqlInstance("${a.name}", { engineVersion: "15.4", memory: 4, storage: 100, tags })`]
      case "cdn":
        return [`const ${n} = new aws.cloudfront.Distribution("${a.name}", { enabled: true, /* origins from order-service */ tags } as any)`]
      default:
        return [`const ${n} = new aws.iam.Role("${a.name}", { assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "eks.amazonaws.com" }), tags })`]
    }
  }
  const index = [
    `// commerce/order-service · ${env}`,
    `// Generated by makro IDP from request IR-1042. Edit through the IDP, not by hand.`,
    `import * as pulumi from "@pulumi/pulumi"`,
    `import * as aws from "@pulumi/aws"`,
    ...(added.some((a) => a.id === "pg") ? [`import * as tencentcloud from "@tencentcloud_iac/pulumi"`] : []),
    ``,
    `const cfg = new pulumi.Config()`,
    `const tags = { project: "commerce", service: "order-service", env: "${env}", "managed-by": "makro-idp" }`,
    ``,
    ...added.flatMap((a) => [...block(a), ``]),
    `export const outputs = {`,
    ...added.map((a) => `  ${v(a.name)}: ${v(a.name)}.${a.id === "s3" ? "bucket" : a.id === "sqs" ? "url" : "id"},`),
    `}`,
  ].join("\n")
  const stackYaml = [`# Pulumi.${env}.yaml`, `config:`, `  aws:region: ap-southeast-1`, `  order-service:costCenter: commerce-42`, `  order-service:owner: team-orders`].join("\n")
  return [
    { name: "index.ts", code: index, note: `${added.length} resource${added.length === 1 ? "" : "s"} · reviewed in the merge request before Pulumi runs` },
    { name: `Pulumi.${env}.yaml`, code: stackYaml },
  ]
}
export function InfraNew() {
  const href = useHref()
  const router = useRouter()
  const [env, setEnv] = React.useState("dev")
  const [cat, setCat] = React.useState("All")
  const [q, setQ] = React.useState("")
  const [open, setOpen] = React.useState("s3")
  const [added, setAdded] = React.useState<Added[]>([
    { id: "s3", name: "order-exports", lifecycle: "Delete after 30 days" },
    { id: "sqs", name: "order-exports-dlq", lifecycle: "" },
  ])
  const [codeOpen, setCodeOpen] = React.useState(false)
  const cost = added.reduce((a, r) => a + (resourceCatalog.find((c) => c.id === r.id)?.cost ?? 0), 0)
  const list = resourceCatalog.filter((r) => (cat === "All" || r.cat === cat) && r.name.toLowerCase().includes(q.toLowerCase()))
  const add = (id: string) => {
    if (added.some((a) => a.id === id)) return
    const c = resourceCatalog.find((r) => r.id === id)!
    setAdded((s) => [...s, { id, name: `order-${id}`, lifecycle: "" }])
    setOpen(id)
    toast(`${c.name} added`, { action: { label: "Undo", onClick: () => setAdded((s) => s.filter((a) => a.id !== id)) } })
  }
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure", href: href("/infra") }, { label: "New request" }]} />} className="p-0 gap-0">
      <div className="flex flex-1">
        <div className="flex flex-1 flex-col gap-4 px-10 pt-8 pb-7">
          <FadeIn>
            <h1 className="text-[20px] font-semibold">New infrastructure request</h1>
            <p className="text-[14px] text-muted-foreground">Pick resources, set a few options, we write the Pulumi for you.</p>
          </FadeIn>
          <div className="grid grid-cols-[1fr_200px] gap-3">
            <Field label="Stack">
              <div className={cn(inputCls, "flex items-center justify-between font-mono")}>
                commerce/order-service <ChevronDown className="size-4 text-subtle" />
              </div>
            </Field>
            <Field label="Environment">
              <Seg id="env" value={env} onChange={setEnv} options={["dev", "qa", "prod"].map((e) => ({ value: e, label: e }))} />
            </Field>
          </div>
          <TH>Added · {added.length}</TH>
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {added.map((a) => {
                const c = resourceCatalog.find((r) => r.id === a.id)!
                const isOpen = open === a.id
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn("rounded-[14px] border bg-surface p-4", isOpen ? "border-foreground/70" : "border-line-2")}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-[5px] bg-success/12 px-1.5 py-0.5 text-[11px] text-success">+ create</span>
                      <span className="flex-1 text-[14px]">{isOpen ? c.name : `${c.name} · ${a.name}`}</span>
                      <span className="text-[13px] text-muted-foreground">~${c.cost}/mo</span>
                      {isOpen ? (
                        <button onClick={() => setAdded((s) => s.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                          <X className="size-4" />
                        </button>
                      ) : (
                        <button onClick={() => setOpen(a.id)} className="text-[13px] text-muted-foreground hover:text-foreground">Edit</button>
                      )}
                    </div>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Name">
                            <input value={a.name} onChange={(e) => setAdded((s) => s.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)))} className={cn(inputCls, "font-mono")} />
                          </Field>
                          <Field label="Lifecycle">
                            <select value={a.lifecycle || "Delete after 30 days"} onChange={(e) => setAdded((s) => s.map((x) => (x.id === a.id ? { ...x, lifecycle: e.target.value } : x)))} className={inputCls}>
                              <option>Delete after 30 days</option>
                              <option>Delete after 90 days</option>
                              <option>Keep forever</option>
                            </select>
                          </Field>
                        </div>
                        <div className="flex gap-4 text-[13px] text-muted-foreground">
                          {["Encrypted", "Private", "Versioning"].map((t) => (
                            <span key={t} className="flex items-center gap-1"><Check className="size-3.5" />{t}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {added.length === 0 && <div className="rounded-[14px] border border-dashed border-line-3 p-6 text-center text-[13px] text-subtle">Pick a resource from the right to start</div>}
          </motion.div>
          <div className="flex-1" />
          <Card className="flex items-center gap-4 px-4 py-3">
            <span className="text-[14px]">+{added.length} resources · ~${cost}/mo</span>
            <span className="flex-1 text-[12px] text-muted-foreground">dev auto-applies after plan · prod needs an approver</span>
            <Btn disabled={!added.length} onClick={() => setCodeOpen(true)}>View code</Btn>
            <CodeViewer open={codeOpen} onClose={() => setCodeOpen(false)} title="Generated Pulumi code" sub={`commerce/order-service · ${env} · what the merge request will contain`} files={pulumiFiles(added, env)} />
            <Btn variant="primary" disabled={!added.length} onClick={() => router.push(href("/infra/requests/IR-1042"))}>Preview plan</Btn>
          </Card>
        </div>
        <aside className="flex w-[360px] shrink-0 flex-col border-l border-line-2 bg-surface">
          <div className="flex flex-col gap-3 border-b border-line-2 p-5">
            <span className="text-[14px]">Add a resource</span>
            <div className="flex h-9 items-center gap-2 rounded-[9px] border border-line-3 px-3">
              <Search className="size-3.5 text-subtle" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 40 resource types" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
            </div>
            <div className="flex gap-1">
              {["All", "Storage", "Data", "Network", "Compute"].map((c) => (
                <button key={c} onClick={() => setCat(c)} className={cn("relative rounded-[6px] px-2 py-1 text-[12px]", cat === c ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {cat === c && <motion.span layoutId="cat" className="absolute inset-0 rounded-[6px] bg-surface-3" />}
                  <span className="relative">{c}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 p-2">
            {list.map((r) => {
              const isAdded = added.some((a) => a.id === r.id)
              return (
                <button key={r.id} onClick={() => add(r.id)} className={cn("flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-surface-2", isAdded && "bg-surface-2")}>
                  <span className="flex size-7 items-center justify-center rounded-[6px] border border-line-3 font-mono text-[9px] text-muted-foreground">
                    {r.id === "pg" ? <IntegrationLogo name="postgres" className="size-4" /> : r.tag}
                  </span>
                  <span className="flex-1 leading-tight">
                    <span className="block text-[14px]">{r.name}</span>
                    <span className="text-[11px] text-subtle">{r.sub}</span>
                  </span>
                  {isAdded ? <span className="text-[11px] text-success">added</span> : <Plus className="size-3.5 text-muted-foreground" />}
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </Screen>
  )
}

/* ---------------- 12d plan review + 16h outcomes ---------------- */
export function PlanReview({ id }: { id: string }) {
  const href = useHref()
  const [sp] = useQ()
  const outcome = sp.get("outcome")
  const [phase, setPhase] = React.useState<"review" | "rolling" | "rejected">("review")
  const [step, setStep] = React.useState(0)
  const [comment, setComment] = React.useState("")
  React.useEffect(() => {
    if (phase !== "rolling" || step >= rollout.length) return
    const t = setTimeout(() => setStep((s) => s + 1), 1100)
    return () => clearTimeout(t)
  }, [phase, step])
  useHotkey("a", () => phase === "review" && approve(), { meta: true })
  function approve() {
    setPhase("rolling")
    setStep(0)
    toast.success(`${id} approved`, { description: "MR !521 merging…" })
  }
  if (outcome) return <Outcomes focus={outcome} />
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure", href: href("/infra?tab=requests") }, { label: id }]} />}>
      <FadeIn>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[20px] font-semibold">{id} · Add exports storage</h1>
          <EnvChip env="prod" />
          <AnimatePresence mode="wait">
            <motion.span key={phase + step} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              {phase === "review" ? (
                <span className="rounded-[6px] border border-warning/50 px-2 py-0.5 text-[12px] text-warning">Waiting for you</span>
              ) : phase === "rejected" ? (
                <StatusPill size="sm" status="rejected" />
              ) : (
                <StatusPill size="sm" status={step >= rollout.length ? "live" : "applying"} />
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="text-[14px] text-muted-foreground">commerce/order-service · requested by Alex · 20 min ago</p>
      </FadeIn>
      <div className="grid grid-cols-[1fr_300px_240px] gap-3">
        <Card className="flex items-center gap-8 px-4 py-4">
          {[
            ["+2", "create", "text-success"],
            ["~1", "update", "text-info"],
            ["0", "delete", "text-subtle"],
            ["15", "unchanged", "text-subtle"],
          ].map(([n, l, c]) => (
            <div key={l} className="flex flex-col">
              <span className={cn("text-[22px] font-semibold", c)}>{n}</span>
              <span className="text-[11px] text-muted-foreground">{l}</span>
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-[12px] text-muted-foreground">Cost change</span>
          <span className="text-[22px] font-semibold">
            +$<CountUp to={5} />/mo <span className="text-[12px] font-normal text-muted-foreground">$1,320 → $1,325</span>
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-[12px] text-muted-foreground">Policy checks</span>
          <span className="flex items-center gap-1.5 text-[14px] text-success"><Check className="size-3.5" /> 6 of 6 passed</span>
        </Card>
      </div>
      <AnimatePresence>
        {phase === "rolling" && <Rollout step={step} />}
      </AnimatePresence>
      <Card className="overflow-hidden">
        <div className="flex justify-between border-b border-line-2 px-4 py-2.5">
          <TH>Plan</TH>
          <span className="text-[12px] text-muted-foreground">Unified · Side by side</span>
        </div>
        <Stagger>
          {planDiff.map((d) => (
            <StaggerItem key={d.res}>
              <div className={cn("px-4 py-2.5 font-mono text-[12.5px]", d.op === "+" ? "bg-success/5" : "bg-info/5")}>
                <div className="flex gap-4">
                  <span className={d.op === "+" ? "text-success" : "text-info"}>{d.op}</span>
                  <span className="flex-1 text-foreground">{d.res}</span>
                  <span className="font-sans text-[11px] text-muted-foreground">{d.note}</span>
                </div>
                {d.lines?.map((l) => (
                  <div key={l} className={cn("pl-7", l.startsWith("-") ? "text-destructive" : "text-success")}>{l}</div>
                ))}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        <div className="px-4 py-3 text-[12px] text-muted-foreground">15 unchanged resources hidden</div>
      </Card>
      <div className="flex-1" />
      {phase === "review" && (
        <Card className="flex items-center gap-3 p-4">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" className={cn(inputCls, "flex-1")} />
          <Btn
            variant="destructive"
            onClick={() => {
              setPhase("rejected")
              toast(`${id} rejected`, { description: comment || "Requester notified", action: { label: "Undo", onClick: () => setPhase("review") } })
            }}
          >
            Reject
          </Btn>
          <Btn variant="primary" kbd="⌘A" onClick={approve}>Approve &amp; apply</Btn>
        </Card>
      )}
      {phase === "rejected" && (
        <Card className="flex items-center justify-between border-destructive/30 p-4 text-[13px] text-muted-foreground">
          Rejected · Alex can edit and resubmit.
          <Btn variant="ghost" href={href(`/infra/requests/${id}?outcome=rejected`)}>See outcome</Btn>
        </Card>
      )}
    </Screen>
  )
}

function Rollout({ step }: { step: number }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
      <Card className="flex items-center gap-2 p-4">
        {rollout.map((r, i) => {
          const done = i < step
          const cur = i === step
          return (
            <React.Fragment key={r}>
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ scale: cur ? [1, 1.12, 1] : 1 }}
                  transition={{ repeat: cur ? Infinity : 0, duration: 1.2 }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-[11px]",
                    done ? "border-success bg-success/15 text-success" : cur ? "border-info text-info" : "border-line-3 text-subtle",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : cur ? <Loader className="size-3.5 animate-spin" /> : i + 1}
                </motion.span>
                <span className={cn("text-[13px]", done ? "text-foreground" : cur ? "text-info" : "text-subtle")}>{r}</span>
              </div>
              {i < rollout.length - 1 && (
                <div className="h-px flex-1 bg-line-3">
                  <motion.div className="h-full bg-success" initial={{ width: 0 }} animate={{ width: done ? "100%" : 0 }} transition={{ duration: 0.4, ease }} />
                </div>
              )}
            </React.Fragment>
          )
        })}
        {step >= rollout.length && (
          <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="ml-3 flex items-center gap-1.5 text-[13px] text-success">
            <CircleCheck className="size-4" /> Live · took 4 min
          </motion.span>
        )}
      </Card>
    </motion.div>
  )
}

function Progress({ n, steps, blue }: { n: number; steps?: string[]; blue?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className={cn("h-full", blue && i === 3 ? "bg-info" : "bg-success")}
              initial={{ width: 0 }}
              animate={{ width: i < n ? "100%" : 0 }}
              transition={{ duration: 0.4, ease, delay: 0.1 + i * 0.12 }}
            />
          </div>
        ))}
      </div>
      {steps && (
        <div className="flex justify-between text-[12px]">
          {steps.map((s, i) => (
            <span key={s} className={i < n ? (blue && i === 3 ? "text-info" : "text-success") : "text-muted-foreground"}>{s}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Outcomes({ focus }: { focus: string }) {
  const href = useHref()
  const ring = (k: string) => (focus === k ? "ring-1 ring-primary/40" : "")
  return (
    <Screen crumbs={<Crumbs items={[{ label: "Infrastructure", href: href("/infra?tab=requests") }, { label: "Request outcomes" }]} />}>
      <FadeIn>
        <h1 className="text-[20px] font-semibold">Request outcomes</h1>
        <p className="text-[14px] text-muted-foreground">What a requester sees after submitting · same layout for every module</p>
      </FadeIn>
      <Stagger className="grid grid-cols-2 gap-3">
        <StaggerItem>
          <Card className={cn("flex h-full flex-col gap-3 p-4", ring("approved"))}>
            <div className="flex justify-between"><span className="text-[14px]">TR-001040 · Approved</span><span className="rounded-[5px] bg-success/12 px-2 py-0.5 text-[11px] text-success">approved</span></div>
            <Progress n={2} steps={["Submitted", "Approved", "Applying", "Live"]} />
            <span className="text-[13px] text-muted-foreground">Priya approved 4 min ago · &quot;LGTM, 12 partitions is right&quot;</span>
            <span className="text-[12px] text-subtle">Applies automatically after MR !517 merges · usually 2 min</span>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className={cn("flex h-full flex-col gap-3 p-4", ring("verifying"))}>
            <div className="flex justify-between"><span className="text-[14px]">TR-001037 · Verifying</span><span className="rounded-[5px] bg-info/12 px-2 py-0.5 text-[11px] text-info">verifying</span></div>
            <Progress n={4} blue steps={["Submitted", "Approved", "Applied", "Verifying"]} />
            <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="size-3.5" />Topic exists on broker</span>
              <span className="flex items-center gap-1.5"><Check className="size-3.5" />Config matches request</span>
              <span className="flex items-center gap-1.5 text-info"><RotateCw className="size-3.5 animate-spin" />Producer test message · 8s</span>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className={cn("flex h-full flex-col gap-3 border-success/25 p-4", ring("done"))}>
            <div className="flex justify-between"><span className="text-[14px]">TR-001036 · Live</span><span className="rounded-[5px] bg-success/12 px-2 py-0.5 text-[11px] text-success">completed</span></div>
            <Progress n={4} />
            <span className="text-[13px] text-muted-foreground">orders.returned.v1 is live on makro-prod-core · took 14 min end to end</span>
            <div className="flex items-center gap-3">
              <Btn size="sm" variant="outline" href={href("/infra/stacks/commerce-order-service?view=graph")}>Open on canvas</Btn>
              <button className="text-[13px] text-muted-foreground hover:text-foreground" onClick={() => toast.success("Connection info copied")}>Copy connection info</button>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className={cn("flex h-full flex-col gap-3 border-destructive/25 p-4", ring("rejected"))}>
            <div className="flex justify-between"><span className="text-[14px]">TR-001034 · Rejected</span><span className="rounded-[5px] bg-destructive/12 px-2 py-0.5 text-[11px] text-destructive">rejected</span></div>
            <div className="rounded-[10px] border border-line-2 bg-destructive/5 p-3">
              <div className="text-[13px]">Priya: &quot;Retention 90d is too long for PII. Use 14d and compaction.&quot;</div>
              <div className="text-[11px] text-subtle">2 days ago</div>
            </div>
            <div className="flex items-center gap-3">
              <Btn size="sm" variant="outline" href={href("/infra/new")}>Edit &amp; resubmit</Btn>
              <button className="text-[13px] text-muted-foreground hover:text-foreground" onClick={() => toast("Reply sent to Priya")}>Reply to Priya</button>
            </div>
            <span className="text-[12px] text-subtle">Resubmitting keeps the thread and pre-fills the suggested change</span>
          </Card>
        </StaggerItem>
      </Stagger>
    </Screen>
  )
}
