"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ArrowUpRight, Check, Database, History, KeyRound, Loader, Plus, RotateCw, TriangleAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { PostgresCanvas, ClassicSwitch, ViewSwitch, useModuleView } from "@/components/screens/platform-canvas"
import { Btn, EnvChip, GlossCard, IntegrationLogo, ease, useHotkey } from "@/components/idp/kit"
import { PW_MAX, c4eDbs, pgBindings, pgDbUsers, pgDbs, pgRotations, type PgDb } from "@/lib/data-ext/kafka-postgres"
import {
  EmptyRow,
  Field,
  HealthText,
  Modal,
  ModuleCrumbs,
  ModuleFrame,
  PageHead,
  SearchBox,
  Segmented,
  SortHead,
  TableCard,
  inputCls,
  rowMotion,
  useQueryState,
  useSort,
} from "../kafka/ui"

const HEALTH = {
  failing: { tone: "fail" as const, short: "check failing", long: "Health check failing" },
  healthy: { tone: "ok" as const, short: "healthy", long: "Healthy" },
  provisioning: { tone: "busy" as const, short: "provisioning", long: "Provisioning" },
}

function PwAge({ d }: { d: number }) {
  const overdue = d > PW_MAX
  const due = !overdue && d >= 30
  return (
    <span className={cn("text-xs/4", overdue ? "text-destructive" : due ? "text-warning" : "text-muted-foreground")}>
      {d} / {PW_MAX} days{overdue && " · overdue"}
    </span>
  )
}

