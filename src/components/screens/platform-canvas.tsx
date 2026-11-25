"use client"

/* Canvas views for the platform modules + the shared Canvas / List switch.
   List stays the default (it is what Paper designs for the module landing pages); the switch
   remembers each module's last choice, so a user who prefers the canvas lands on it. */

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { Boxes, FolderGit2, KeyRound, Layers, List as ListIcon, User, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { ClassicPage } from "@/components/shell/classic-page"
import { secretProjects, type Health } from "@/lib/data"
import { PW_MAX, TOPIC_HEALTH, pgBindings, pgDbUsers, pgDbs, topics } from "@/lib/data-ext/kafka-postgres"
import { infraStacks, projectCards, projectServices } from "@/lib/data-ext/infra-projects"
import { IntegrationLogo } from "@/components/idp/kit"
import { GraphCanvas, GraphCard, LegendItem, layered, type GraphEdge, type GraphNode } from "@/components/idp/graph-canvas"

/* ------------------------------------------------------------------ */
/* View switch                                                         */
/* ------------------------------------------------------------------ */

export type ModuleView = "list" | "canvas"
const prefKey = (m: string) => `idp.view.${m}`
const prefSubs = new Set<() => void>()
function readPref(m: string): ModuleView {
  try {
    return localStorage.getItem(prefKey(m)) === "canvas" ? "canvas" : "list"
  } catch {
    return "list"
  }
}
function writePref(m: string, v: ModuleView) {
  try {
    localStorage.setItem(prefKey(m), v)
  } catch {}
  prefSubs.forEach((f) => f())
}
const subscribePref = (cb: () => void) => {
  prefSubs.add(cb)
  return () => {
    prefSubs.delete(cb)
  }
}

/** `?view=canvas|list` wins; otherwise the module's remembered choice; otherwise list. */
export function useModuleView(module: string): [ModuleView, (v: ModuleView) => void] {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const pref = React.useSyncExternalStore(subscribePref, () => readPref(module), () => "list" as ModuleView)
  const q = sp.get("view")
  const view: ModuleView = q === "canvas" || q === "list" ? q : pref
  const set = (v: ModuleView) => {
    writePref(module, v)
    const p = new URLSearchParams(sp.toString())
    p.set("view", v)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }
  return [view, set]
}

/** Remember a choice made through a link-based switch (Kafka, Network use their own routes). */
export function rememberView(module: string, v: ModuleView) {
  writePref(module, v)
}

export function ViewSwitch({
  view,
  onChange,
  hrefs,
  module,
  className,
}: {
  view: ModuleView
  onChange?: (v: ModuleView) => void
  /** For modules whose canvas lives on its own route. */
  hrefs?: Record<ModuleView, string>
  module?: string
  className?: string
}) {
  const items: [ModuleView, string, typeof Workflow][] = [
    ["canvas", "Canvas", Workflow],
    ["list", "List", ListIcon],
  ]
  return (
    <div data-ui className={cn("flex h-8.5 items-center gap-0.5 rounded-[10px] border border-line-2 bg-surface/90 p-0.5 backdrop-blur", className)}>
      {items.map(([id, label, Icon]) => {
        const inner = (
          <>
            {view === id && <motion.span layoutId={`mv-pill-${module ?? "x"}`} className="absolute inset-0 rounded-[8px] bg-surface-3" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <Icon className="relative size-3.5" />
            <span className="relative">{label}</span>
          </>
        )
        const cls = cn("relative flex h-full items-center gap-1.5 rounded-[8px] px-2.5 text-xs transition-colors", view === id ? "text-foreground" : "text-muted-foreground hover:text-foreground")
        return hrefs ? (
          <Link key={id} href={hrefs[id]} scroll={false} onClick={() => module && rememberView(module, id)} className={cls}>
            {inner}
          </Link>
        ) : (
          <button key={id} type="button" onClick={() => onChange?.(id)} className={cls}>
            {inner}
          </button>
        )
      })}
    </div>
  )
}

/** Switch for a Classic list header: wires itself to the module's view state. */
export function ClassicSwitch({ module }: { module: string }) {
  const [view, set] = useModuleView(module)
  return <ViewSwitch view={view} onChange={set} module={`${module}-classic`} className="h-9" />
}

/** In Classic mode the canvas sits under the Classic top bar; in Canvas mode it fills the page. */
function CanvasFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const mode = useMode()
  if (mode === "classic")
    return (
      <ClassicPage bare crumbs={<span className="text-[15px] font-semibold text-foreground">{title}</span>}>
        {children}
      </ClassicPage>
    )
  return <>{children}</>
}

function CanvasHeader({ logo, icon, title, sub, right }: { logo?: Parameters<typeof IntegrationLogo>[0]["name"]; icon?: React.ReactNode; title: string; sub: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-[10px] border border-line-2 bg-surface/90 backdrop-blur">
        {logo ? <IntegrationLogo name={logo} className="size-4.5" /> : icon}
      </span>
      <div className="flex flex-col">
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
        <span className="text-xs text-subtle">{sub}</span>
      </div>
      {right && <div className="ml-3">{right}</div>}
    </div>
  )
}

/** Small column label rendered as a non-interactive node. */
function colLabel(id: string, text: string, x: number, y: number): GraphNode {
  return {
    id: `lbl-${id}`,
    x,
    y,
    w: 200,
    h: 18,
    search: "",
    tone: "idle",
    content: <span className="pointer-events-none text-[10.5px] tracking-[0.1em] text-subtle uppercase">{text}</span>,
  }
}

/* ------------------------------------------------------------------ */
/* Postgres: projects → databases → users → services                   */
/* ------------------------------------------------------------------ */

export function PostgresCanvas({ onView }: { onView: (v: ModuleView) => void }) {
  const href = useHref()
  const router = useRouter()
  const { nodes, edges } = React.useMemo(() => {
    const projects = [...new Set(pgDbs.map((d) => d.project))]
    const services = [...new Set(pgBindings.map((b) => b.service).concat(pgDbUsers.map((u) => u.service)))]
    const W = 220
    const pos = layered([
      projects.map((p) => ({ id: `p-${p}`, w: 170, h: 54 })),
      pgDbs.map((d) => ({ id: `d-${d.name}`, w: W, h: 76 })),
      pgDbUsers.map((u) => ({ id: `u-${u.name}`, w: 200, h: 62 })),
      services.map((s) => ({ id: `s-${s}`, w: 180, h: 48 })),
    ])
    const dbTone = (h: string, age: number): Health => (h === "failing" ? "fail" : h === "provisioning" ? "idle" : age > PW_MAX ? "warn" : "ok")
    const n: GraphNode[] = [
      ...projects.map((p) => ({
        id: `p-${p}`,
        ...pos[`p-${p}`],
        w: 170,
        h: 54,
        search: p,
        content: <GraphCard icon={<Boxes className="size-3.5 text-subtle" />} title={p} sub={`${pgDbs.filter((d) => d.project === p).length} databases`} emphasis />,
      })),
      ...pgDbs.map((d) => {
        const tone = dbTone(d.health, d.pwAge)
        return {
          id: `d-${d.name}`,
          ...pos[`d-${d.name}`],
          w: W,
          h: 76,
          tone,
          search: `${d.name} ${d.project} ${d.env}`,
          onOpen: () => router.push(href(`/postgres/${d.name}`)),
          content: (
            <GraphCard
              icon={<IntegrationLogo name="postgres" className="size-4" />}
              title={d.name}
              sub={`${d.engine} · ${d.env} · ${d.storage}`}
              status={{
                tone,
                text: d.health === "failing" ? "Health check failing" : d.health === "provisioning" ? "Provisioning" : d.pwAge > PW_MAX ? `Password overdue · ${d.pwAge}/${PW_MAX}d` : `Healthy · password ${d.pwAge}/${PW_MAX}d`,
              }}
            />
          ),
        }
      }),
      ...pgDbUsers.map((u) => {
        const tone: Health = u.age > PW_MAX ? "warn" : "ok"
        return {
          id: `u-${u.name}`,
          ...pos[`u-${u.name}`],
          w: 200,
          h: 62,
          tone,
          search: `${u.name} ${u.service} ${u.tier}`,
          onOpen: () => router.push(href(`/postgres/${u.db}`)),
          content: <GraphCard icon={<User className="size-3.5 text-subtle" />} title={u.name} mono status={{ tone, text: `${u.tier} · ${u.age}d old` }} />,
        }
      }),
      ...services.map((s) => ({
        id: `s-${s}`,
        ...pos[`s-${s}`],
        w: 180,
        h: 48,
        search: s,
        onOpen: () => router.push(href(`/services/${s === "order-service" ? "order-service" : s}`)),
        content: <GraphCard icon={<IntegrationLogo name="kubernetes" className="size-3.5" />} title={s} />,
      })),
    ]
    const xs = (id: string) => pos[id]?.x ?? 0
    n.push(colLabel("p", "Projects", xs(`p-${projects[0]}`), 44), colLabel("d", "Databases", xs(`d-${pgDbs[0].name}`), 44), colLabel("u", "Users", xs(`u-${pgDbUsers[0].name}`), 44), colLabel("s", "Services", xs(`s-${services[0]}`), 44))
    const e: GraphEdge[] = [
      ...pgDbs.map((d) => ({ from: `p-${d.project}`, to: `d-${d.name}`, tone: dbTone(d.health, d.pwAge) === "fail" ? ("fail" as Health) : undefined, dashed: d.health === "provisioning" })),
      ...pgDbUsers.map((u) => ({ from: `d-${u.db}`, to: `u-${u.name}`, tone: u.age > PW_MAX ? ("warn" as Health) : undefined })),
      ...pgDbUsers.map((u) => ({ from: `u-${u.name}`, to: `s-${u.service}`, flow: true, tone: pgDbs.find((d) => d.name === u.db)?.health === "failing" ? ("fail" as Health) : undefined })),
    ]
    return { nodes: n, edges: e }
  }, [href, router])

  return (
    <CanvasFrame title="Postgres">
    <GraphCanvas
      id="postgres"
      nodes={nodes}
      edges={edges}
      placeholder="Find a database, user or service"
      header={<CanvasHeader logo="postgres" title="Postgres" sub="19 databases · 46 users · 2 need attention" right={<ViewSwitch view="canvas" onChange={onView} module="postgres" />} />}
      legend={
        <div className="flex gap-4">
          <LegendItem tone="ok" label="Healthy" />
          <LegendItem tone="warn" label="Password overdue" />
          <LegendItem tone="fail" label="Health check failing" />
          <LegendItem tone="idle" label="Provisioning" />
        </div>
      }
    />
    </CanvasFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Infrastructure: projects → stacks → key resources                   */
/* ------------------------------------------------------------------ */

const STACK_RESOURCES: Record<string, { name: string; type: string; state: "ok" | "drifted" | "error" }[]> = {
  "ecommerce-checkout": [
    { name: "checkout-db", type: "postgres", state: "ok" },
    { name: "checkout-cdn", type: "cloudfront", state: "ok" },
  ],
  "commerce-order-service": [
    { name: "orders-db", type: "postgres", state: "ok" },
    { name: "orders-sg", type: "securityGroup", state: "drifted" },
    { name: "orders-bucket", type: "s3", state: "drifted" },
    { name: "orders-redis", type: "elasticache", state: "ok" },
  ],
  "supply-chain-replenish": [
    { name: "replenish-queue", type: "sqs", state: "error" },
    { name: "replenish-fn", type: "lambda", state: "ok" },
  ],
  "payments-ledger": [
    { name: "ledger-db", type: "postgres", state: "ok" },
    { name: "ledger-kms", type: "kms", state: "ok" },
    { name: "ledger-archive", type: "s3", state: "ok" },
  ],
}

export function InfraCanvas({ onView }: { onView: (v: ModuleView) => void }) {
  const href = useHref()
  const router = useRouter()
  const { nodes, edges } = React.useMemo(() => {
    const proj = (id: string) => id.split("-")[0].replace("supply", "supply-chain")
    const projects = [...new Set(infraStacks.map((s) => proj(s.id)))]
    const res = infraStacks.flatMap((s) => (STACK_RESOURCES[s.id] ?? []).map((r) => ({ ...r, stack: s.id, id: `r-${s.id}-${r.name}` })))
    const pos = layered(
      [projects.map((p) => ({ id: `p-${p}`, w: 170, h: 54 })), infraStacks.map((s) => ({ id: `s-${s.id}`, w: 240, h: 78 })), res.map((r) => ({ id: r.id, w: 200, h: 56 }))],
      { rowGap: 20 },
    )
    const stTone = (st: string): Health => (st === "error" ? "fail" : st === "drift" ? "warn" : "ok")
    const n: GraphNode[] = [
      ...projects.map((p) => ({
        id: `p-${p}`,
        ...pos[`p-${p}`],
        w: 170,
        h: 54,
        search: p,
        content: <GraphCard icon={<Boxes className="size-3.5 text-subtle" />} title={p} sub={`${infraStacks.filter((s) => proj(s.id) === p).length} stacks`} emphasis />,
      })),
      ...infraStacks.map((s) => {
        const tone = stTone(s.state)
        return {
          id: `s-${s.id}`,
          ...pos[`s-${s.id}`],
          w: 240,
          h: 78,
          tone,
          search: `${s.name} ${s.env}`,
          onOpen: () => router.push(href(`/infra/stacks/${s.id}?view=graph`)),
          content: (
            <GraphCard
              icon={<IntegrationLogo name="pulumi" className="size-4" />}
              title={s.name}
              mono
              sub={`${s.env} · ${s.resources} resources · ${s.cost}/mo`}
              status={{ tone, text: s.state === "error" ? "Last update failed" : s.state === "drift" ? `Drift · ${s.drift} resources` : `In sync · ${s.updated}` }}
            />
          ),
        }
      }),
      ...res.map((r) => {
        const tone: Health = r.state === "error" ? "fail" : r.state === "drifted" ? "warn" : "ok"
        return {
          id: r.id,
          ...pos[r.id],
          w: 200,
          h: 56,
          tone,
          search: `${r.name} ${r.type}`,
          onOpen: () => router.push(href(`/infra/stacks/${r.stack}?view=graph`)),
          content: <GraphCard title={r.name} mono sub={r.type} badge={r.state !== "ok" ? <span className={cn("text-[10.5px]", tone === "fail" ? "text-destructive" : "text-warning")}>{r.state}</span> : undefined} />,
        }
      }),
    ]
    n.push(colLabel("p", "Projects", pos[`p-${projects[0]}`].x, 44), colLabel("s", "Pulumi stacks", pos[`s-${infraStacks[0].id}`].x, 44), colLabel("r", "Key resources", pos[res[0].id].x, 44))
    const e: GraphEdge[] = [
      ...infraStacks.map((s) => ({ from: `p-${proj(s.id)}`, to: `s-${s.id}`, tone: s.state === "error" ? ("fail" as Health) : undefined })),
      ...res.map((r) => ({ from: `s-${r.stack}`, to: r.id, tone: r.state === "error" ? ("fail" as Health) : r.state === "drifted" ? ("warn" as Health) : undefined, dashed: r.state === "drifted" })),
    ]
    return { nodes: n, edges: e }
  }, [href, router])

  return (
    <CanvasFrame title="Infrastructure">
    <GraphCanvas
      id="infra"
      nodes={nodes}
      edges={edges}
      placeholder="Find a stack or resource"
      header={<CanvasHeader logo="pulumi" title="Infrastructure" sub="12 stacks · 1 error · 2 drifting" right={<ViewSwitch view="canvas" onChange={onView} module="infra" />} />}
      legend={
        <div className="flex gap-4">
          <LegendItem tone="ok" label="In sync" />
          <LegendItem tone="warn" label="Drift" />
          <LegendItem tone="fail" label="Error" />
        </div>
      }
    />
    </CanvasFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Projects: projects → services → shared platform                     */
/* ------------------------------------------------------------------ */

const OTHER_SERVICES: Record<string, { name: string; status: Health; label: string; logos: string[] }[]> = {
  "supply-chain": [
    { name: "stock-sync", status: "ok", label: "Live", logos: ["kafka", "vault"] },
    { name: "replenish", status: "fail", label: "Stack error", logos: ["pulumi"] },
  ],
  payments: [
    { name: "payment-service", status: "ok", label: "Live", logos: ["postgres", "vault"] },
    { name: "gateway", status: "ok", label: "Live", logos: ["vault", "kafka"] },
  ],
  loyalty: [{ name: "loyalty-gw", status: "ok", label: "Live", logos: ["kafka", "postgres"] }],
}
const PLATFORM = [
  { id: "kafka", label: "Kafka · makro-prod-core", path: "/kafka" },
  { id: "postgres", label: "Postgres", path: "/postgres" },
  { id: "vault", label: "Vault · secret/", path: "/secrets" },
  { id: "pulumi", label: "Pulumi stacks", path: "/infra" },
] as const

export function ProjectsCanvas({ onView }: { onView: (v: ModuleView) => void }) {
  const href = useHref()
  const router = useRouter()
  const { nodes, edges } = React.useMemo(() => {
    const svcs = [
      ...projectServices.map((s) => ({ project: "commerce", name: s.name, status: s.status as Health, label: s.label, logos: [...s.logos] as string[] })),
      ...Object.entries(OTHER_SERVICES).flatMap(([p, list]) => list.map((s) => ({ project: p, ...s }))),
    ]
    const pos = layered(
      [projectCards.map((p) => ({ id: `p-${p.id}`, w: 210, h: 70 })), svcs.map((s) => ({ id: `s-${s.name}`, w: 200, h: 56 })), PLATFORM.map((p) => ({ id: `x-${p.id}`, w: 210, h: 54 }))],
      { rowGap: 18 },
    )
    const n: GraphNode[] = [
      ...projectCards.map((p) => {
        const tone: Health = p.tone === "fail" ? "fail" : p.tone === "dim" ? "idle" : "ok"
        return {
          id: `p-${p.id}`,
          ...pos[`p-${p.id}`],
          w: 210,
          h: 70,
          tone,
          search: `${p.name} ${p.team}`,
          onOpen: () => router.push(href(`/projects/${p.id}`)),
          content: (
            <GraphCard
              icon={<FolderGit2 className="size-3.5 text-subtle" />}
              title={p.name}
              sub={`${p.team} · ${p.role}`}
              status={{ tone, text: p.right ? `${p.services} · ${p.right}` : p.services }}
              emphasis
            />
          ),
        }
      }),
      ...svcs.map((s) => ({
        id: `s-${s.name}`,
        ...pos[`s-${s.name}`],
        w: 200,
        h: 56,
        tone: s.status,
        search: `${s.name} ${s.project}`,
        onOpen: () => router.push(href(`/services/${s.name}`)),
        content: <GraphCard icon={<IntegrationLogo name="kubernetes" className="size-3.5" />} title={s.name} status={{ tone: s.status, text: s.label }} />,
      })),
      ...PLATFORM.map((p) => ({
        id: `x-${p.id}`,
        ...pos[`x-${p.id}`],
        w: 210,
        h: 54,
        search: p.label,
        onOpen: () => router.push(href(p.path)),
        content: <GraphCard icon={<IntegrationLogo name={p.id} className="size-4" />} title={p.label} sub="shared platform" />,
      })),
    ]
    n.push(colLabel("p", "Projects", pos[`p-${projectCards[0].id}`].x, 44), colLabel("s", "Services", pos[`s-${svcs[0].name}`].x, 44), colLabel("x", "Shared platform", pos[`x-${PLATFORM[0].id}`].x, 44))
    const e: GraphEdge[] = [
      ...svcs.map((s) => ({ from: `p-${s.project}`, to: `s-${s.name}`, tone: s.status === "fail" ? ("fail" as Health) : s.status === "warn" ? ("warn" as Health) : undefined })),
      ...svcs.flatMap((s) => s.logos.filter((l) => PLATFORM.some((p) => p.id === l)).map((l) => ({ from: `s-${s.name}`, to: `x-${l}`, flow: s.status !== "fail" }))),
    ]
    return { nodes: n, edges: e }
  }, [href, router])

  return (
    <CanvasFrame title="Projects">
    <GraphCanvas
      id="projects"
      nodes={nodes}
      edges={edges}
      placeholder="Find a project or service"
      header={<CanvasHeader icon={<FolderGit2 className="size-4 text-foreground" />} title="Projects" sub="4 projects · 31 services" right={<ViewSwitch view="canvas" onChange={onView} module="projects" />} />}
      legend={
        <div className="flex gap-4">
          <LegendItem tone="ok" label="Healthy" />
          <LegendItem tone="warn" label="Degraded" />
          <LegendItem tone="fail" label="Failing" />
          <LegendItem tone="idle" label="View only" />
        </div>
      }
    />
    </CanvasFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Secrets: shared parents → projects → environments                   */
/* ------------------------------------------------------------------ */

const PARENT_OF: Record<string, string[]> = {
  "order-service": ["shared/commerce", "platform/observability", "platform/auth"],
  "cart-api": ["shared/commerce", "platform/observability"],
  "price-api": ["platform/observability"],
  "stock-sync": ["platform/observability"],
  gateway: ["commerce/payments-common", "platform/auth", "platform/observability"],
}

export function SecretsCanvas({ onView }: { onView: (v: ModuleView) => void }) {
  const href = useHref()
  const router = useRouter()
  const { nodes, edges } = React.useMemo(() => {
    const projs = secretProjects.map((p) => ({ ...p, slug: p.name.replace(/^[a-z]+-/, "") }))
    const parents = [...new Set(Object.values(PARENT_OF).flat())]
    const envs = projs.flatMap((p) => (p.configs === 2 ? ["dev", "prod"] : ["dev", "qa", "prod"]).map((e) => ({ id: `e-${p.slug}-${e}`, project: p.slug, env: e })))
    const pos = layered(
      [parents.map((p) => ({ id: `pa-${p}`, w: 240, h: 50 })), projs.map((p) => ({ id: `pr-${p.slug}`, w: 230, h: 76 })), envs.map((e) => ({ id: e.id, w: 190, h: 40 }))],
      { rowGap: 14 },
    )
    const n: GraphNode[] = [
      ...parents.map((p) => ({
        id: `pa-${p}`,
        ...pos[`pa-${p}`],
        w: 240,
        h: 50,
        search: p,
        content: <GraphCard icon={<Layers className="size-3.5 text-subtle" />} title={p} mono sub="shared parent" emphasis />,
      })),
      ...projs.map((p) => {
        const tone: Health = p.slug === "order-service" ? "warn" : "ok"
        return {
          id: `pr-${p.slug}`,
          ...pos[`pr-${p.slug}`],
          w: 230,
          h: 76,
          tone,
          search: `${p.slug} ${p.tags.join(" ")}`,
          onOpen: () => router.push(href(`/secrets/${p.slug}`)),
          content: (
            <GraphCard
              icon={<IntegrationLogo name="vault" className="size-4" />}
              title={p.slug}
              mono
              sub={`secret/${p.tags[0]}/${p.slug} · ${p.keys} keys`}
              status={{ tone, text: tone === "warn" ? "SecretID expires in 3d" : `updated ${p.updated}` }}
            />
          ),
        }
      }),
      ...envs.map((e) => ({
        id: e.id,
        ...pos[e.id],
        w: 190,
        h: 40,
        search: `${e.project} ${e.env}`,
        onOpen: () => router.push(href(`/secrets/${e.project}?env=${e.env}`)),
        content: (
          <div className={cn("flex h-full items-center gap-2 rounded-[10px] border bg-surface px-3 text-xs", e.env === "prod" ? "border-warning/40" : "border-line-3")}>
            <KeyRound className="size-3 text-subtle" />
            <span className="text-foreground">{e.env}</span>
            <span className="ml-auto truncate font-mono text-[10.5px] text-subtle">{e.project}</span>
          </div>
        ),
      })),
    ]
    n.push(colLabel("pa", "Inherited from", pos[`pa-${parents[0]}`].x, 44), colLabel("pr", "Projects", pos[`pr-${projs[0].slug}`].x, 44), colLabel("e", "Configs", pos[envs[0].id].x, 44))
    const e: GraphEdge[] = [
      ...projs.flatMap((p) => (PARENT_OF[p.slug] ?? []).map((pa) => ({ from: `pa-${pa}`, to: `pr-${p.slug}`, dashed: true }))),
      ...envs.map((x) => ({ from: `pr-${x.project}`, to: x.id, tone: x.project === "order-service" && x.env === "prod" ? ("warn" as Health) : undefined })),
    ]
    return { nodes: n, edges: e }
  }, [href, router])

  return (
    <CanvasFrame title="Secrets">
    <GraphCanvas
      id="secrets"
      nodes={nodes}
      edges={edges}
      placeholder="Find a project, parent or config"
      header={<CanvasHeader logo="vault" title="Secrets" sub="vault · secret/commerce · 5 projects · 58 keys" right={<ViewSwitch view="canvas" onChange={onView} module="secrets" />} />}
      legend={
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="h-px w-5 border-t border-dashed border-subtle" /> inherits
          </span>
          <LegendItem tone="warn" label="Needs attention" />
        </div>
      }
    />
    </CanvasFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Kafka: producers → topics → consumer groups                         */
/* ------------------------------------------------------------------ */

const FLOWS: Record<string, { producers: string[]; consumers: string[] }> = {
  "orders.created.v1": { producers: ["order-service"], consumers: ["fulfilment", "analytics-etl", "notifications"] },
  "payments.captured.v2": { producers: ["payment-service"], consumers: ["order-service", "ledger", "analytics-etl"] },
  "loyalty.points.redeemed.v1": { producers: ["loyalty-gw"], consumers: [] },
  "inventory.adjusted.v3": { producers: ["stock-sync"], consumers: ["analytics-etl", "fulfilment"] },
  "legacy.erp.sync.v1": { producers: [], consumers: [] },
  "pos.transactions.v1": { producers: ["pos-gateway"], consumers: ["ledger", "analytics-etl"] },
  "pricing.updates": { producers: ["price-api"], consumers: ["cart-api"] },
  "cart.events.v1": { producers: ["cart-api"], consumers: ["analytics-etl"] },
}
const fmtRate = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k/s` : n ? `${n}/s` : "no traffic")

export function KafkaCanvas({ onView }: { onView: (v: ModuleView) => void }) {
  const href = useHref()
  const router = useRouter()
  const { nodes, edges } = React.useMemo(() => {
    const producers = [...new Set(Object.values(FLOWS).flatMap((f) => f.producers))]
    const consumers = [...new Set(Object.values(FLOWS).flatMap((f) => f.consumers))]
    const pos = layered(
      [producers.map((p) => ({ id: `pr-${p}`, w: 180, h: 48 })), topics.map((t) => ({ id: `t-${t.name}`, w: 250, h: 76 })), consumers.map((c) => ({ id: `c-${c}`, w: 180, h: 48 }))],
      { rowGap: 18, colGap: 170 },
    )
    const svcNode = (id: string, name: string, sub: string): GraphNode => ({
      id,
      ...pos[id],
      w: 180,
      h: 48,
      search: name,
      onOpen: () => router.push(href(`/services/${name}`)),
      content: <GraphCard icon={<IntegrationLogo name="kubernetes" className="size-3.5" />} title={name} sub={sub} />,
    })
    const n: GraphNode[] = [
      ...producers.map((p) => svcNode(`pr-${p}`, p, "producer")),
      ...topics.map((t) => {
        const h = TOPIC_HEALTH[t.health]
        return {
          id: `t-${t.name}`,
          ...pos[`t-${t.name}`],
          w: 250,
          h: 76,
          tone: h.tone,
          search: `${t.name} ${t.owner} ${t.cluster}`,
          onOpen: () => router.push(href(`/kafka/topics/${encodeURIComponent(t.name)}`)),
          content: (
            <GraphCard
              icon={<IntegrationLogo name="kafka" mono className="size-3.5" />}
              title={t.name}
              mono
              sub={`${t.cluster} · ${t.partitions}p · ${fmtRate(t.rate)}`}
              status={{ tone: h.tone, text: t.lag ? `${h.label} · ${t.lag} behind` : t.note ? `${h.label} · ${t.note}` : h.label }}
            />
          ),
        }
      }),
      ...consumers.map((c) => svcNode(`c-${c}`, c, "consumer group")),
    ]
    n.push(colLabel("pr", "Producers", pos[`pr-${producers[0]}`].x, 44), colLabel("t", "Topics", pos[`t-${topics[0].name}`].x, 44), colLabel("c", "Consumers", pos[`c-${consumers[0]}`].x, 44))
    const e: GraphEdge[] = topics.flatMap((t) => {
      const f = FLOWS[t.name] ?? { producers: [], consumers: [] }
      const tone = TOPIC_HEALTH[t.health].tone
      const live = t.rate > 0
      return [
        ...f.producers.map((p) => ({ from: `pr-${p}`, to: `t-${t.name}`, flow: live, dashed: !live, tone: tone === "fail" ? ("fail" as Health) : undefined })),
        ...f.consumers.map((c) => ({
          from: `t-${t.name}`,
          to: `c-${c}`,
          flow: live,
          dashed: !live,
          tone: t.health === "lag" && c === "analytics-etl" ? ("warn" as Health) : t.health === "acl" && c === "fulfilment" ? ("fail" as Health) : undefined,
        })),
      ]
    })
    return { nodes: n, edges: e }
  }, [href, router])

  return (
    <CanvasFrame title="Kafka">
    <GraphCanvas
      id="kafka"
      nodes={nodes}
      edges={edges}
      placeholder="Find a topic or service"
      header={<CanvasHeader logo="kafka" title="Kafka" sub="248 topics · 3 clusters · traffic live" right={<ViewSwitch view="canvas" onChange={onView} module="kafka" />} />}
      legend={
        <div className="flex gap-4">
          <LegendItem tone="ok" label="Healthy" />
          <LegendItem tone="warn" label="Lag / in review" />
          <LegendItem tone="fail" label="ACL failing" />
          <LegendItem tone="idle" label="Orphaned" />
        </div>
      }
    />
    </CanvasFrame>
  )
}