/* ---------- 16c / C16c · All databases ---------- */
export function PgAllDatabases() {
  const href = useHref()
  const router = useRouter()
  const [view, setView] = useQueryState("view")
  const [, setMv] = useModuleView("postgres")
  const [newQ, setNew] = useQueryState("new")
  const [all, setAll] = React.useState(false)
  const [q, setQ] = React.useState("")
  useHotkey("n", () => setNew("1"))
  const base = pgDbs.filter((d) => d.health !== "provisioning")
  const filtered = base.filter((d) => !q || d.name.includes(q.toLowerCase()) || d.project.includes(q.toLowerCase()))
  const { sorted, sort, onSort } = useSort<PgDb>(filtered, { key: "none", dir: "asc" }, (d, k) =>
    k === "name" ? d.name : k === "project" ? d.project : k === "users" ? d.users : k === "pw" ? d.pwAge : k === "health" ? d.health : base.indexOf(d),
  )
  const shown = all || q ? sorted : sorted.slice(0, 3)
  const tab = view === "rotations" ? "rotations" : "databases"

  return (
    <ModuleFrame module="postgres">
      <PageHead
        logo="postgres"
        title="Postgres"
        sub="19 databases · 46 users · 2 need attention"
        right={
          <>
            <ViewSwitch view="list" onChange={setMv} module="postgres" />
            <Segmented
              id="pg"
              active={tab}
              items={[
                { key: "databases", label: "Databases", onClick: () => setView(null) },
                { key: "users", label: "Users", onClick: () => router.push(href("/postgres?tab=users")) },
                { key: "rotations", label: "Rotations", onClick: () => setView("rotations") },
              ]}
            />
            <Btn variant="primary" size="sm" className="h-8.5" onClick={() => setNew("1")}>
              Request user
            </Btn>
          </>
        }
      />
      <AnimatePresence mode="wait">
        {tab === "rotations" ? (
          <motion.div key="rot" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease }}>
            <Rotations />
          </motion.div>
        ) : (
          <motion.div key="db" className="flex flex-col gap-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease }}>
            <div className="grid grid-cols-3 gap-3.5">
              <StatCard delay={0}>
                <div className="flex items-center gap-5">
                  <Donut />
                  <div className="flex flex-col gap-1.5 text-xs/4">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <i className="size-2 bg-foreground" /> 16 healthy
                    </span>
                    <span className="flex items-center gap-1.5 text-warning">
                      <i className="size-2 bg-warning" /> 2 passwords due
                    </span>
                    <span className="flex items-center gap-1.5 text-destructive">
                      <i className="size-2 bg-destructive" /> 1 health check failing
                    </span>
                  </div>
                </div>
              </StatCard>
              <StatCard delay={0.05}>
                <p className="text-xs text-subtle">Storage used</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  <CountUp to={1.8} decimals={1} /> TB
                </p>
                <p className="mt-2 text-xs text-subtle">of 3 TB across instances</p>
              </StatCard>
              <StatCard delay={0.1} href={href("/inbox?kind=postgres")}>
                <p className="text-xs text-subtle">Pending user requests</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  <CountUp to={3} />
                </p>
                <p className="mt-2 text-xs text-subtle">oldest 2h · in Inbox</p>
              </StatCard>
            </div>
            <div className="flex">
              <SearchBox value={q} onChange={setQ} placeholder="Search databases, projects" className="h-8" />
            </div>
            <TableCard>
              <div className="flex border-b border-line px-4 py-2.5">
                <SortHead label="Database" k="name" sort={sort} onSort={onSort} className="flex-1" />
                <SortHead label="Project" k="project" sort={sort} onSort={onSort} className="w-37.5" />
                <SortHead label="Users" k="users" sort={sort} onSort={onSort} className="w-22.5" />
                <SortHead label="Oldest password" k="pw" sort={sort} onSort={onSort} className="w-50" />
                <SortHead label="Health" k="health" sort={sort} onSort={onSort} className="flex w-25 justify-end" />
              </div>
              <AnimatePresence initial={false} mode="popLayout">
                {shown.length === 0 && <EmptyRow key="e" query={q} onClear={() => setQ("")} />}
                {shown.map((d, i) => (
                  <motion.div key={d.name} {...rowMotion(i)}>
                    <Link href={href(`/postgres/${d.name}`)} className="flex items-center border-b border-line px-4 py-3 hover:bg-surface-2">
                      <span className="flex flex-1 items-center gap-2 text-sm/4 text-foreground">
                        {d.name}
                        {d.env === "prod" && i > 2 && <EnvChip env="prod" />}
                      </span>
                      <span className="w-37.5 text-[13px]/4 text-muted-foreground">{d.project}</span>
                      <span className="w-22.5 text-[13px]/4 text-muted-foreground">{d.users}</span>
                      <span className="w-50">
                        <PwAge d={d.pwAge} />
                      </span>
                      <span className="flex w-25 justify-end">
                        <HealthText tone={HEALTH[d.health].tone}>{HEALTH[d.health].short}</HealthText>
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!q && (
                <button
                  type="button"
                  onClick={() => setAll((a) => !a)}
                  className="px-4 py-3 text-left text-[13px]/4 text-subtle transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {all ? "Show less" : "+ 16 more"}
                </button>
              )}
            </TableCard>
          </motion.div>
        )}
      </AnimatePresence>
      <RequestUserDialog open={newQ === "1"} onClose={() => setNew(null)} />
    </ModuleFrame>
  )
}

function StatCard({ children, delay, href }: { children: React.ReactNode; delay: number; href?: string }) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay }}
      className={cn("h-26.5 rounded-[12px] border border-line bg-surface px-4 py-4", href && "transition-colors hover:border-line-3")}
    >
      {children}
    </motion.div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700)
      setV(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{v.toFixed(decimals)}</>
}

function Donut() {
  const r = 26
  const c = 2 * Math.PI * r
  const segs = [
    { v: 16, color: "var(--foreground)" },
    { v: 2, color: "var(--warning)" },
    { v: 1, color: "var(--destructive)" },
  ]
  let off = 0
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
      {segs.map((s, i) => {
        const len = (s.v / 19) * c
        const el = (
          <motion.circle
            key={i}
            cx={32}
            cy={32}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={7}
            strokeDasharray={`${len} ${c}`}
            initial={{ strokeDashoffset: len, opacity: 0 }}
            animate={{ strokeDashoffset: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease, delay: 0.1 + i * 0.15 }}
            style={{ transform: `rotate(${(off / c) * 360}deg)`, transformOrigin: "32px 32px" }}
          />
        )
        off += len
        return el
      })}
    </svg>
  )
}

function Rotations() {
  return (
    <TableCard>
      <div className="flex border-b border-line px-4 py-2.5">
        <SortHead label="When" className="w-36" />
        <SortHead label="Database" className="flex-1" />
        <SortHead label="User" className="w-48" />
        <SortHead label="By" className="w-32" />
        <SortHead label="Result" className="w-28 text-right" />
      </div>
      {pgRotations.map((r, i) => (
        <motion.div key={i} {...rowMotion(i)} className="flex items-center border-b border-line px-4 py-3 last:border-b-0">
          <span className="w-36 text-xs text-subtle">{r.when}</span>
          <span className="flex-1 text-[13px] text-foreground">{r.db}</span>
          <span className="w-48 font-mono text-xs text-muted-foreground">{r.user}</span>
          <span className="w-32 text-xs text-muted-foreground">{r.by}</span>
          <span className="flex w-28 justify-end">
            <HealthText tone={r.ok ? "ok" : "fail"}>{r.ok ? "rotated" : "failed"}</HealthText>
          </span>
        </motion.div>
      ))}
    </TableCard>
  )
}

function RequestUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [db, setDb] = React.useState("pg-prod-orders")
  const [name, setName] = React.useState("")
  const [tier, setTier] = React.useState("Read-only")
  const [busy, setBusy] = React.useState(false)
  const prod = pgDbs.find((d) => d.name === db)?.env === "prod"
  const submit = () => {
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      onClose()
      toast.success("User requested", { description: `${name || "new_user"} on ${db} · in review${prod ? " (PROD needs platform approval)" : ""}` })
    }, 900)
  }
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-base font-semibold text-foreground">Request database user</h2>
      <p className="mt-1 text-xs text-subtle">Credentials are generated and written to Vault — nobody sees the password.</p>
      <div className="mt-4 flex flex-col gap-3.5">
        <Field label="Database">
          <select value={db} onChange={(e) => setDb(e.target.value)} className={inputCls}>
            {pgDbs.map((d) => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Username">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/g, ""))} placeholder="reporting_ro" className={cn(inputCls, "font-mono")} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Access</span>
          <div className="flex gap-2">
            {["Read-only", "Read-write", "Owner"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={cn(
                  "h-7.5 rounded-[7px] border px-2.5 text-xs transition-colors",
                  tier === t ? "border-primary/60 bg-primary/10 text-foreground" : "border-line-3 text-subtle hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          {prod ? <EnvChip env="prod" /> : <span />}
          <div className="flex gap-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={!name || busy} onClick={submit}>
              {busy && <Loader className="animate-spin" />} Request user
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ---------- /postgres · C4e (classic) — canvas shows the 16c catalog ---------- */
export function PgOverview() {
  const mode = useMode()
  const [tab] = useQueryState("tab")
  const [sub] = useQueryState("view")
  const [mv, setMv] = useModuleView("postgres")
  // ?view=rotations is the Rotations tab of the list, so it always shows the list.
  if (!tab && mv === "canvas" && sub !== "rotations") return <PostgresCanvas onView={setMv} />
  if (mode === "canvas" && !tab) return <PgAllDatabases />
  return <PgClassicOverview />
}

function PgClassicOverview() {
  const href = useHref()
  const [tabQ, setTab] = useQueryState("tab")
  const [newQ, setNew] = useQueryState("new")
  const tab = tabQ === "users" || tabQ === "bindings" ? tabQ : "databases"
  const dbs = c4eDbs.map((n) => pgDbs.find((d) => d.name === n)!)
  return (
    <ModuleFrame module="postgres" crumbs={<ModuleCrumbs module="postgres" />}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">Postgres</h1>
          <p className="text-[13px] text-subtle">20 databases · 64 users · 2 rotations due this week</p>
        </div>
        <div className="flex gap-2">
          <ClassicSwitch module="postgres" />
          <Btn size="md" href={href("/postgres/databases")}>All databases</Btn>
          <Btn size="md" href={href("/secrets")}>
            <KeyRound /> Credentials
          </Btn>
          <Btn variant="primary" size="md" onClick={() => setNew("1")}>
            <Plus /> New database user
          </Btn>
        </div>
      </div>
      <div className="flex gap-6 border-b border-line">
        {(["databases", "users", "bindings"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k === "databases" ? null : k)}
            className={cn("relative pb-2.5 text-[13px] capitalize transition-colors", tab === k ? "text-foreground" : "text-subtle hover:text-foreground")}
          >
            {k}
            {tab === k && <motion.span layoutId="pg-ul" className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
          {tab === "databases" && (
            <TableCard>
              <div className="flex border-b border-line px-4 py-3">
                <SortHead label="Database" className="flex-1" />
                <SortHead label="Engine" className="w-42" />
                <SortHead label="Connections" className="w-50" />
                <SortHead label="Storage" className="w-42" />
                <SortHead label="Status" className="w-62" />
              </div>
              {dbs.map((d, i) => (
                <motion.div key={d.name} {...rowMotion(i)}>
                  <Link href={href(`/postgres/${d.name}`)} className="flex items-center border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-surface-2">
                    <span className="flex flex-1 items-center gap-2.5 font-mono text-[13px] text-foreground">
                      <IntegrationLogo name="postgres" className="size-4" />
                      {d.name}
                    </span>
                    <span className="w-42 text-[13px] text-muted-foreground">{d.engine}</span>
                    <span className="flex w-50 items-center gap-2 text-[13px] text-muted-foreground">
                      {d.conns ? `${d.conns[0]} / ${d.conns[1]}` : "—"}
                    </span>
                    <span className="w-42 text-[13px] text-muted-foreground">{d.storage}</span>
                    <span className="w-62">
                      <HealthText tone={HEALTH[d.health].tone}>{HEALTH[d.health].long}</HealthText>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </TableCard>
          )}
          {tab === "users" && <UsersTable rows={pgDbUsers} />}
          {tab === "bindings" && <BindingsTable rows={pgBindings} />}
        </motion.div>
      </AnimatePresence>
      <RequestUserDialog open={newQ === "1"} onClose={() => setNew(null)} />
    </ModuleFrame>
  )
}

function UsersTable({ rows, onRotate }: { rows: typeof pgDbUsers; onRotate?: (n: string) => void }) {
  const href = useHref()
  return (
    <TableCard>
      <div className="flex border-b border-line px-4 py-2.5">
        <SortHead label="User" className="flex-1" />
        <SortHead label="Database" className="w-44" />
        <SortHead label="Access" className="w-32" />
        <SortHead label="Vault path" className="w-80" />
        <SortHead label="Password age" className="w-40" />
        {onRotate && <div className="w-20" />}
      </div>
      {rows.map((u, i) => (
        <motion.div key={u.name} {...rowMotion(i)} className="flex items-center border-b border-line px-4 py-3 last:border-b-0">
          <span className="flex-1 font-mono text-xs text-foreground">{u.name}</span>
          <Link href={href(`/postgres/${u.db}`)} className="w-44 text-[13px] text-muted-foreground hover:text-foreground">
            {u.db}
          </Link>
          <span className="w-32 text-xs text-muted-foreground">{u.tier}</span>
          <span className="w-80 truncate font-mono text-[11px] text-subtle">{u.vault}</span>
          <span className="w-40">
            <PwAge d={u.age} />
          </span>
          {onRotate && (
            <span className="flex w-20 justify-end">
              <Btn size="xs" variant="ghost" onClick={() => onRotate(u.name)}>
                <RotateCw /> Rotate
              </Btn>
            </span>
          )}
        </motion.div>
      ))}
    </TableCard>
  )
}

function BindingsTable({ rows }: { rows: typeof pgBindings }) {
  const href = useHref()
  return (
    <TableCard>
      <div className="flex border-b border-line px-4 py-2.5">
        <SortHead label="Service" className="flex-1" />
        <SortHead label="Database" className="w-48" />
        <SortHead label="User" className="w-44" />
        <SortHead label="Secret key" className="w-44" />
        <SortHead label="Last sync" className="w-28 text-right" />
      </div>
      {rows.map((b, i) => (
        <motion.div key={b.service + b.db} {...rowMotion(i)} className="flex items-center border-b border-line px-4 py-3 last:border-b-0">
          <Link href={href(`/services/${b.service}`)} className="flex flex-1 items-center gap-1 text-[13px] text-foreground hover:text-primary">
            {b.service} <ArrowUpRight className="size-3 text-subtle" />
          </Link>
          <span className="w-48 text-[13px] text-muted-foreground">{b.db}</span>
          <span className="w-44 font-mono text-xs text-muted-foreground">{b.user}</span>
          <span className="w-44 font-mono text-xs text-muted-foreground">{b.secret}</span>
          <span className="w-28 text-right text-xs text-subtle">{b.synced}</span>
        </motion.div>
      ))}
    </TableCard>
  )
}

/* ---------- /postgres/[db] ---------- */
export function PgDbDetail() {
  const params = useParams<{ db: string }>()
  const name = decodeURIComponent(params?.db ?? "pg-prod-orders")
  const db = pgDbs.find((d) => d.name === name) ?? { ...pgDbs[0], name }
  const [tabQ, setTab] = useQueryState("tab")
  const [rotate, setRotate] = useQueryState("rotate")
  const [rollback, setRollback] = useQueryState("rollback")
  const tab = tabQ === "bindings" || tabQ === "history" ? tabQ : "users"
  const [users, setUsers] = React.useState(() => {
    const u = pgDbUsers.filter((x) => x.db === db.name)
    return u.length ? u : pgDbUsers.slice(0, 2).map((x) => ({ ...x, db: db.name }))
  })
  const bindings = pgBindings.filter((b) => b.db === db.name)
  const h = HEALTH[db.health]
  const [checking, setChecking] = React.useState(false)

  return (
    <ModuleFrame module="postgres" crumbs={<ModuleCrumbs module="postgres" tail={<span className="font-mono text-sm font-semibold text-foreground">{db.name}</span>} />}>
      <PageHead
        logo="postgres"
        title={<span className="font-mono">{db.name}</span>}
        sub={
          <span className="inline-flex items-center gap-2">
            {db.engine} · {db.project} · {db.users} users · {db.storage}
            <EnvChip env={db.env} />
          </span>
        }
        right={
          <>
            <HealthText tone={h.tone}>{h.long}</HealthText>
            <Btn
              size="sm"
              className="h-8.5"
              onClick={() => {
                setChecking(true)
                window.setTimeout(() => {
                  setChecking(false)
                  if (db.health === "failing") toast.error("Still failing", { description: "connection refused from 10.4.2.11:5432" })
                  else toast.success("Health check passed")
                }, 1200)
              }}
            >
              {checking ? <Loader className="animate-spin" /> : <RotateCw />} Re-check
            </Btn>
            <Btn size="sm" className="h-8.5" onClick={() => setRollback("1")}>
              <History /> Rollback
            </Btn>
            <ConnectService db={db.name} bound={bindings.map((b) => b.service)} />
          </>
        }
      />
      {db.health === "failing" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-xs text-destructive"
        >
          <TriangleAlert className="size-3.5" />
          Health check failing since 09:18 — 3 services may see connection errors. Last change: password rotation for order_svc_rw.
          <button type="button" onClick={() => setRollback("1")} className="ml-auto font-medium underline-offset-4 hover:underline">
            Roll back that change
          </button>
        </motion.div>
      )}
      <div className="grid grid-cols-4 gap-3">
        {[
          ["Connections", db.conns ? `${db.conns[0]} / ${db.conns[1]}` : "—"],
          ["Storage", db.storage],
          ["Oldest password", `${db.pwAge} / ${PW_MAX} days`],
          ["Region", "ap-bangkok"],
        ].map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease }}
            className="rounded-[12px] border border-line bg-surface px-4 py-3"
          >
            <p className="text-[11px] tracking-[0.06em] text-subtle uppercase">{k}</p>
            <p className="mt-1 text-sm text-foreground">{v}</p>
          </motion.div>
        ))}
      </div>
      <Segmented
        id="pgdb"
        active={tab}
        items={[
          { key: "users", label: `Users · ${users.length}`, onClick: () => setTab(null) },
          { key: "bindings", label: `Bindings · ${bindings.length}`, onClick: () => setTab("bindings") },
          { key: "history", label: "History", onClick: () => setTab("history") },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
          {tab === "users" && <UsersTable rows={users} onRotate={(n) => setRotate(n)} />}
          {tab === "bindings" &&
            (bindings.length ? (
              <BindingsTable rows={bindings} />
            ) : (
              <GlossCard className="flex flex-col items-center gap-2 py-10 text-center">
                <Database className="size-5 text-faint" />
                <p className="text-[13px] text-foreground">No services bound yet</p>
                <p className="text-xs text-subtle">Bind a user to a service to sync its credentials into Vault.</p>
              </GlossCard>
            ))}
          {tab === "history" && <Rotations />}
        </motion.div>
      </AnimatePresence>

      <RotateDialog
        user={rotate}
        db={db}
        onClose={() => setRotate(null)}
        onDone={(u) => {
          const prev = users.find((x) => x.name === u)?.age ?? 0
          setUsers((us) => us.map((x) => (x.name === u ? { ...x, age: 0 } : x)))
          setRotate(null)
          toast.success(`Rotated ${u}`, {
            description: "Vault updated · pods restarting with new credentials",
            action: { label: "Undo", onClick: () => setUsers((us) => us.map((x) => (x.name === u ? { ...x, age: prev } : x))) },
          })
        }}
      />
      <RollbackDialog open={rollback === "1"} db={db} onClose={() => setRollback(null)} />
    </ModuleFrame>
  )
}

function RotateDialog({ user, db, onClose, onDone }: { user: string | null; db: PgDb; onClose: () => void; onDone: (u: string) => void }) {
  const [step, setStep] = React.useState(0)
  const [prevUser, setPrevUser] = React.useState(user)
  if (user !== prevUser) {
    setPrevUser(user)
    setStep(0)
  }
  const go = () => {
    if (!user) return
    setStep(1)
    window.setTimeout(() => setStep(2), 700)
    window.setTimeout(() => setStep(3), 1400)
    window.setTimeout(() => onDone(user), 2000)
  }
  const steps = ["Generate new password", "Write to Vault", "Restart bound services"]
  return (
    <Modal open={!!user} onClose={step ? () => {} : onClose}>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Rotate {user}?</h2>
        <EnvChip env={db.env} />
      </div>
      <p className="mt-1 text-xs/4.5 text-muted-foreground">
        The old password stays valid for 1 hour. Blast radius: {pgBindings.filter((b) => b.db === db.name).length || 1} service(s) on {db.name}.
      </p>
      <div className="mt-4 flex flex-col gap-2 rounded-[10px] border border-line bg-page p-3">
        {steps.map((s, i) => {
          const state = step > i + 1 ? "done" : step === i + 1 ? "run" : "todo"
          return (
            <div key={s} className="flex items-center gap-2.5 text-xs">
              <span className="flex size-4 items-center justify-center">
                {state === "done" ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="size-3.5 text-success" />
                  </motion.span>
                ) : state === "run" ? (
                  <Loader className="size-3.5 animate-spin text-info" />
                ) : (
                  <span className="size-1.5 rounded-full bg-faint" />
                )}
              </span>
              <span className={state === "todo" ? "text-subtle" : "text-foreground"}>{s}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose} disabled={step > 0}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={go} disabled={step > 0}>
          {step > 0 ? <Loader className="animate-spin" /> : <RotateCw />} Rotate password
        </Btn>
      </div>
    </Modal>
  )
}

function RollbackDialog({ open, db, onClose }: { open: boolean; db: PgDb; onClose: () => void }) {
  const [busy, setBusy] = React.useState(false)
  return (
    <Modal open={open} onClose={onClose} className="w-[520px]">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Roll back last change on {db.name}?</h2>
        <EnvChip env={db.env} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Restores the previous credential version from Vault (v13 → v12).</p>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-line bg-page font-mono text-[11.5px]/5">
        <div className="flex items-center gap-2 bg-destructive/8 px-3 text-destructive">
          <X className="size-3" /> order_svc_rw.password = •••• (v13, rotated today 09:12)
        </div>
        <div className="flex items-center gap-2 bg-success/8 px-3 text-success">
          <Plus className="size-3" /> order_svc_rw.password = •••• (v12, 24d ago)
        </div>
        <div className="px-3 text-subtle">  bindings: order-service, reporting, fulfilment (restart)</div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn
          variant="primary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            window.setTimeout(() => {
              setBusy(false)
              onClose()
              toast.success("Rolled back to v12", { description: `${db.name} · 3 services restarting` })
            }, 1200)
          }}
        >
          {busy ? <Loader className="animate-spin" /> : <History />} Roll back
        </Btn>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Connect a service to this database (old 06y, redesigned).
   Database → Connect a service → pick a service: opens the service's Postgres-user form with this
   database preselected, so the binding goes through the normal review flow. 3 clicks. */
/* ------------------------------------------------------------------ */

const CONNECTABLE = ["order-service", "checkout-api", "fulfilment", "reporting", "payment-service", "price-api", "stock-sync", "loyalty-gw", "cart-api"]

function ConnectService({ db, bound }: { db: string; bound: string[] }) {
  const href = useHref()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const [idx, setIdx] = React.useState(0)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const h = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener("pointerdown", h)
    return () => window.removeEventListener("pointerdown", h)
  }, [open])
  const list = CONNECTABLE.filter((s) => s.includes(q.toLowerCase())).sort((a, b) => Number(bound.includes(a)) - Number(bound.includes(b)))
  const free = list.filter((s) => !bound.includes(s))
  const go = (svc: string) => {
    setOpen(false)
    router.push(href(`/services/${svc}/add/postgres?db=${encodeURIComponent(db)}`))
  }
  return (
    <div ref={ref} className="relative">
      <Btn variant="primary" size="sm" className="h-8.5" onClick={() => setOpen((o) => !o)}>
        <Plus /> Connect a service
      </Btn>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full right-0 z-40 mt-1.5 w-72 rounded-[12px] border border-line-3 bg-surface p-1.5 shadow-2xl"
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setIdx(0)
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setIdx((i) => Math.min(free.length - 1, i + 1))
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setIdx((i) => Math.max(0, i - 1))
                }
                if (e.key === "Enter" && free[idx]) go(free[idx])
                if (e.key === "Escape") setOpen(false)
              }}
              placeholder="Which service needs this database?"
              className="mb-1 h-8.5 w-full rounded-[8px] border border-line-3 bg-page px-2.5 text-[13px] text-foreground outline-none focus:border-foreground/40"
            />
            {list.map((s) => {
              const isBound = bound.includes(s)
              const on = !isBound && free[idx] === s
              return (
                <button
                  key={s}
                  disabled={isBound}
                  onMouseMove={() => !isBound && setIdx(free.indexOf(s))}
                  onClick={() => go(s)}
                  className={cn("flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px]", on ? "bg-surface-2 text-foreground" : "text-muted-foreground", isBound && "opacity-45")}
                >
                  <IntegrationLogo name="kubernetes" className="size-3.5" />
                  <span className="flex-1">{s}</span>
                  <span className="text-[11px] text-subtle">{isBound ? "connected" : on ? "↵" : ""}</span>
                </button>
              )
            })}
            {!list.length && <p className="px-2.5 py-3 text-[12.5px] text-subtle">No service matches “{q}”</p>}
            <p className="border-t border-line-2 px-2.5 pt-2 pb-1 text-[11.5px] text-subtle">Creates a database user for the service and stores its password in Vault. Reviewed like any change.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
