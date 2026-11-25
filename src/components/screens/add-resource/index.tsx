"use client"

import { PixelGrid } from "@/components/idp/working"
import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { Search, CornerDownLeft, Database, Clock, CircleCheck, CircleDashed, Loader, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { getService, type Logo } from "@/lib/data"
import {
  addTypes,
  type AddType,
  takenTopics,
  takenRoles,
  pgTargets,
  dbSizes,
  netHosts,
  readStaged,
  readStagedRaw,
  noopSubscribe,
  writeStaged,
  stageChange,
  type StagedChange,
} from "@/lib/data-ext/add-resource"
import { stagedStore } from "@/components/screens/service/store"
import { Btn, IntegrationLogo, Stagger, StaggerItem, useHotkey, ease } from "@/components/idp/kit"
import { FlowPanel, PanelHeader, FieldLabel, HintLine, TextInput, Segmented, KVCard, Toggle, SolidCta, type Hint, inputCls } from "./parts"

function useSvc() {
  const p = useParams<{ service: string }>()
  const id = p?.service ?? "order-service"
  return { id, svc: getService(id) }
}

function TypeIcon({ logo, type, className }: { logo: Logo | null; type?: AddType; className?: string }) {
  if (type === "database") return <Database className={cn("size-4 text-foreground", className)} />
  return logo ? <IntegrationLogo name={logo} className={className} /> : null
}

/* ================================================================== */
/* 04a · pick type                                                     */
/* ================================================================== */

export function AddPick() {
  const { id } = useSvc()
  const href = useHref()
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [active, setActive] = React.useState(0)
  const list = addTypes.filter((t) => (t.name + " " + t.desc).toLowerCase().includes(q.toLowerCase()))
  const go = (t: AddType) => router.push(href(`/services/${id}/add/${t}`))

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(list.length - 1, a + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === "Enter" && list[active]) go(list[active].id)
    else if (e.key === "Escape") router.push(href(`/services/${id}`))
  }

  return (
    <FlowPanel service={id}>
      <PanelHeader title={`Add to ${id}`} close={href(`/services/${id}`)} />
      <div className="px-5 pt-3.5 pb-1">
        <label className="flex h-9.5 items-center gap-2.5 rounded-[8px] border border-foreground/80 bg-surface px-3">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKey}
            placeholder="Search resources…"
            className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <Stagger className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
        {list.length === 0 && <p className="px-2 pt-8 text-center text-[13px] text-subtle">No resource matches “{q}”.</p>}
        {list.map((t, i) => {
          const header = i === 0 || t.group !== list[i - 1].group
          return (
            <StaggerItem key={t.id}>
              {header && <div className="px-2 pt-5 pb-2 text-xs text-muted-foreground">{t.group}</div>}
              <Link
                href={href(`/services/${id}/add/${t.id}`)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "relative flex h-13 items-center gap-3 rounded-[8px] px-2.5 transition-colors",
                  i === active ? "bg-surface-2" : "hover:bg-surface",
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-[7px] border border-line-2 bg-surface">
                  <TypeIcon logo={t.logo} type={t.id} />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[13px] text-foreground">{t.name}</span>
                  <span className="text-xs text-subtle">{t.desc}</span>
                </span>
                {i === active && <CornerDownLeft className="size-3 text-muted-foreground" />}
              </Link>
            </StaggerItem>
          )
        })}
      </Stagger>
      <div className="border-t border-line px-5 py-4 text-xs text-subtle">Tip: drag from a node&apos;s edge to add a linked resource.</div>
    </FlowPanel>
  )
}

/* ================================================================== */
/* 04b · forms                                                         */
/* ================================================================== */

type FormResult = { ok: boolean; change?: StagedChange }

export function AddForm({ type }: { type: AddType }) {
  const { id } = useSvc()
  const href = useHref()
  const router = useRouter()
  const meta = addTypes.find((t) => t.id === type)!
  const [busy, setBusy] = React.useState(false)
  const [tried, setTried] = React.useState(false)
  const submitRef = React.useRef<() => FormResult>(() => ({ ok: false }))

  const submit = () => {
    setTried(true)
    const r = submitRef.current()
    if (!r.ok || !r.change) {
      toast.error("Fix the highlighted fields first")
      return
    }
    setBusy(true)
    const prev = readStaged()
    const prevStore = stagedStore.get()
    stageChange(r.change)
    stagedStore.add({ id: r.change.id, label: `${r.change.label.toLowerCase()} ${r.change.title}` })
    setTimeout(() => {
      toast.success(`Staged ${r.change!.title}`, {
        description: "Nothing is created until the change set is approved.",
        action: {
          label: "Undo",
          onClick: () => {
            writeStaged(prev)
            stagedStore.set(prevStore)
          },
        },
      })
      router.push(href(`/services/${id}/add/review`))
    }, 450)
  }
  useHotkey("enter", submit, { meta: true })

  const foot: Record<AddType, string> = {
    kafka: "Nothing is created yet — it’s staged with your other changes.",
    postgres: "Nothing is created yet — it’s staged with your other changes.",
    database: "You’ll see the Pulumi plan before anything is applied.",
    secret: "Values are encrypted in your browser before they’re staged.",
    network: "Nothing is created yet — it’s staged with your other changes.",
    monitoring: "No redeploy needed — the agent picks this up live.",
  }

  return (
    <FlowPanel service={id}>
      <PanelHeader
        back={href(`/services/${id}/add`)}
        close={href(`/services/${id}`)}
        icon={<TypeIcon logo={meta.logo} type={type} />}
        title={meta.title}
      />
      <motion.form
        key={type}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease }}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-6"
      >
        {type === "kafka" && <KafkaForm svc={id} tried={tried} bind={submitRef} />}
        {type === "postgres" && <PostgresForm svc={id} tried={tried} bind={submitRef} />}
        {type === "database" && <DatabaseForm tried={tried} bind={submitRef} />}
        {type === "secret" && <SecretForm svc={id} tried={tried} bind={submitRef} />}
        {type === "network" && <NetworkForm svc={id} tried={tried} bind={submitRef} />}
        {type === "monitoring" && <MonitoringForm svc={id} tried={tried} bind={submitRef} />}
        <button type="submit" hidden />
      </motion.form>
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
        <SolidCta onClick={submit} loading={busy} disabled={busy}>
          Add to canvas <span className="font-mono text-[11px] font-normal opacity-60">⌘↵</span>
        </SolidCta>
        <p className="text-center text-xs text-subtle">{foot[type]}</p>
      </div>
    </FlowPanel>
  )
}

type FormProps = { tried: boolean; bind: React.MutableRefObject<() => FormResult>; svc?: string }

/* ---------- Kafka ---------- */
function KafkaForm({ svc, tried, bind }: FormProps) {
  const [name, setName] = React.useState("loyalty.points.redeemed.v1")
  const [mode, setMode] = React.useState<"produce" | "consume" | "both">("produce")
  const [edit, setEdit] = React.useState(false)
  const [parts, setParts] = React.useState(6)
  const [days, setDays] = React.useState(7)
  const re = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.v\d+$/
  const err = !name
    ? "Topic name is required"
    : takenTopics.includes(name)
      ? "Already exists on makro-prod-core — pick another version"
      : !re.test(name)
        ? "Must match domain.entity.event.vN (lowercase)"
        : null
  const hint: Hint = err ? (tried || name ? { tone: "err", text: err } : null) : { tone: "ok", text: "Available · matches domain.entity.event.vN" }
  const acl = { produce: "WRITE", consume: "READ", both: "READ, WRITE" }[mode]
  React.useImperativeHandle(bind, () => () => ({
    ok: !err,
    change: {
      id: `kafka-${name}`,
      type: "kafka",
      title: name,
      label: "Kafka topic",
      logo: "kafka",
      lines: [`partitions: ${parts}   replicationFactor: 3`, `retention.ms: ${days * 86400000}`, `acl: svc-${svc} ${acl}`],
    },
  }))
  return (
    <>
      <div>
        <FieldLabel>Topic name</FieldLabel>
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value.trim())} invalid={!!err && (tried || !!name)} />
        <HintLine hint={hint} />
      </div>
      <div>
        <FieldLabel>This service will</FieldLabel>
        <Segmented
          id="kafka-mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "produce", label: "Produce" },
            { value: "consume", label: "Consume" },
            { value: "both", label: "Both" },
          ]}
        />
      </div>
      {edit ? (
        <div className="flex flex-col gap-3 rounded-[10px] border border-line-3 bg-surface p-4">
          <NumRow label="Partitions" value={parts} set={setParts} min={1} max={48} />
          <NumRow label="Retention (days)" value={days} set={setDays} min={1} max={30} />
          <button type="button" onClick={() => setEdit(false)} className="self-end text-xs text-primary hover:underline">
            Done
          </button>
        </div>
      ) : (
        <KVCard
          title="Defaults · from your team's last topic"
          edit={() => setEdit(true)}
          rows={[
            ["Cluster", "makro-prod-core"],
            ["Partitions · RF", `${parts} · 3`],
            ["Retention", `${days} days`],
            ["ACL", <span key="a" className="font-sans">svc-{svc} · {acl}</span>],
          ]}
        />
      )}
      <YamlPreview
        lines={[
          "apiVersion: kafka.strimzi.io/v1beta2",
          "kind: KafkaTopic",
          `metadata: { name: ${name || "…"} }`,
          `spec: { partitions: ${parts}, replicas: 3 }`,
          `  retention.ms: ${days * 86400000}`,
        ]}
      />
    </>
  )
}

function NumRow({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-subtle">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="h-8 w-20 rounded-[7px] border border-line-3 bg-page px-2 text-right font-mono text-[12.5px] text-foreground outline-none focus:border-foreground/70"
      />
    </div>
  )
}

function YamlPreview({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface/60">
      <div className="border-b border-line px-4 py-2 text-[11px] tracking-wide text-subtle uppercase">Preview · staged diff</div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[11.5px] leading-5 text-success">
        {lines.map((l, i) => (
          <motion.div key={l + i} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            + {l}
          </motion.div>
        ))}
      </pre>
    </div>
  )
}

/* ---------- Postgres ---------- */
function PostgresForm({ svc, tried, bind }: FormProps) {
  const [db, setDb] = React.useState(pgTargets[0].id)
  const [role, setRole] = React.useState("svc_order_service_ro")
  const [access, setAccess] = React.useState<"ro" | "rw" | "owner">("ro")
  const norm = role.startsWith("svc_") ? role : `svc_${role}`
  const err = !role
    ? "Role name is required"
    : !/^svc_[a-z0-9_]{3,40}$/.test(norm)
      ? "Lowercase letters, digits and _ only"
      : takenRoles.includes(norm)
        ? "Role already exists on this database"
        : null
  const hint: Hint = err ? { tone: "err", text: err } : { tone: "ok", text: "Available · prefixed with svc_ automatically" }
  const env = { ro: "DATABASE_URL_RO", rw: "DATABASE_URL", owner: "DATABASE_URL_OWNER" }[access]
  const help = {
    ro: "SELECT on schema orders. Change later in the inspector.",
    rw: "SELECT, INSERT, UPDATE, DELETE on schema orders.",
    owner: "Owns schema orders — can run migrations. Needs DBA approval.",
  }[access]
  React.useImperativeHandle(bind, () => () => ({
    ok: !err,
    change: {
      id: `pg-${norm}`,
      type: "postgres",
      title: norm,
      label: "Postgres user",
      logo: "postgres",
      lines: [`database: ${db}`, `grant: ${access === "ro" ? "SELECT" : access === "rw" ? "READ WRITE" : "OWNER"} ON orders`, `vault: secret/${svc}/pg → ${env}`],
    },
  }))
  return (
    <>
      <div>
        <FieldLabel>Database</FieldLabel>
        <div className="relative">
          <IntegrationLogo name="postgres" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <select value={db} onChange={(e) => setDb(e.target.value)} className={cn(inputCls, "appearance-none border-line-3 pl-8")}>
            {pgTargets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-subtle">
            {pgTargets.find((p) => p.id === db)?.note} ⌄
          </span>
        </div>
      </div>
      <div>
        <FieldLabel>Role name</FieldLabel>
        <TextInput autoFocus value={role} onChange={(e) => setRole(e.target.value.trim().toLowerCase())} invalid={!!err && (tried || !!role)} />
        <HintLine hint={hint} />
      </div>
      <div>
        <FieldLabel>Access</FieldLabel>
        <Segmented
          id="pg-access"
          value={access}
          onChange={setAccess}
          options={[
            { value: "ro", label: "Read only" },
            { value: "rw", label: "Read-write" },
            { value: "owner", label: "Owner" },
          ]}
        />
        <p className={cn("pt-2 text-xs", access === "owner" ? "text-warning" : "text-subtle")}>{help}</p>
      </div>
      <KVCard
        title="Where the password goes"
        edit={() => toast("Vault path is fixed by your namespace policy")}
        rows={[
          ["Vault path", `…/${svc}/pg`],
          ["Injected as", env],
          ["Rotation", <span key="r" className="font-sans">Every 30 days</span>],
        ]}
      />
    </>
  )
}

/* ---------- Database / cache / bucket ---------- */
function DatabaseForm({ tried, bind }: FormProps) {
  const [kind, setKind] = React.useState<"pg" | "redis" | "s3">("pg")
  const [name, setName] = React.useState("orders-archive-db")
  const [size, setSize] = React.useState("small")
  const err = !name ? "Name is required" : !/^[a-z][a-z0-9-]{2,30}$/.test(name) ? "3–31 chars, lowercase, digits and -" : null
  const s = dbSizes.find((d) => d.id === size)!
  const mult = kind === "redis" ? 0.6 : kind === "s3" ? 0.1 : 1
  React.useImperativeHandle(bind, () => () => ({
    ok: !err,
    change: {
      id: `db-${name}`,
      type: "database",
      title: name,
      label: kind === "pg" ? "RDS Postgres" : kind === "redis" ? "Redis" : "S3 bucket",
      logo: "pulumi",
      lines: [`stack: commerce-prod`, `size: ${s.name.toLowerCase()} (${s.spec})`, `cost: ~$${Math.round(s.cost * mult)}/mo`],
    },
  }))
  return (
    <>
      <div>
        <FieldLabel>Kind</FieldLabel>
        <Segmented
          id="db-kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "pg", label: "Postgres" },
            { value: "redis", label: "Redis" },
            { value: "s3", label: "S3 bucket" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Name</FieldLabel>
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value.trim())} invalid={!!err && (tried || !!name)} />
        <HintLine hint={err ? { tone: "err", text: err } : null} />
      </div>
      {kind !== "s3" && (
        <div>
          <FieldLabel>Size</FieldLabel>
          <div className="flex gap-1.5">
            {dbSizes.map((d) => {
              const on = d.id === size
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSize(d.id)}
                  className={cn(
                    "relative flex flex-1 flex-col items-start gap-0.5 rounded-[8px] border px-2.5 py-2 text-left transition-colors",
                    on ? "border-line-3" : "border-line-2 hover:border-line-3",
                  )}
                >
                  {on && <motion.span layoutId="db-size" className="absolute inset-0 rounded-[7px] bg-surface-2" />}
                  <span className={cn("relative text-[13px]", on ? "font-medium text-foreground" : "text-muted-foreground")}>{d.name}</span>
                  <span className="relative text-[11px] text-subtle">{d.spec}</span>
                  <span className="relative text-[11px] text-subtle">~${Math.round(d.cost * mult)}/mo</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <KVCard
        title="Defaults · prod"
        edit={() => toast("Open the Pulumi stack to change defaults")}
        rows={[
          ["Pulumi stack", "commerce-prod"],
          ["Region", "ap-southeast-1"],
          ["Backups", <span key="b" className="font-sans">{kind === "s3" ? "Versioning on" : "Daily · kept 7 days"}</span>],
        ]}
      />
      <div className="flex items-start gap-2.5 rounded-[10px] border border-warning/40 bg-warning/8 px-4 py-3 text-xs text-warning">
        <ShieldCheck className="mt-px size-3.5 shrink-0" />
        Prod infra needs team-platform approval · usually under 2h
      </div>
    </>
  )
}

/* ---------- Secret ---------- */
function SecretForm({ svc, tried, bind }: FormProps) {
  const [key, setKey] = React.useState("STRIPE_WEBHOOK_SECRET")
  const [same, setSame] = React.useState(false)
  const [vals, setVals] = React.useState({ dev: "whsec_d1••••••", qa: "whsec_q7••••••", prod: "" })
  const err = !key ? "Key is required" : !/^[A-Z][A-Z0-9_]*$/.test(key) ? "Use UPPER_SNAKE_CASE" : null
  const envs = same ? (["all"] as const) : (["dev", "qa", "prod"] as const)
  const filled = Object.entries(vals).filter(([, v]) => v).map(([k]) => k)
  React.useImperativeHandle(bind, () => () => ({
    ok: !err && filled.length > 0,
    change: {
      id: `secret-${key}`,
      type: "secret",
      title: key,
      label: "Secret",
      logo: "vault",
      lines: [`path: secret/${svc}/${key.toLowerCase()}`, `envs: ${same ? "all" : filled.join(", ")}`, "value: ******** (encrypted)"],
    },
  }))
  return (
    <>
      <div>
        <FieldLabel>Key</FieldLabel>
        <TextInput autoFocus value={key} onChange={(e) => setKey(e.target.value.toUpperCase().replace(/\s/g, "_"))} invalid={!!err} />
        <HintLine hint={err ? { tone: "err", text: err } : { tone: "info", text: "UPPER_SNAKE_CASE · becomes an env var" }} />
      </div>
      <div>
        <FieldLabel
          right={
            <span className="flex items-center gap-2 text-xs text-subtle">
              Same for all <Toggle on={same} onChange={setSame} label="Same for all environments" />
            </span>
          }
        >
          Value per environment
        </FieldLabel>
        <div className="flex flex-col gap-2">
          {envs.map((env) => (
            <motion.div layout key={env} className="flex items-center gap-3">
              <span className={cn("w-9 font-mono text-xs", env === "prod" ? "text-warning" : "text-subtle")}>{env}</span>
              <TextInput
                type="password"
                placeholder="paste value"
                value={env === "all" ? vals.dev : vals[env]}
                onChange={(e) =>
                  setVals((v) => (env === "all" ? { dev: e.target.value, qa: e.target.value, prod: e.target.value } : { ...v, [env]: e.target.value }))
                }
              />
            </motion.div>
          ))}
        </div>
        <p className={cn("pt-2 text-xs", tried && filled.length === 0 ? "text-destructive" : "text-subtle")}>
          {tried && filled.length === 0 ? "Set at least one value. " : "Leave one empty to set it later. "}Have many?{" "}
          <button type="button" onClick={() => toast("Drop a .env file to import keys")} className="text-primary hover:underline">
            Upload .env
          </button>
        </p>
      </div>
      <KVCard
        rows={[
          ["Stored in", `vault · …/${svc}`],
          ["Available", <span key="a" className="font-sans">On next deploy</span>],
          ["Who can read", <span key="w" className="font-sans">team-orders</span>],
        ]}
      />
    </>
  )
}

/* ---------- Network ---------- */
function NetworkForm({ svc, tried, bind }: FormProps) {
  const [host, setHost] = React.useState("inventory-api.internal")
  const [port, setPort] = React.useState("443")
  const [who, setWho] = React.useState<"svc" | "me">("svc")
  const [ttl, setTtl] = React.useState<"8h" | "7d" | "perm">("perm")
  const [reason, setReason] = React.useState("Reserve stock when an order is created")
  const found = netHosts[host]
  const hostErr = !host ? "Host is required" : !found ? "No NetBird group exposes this host" : null
  const reasonErr = reason.trim().length < 10 ? "Give the approver at least 10 characters" : null
  const hint: Hint = found
    ? { tone: "ok", text: `Found · NetBird group ${found.group} · owned by ${found.owner}` }
    : host
      ? { tone: "err", text: hostErr }
      : null
  React.useImperativeHandle(bind, () => () => ({
    ok: !hostErr && !reasonErr && /^\d+$/.test(port),
    change: {
      id: `net-${host}`,
      type: "network",
      title: `Access to ${host.replace(".internal", "")}:${port}`,
      label: "Network",
      logo: "netbird",
      lines: [`group: commerce-${who === "svc" ? svc : "alex.m"}`, `expires: ${ttl === "perm" ? "never" : ttl === "8h" ? "8 hours" : "7 days"}`],
    },
  }))
  return (
    <>
      <div>
        <FieldLabel>Reach</FieldLabel>
        <label className={cn("flex h-9.5 items-center gap-2.5 rounded-[8px] border bg-surface px-3", hostErr && host ? "border-destructive/70" : "border-line-3 focus-within:border-foreground/80")}>
          <Search className="size-3.5 text-muted-foreground" />
          <input
            list="net-hosts"
            autoFocus
            value={host}
            onChange={(e) => setHost(e.target.value.trim())}
            className="flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none"
          />
          <span className="font-mono text-xs text-subtle">:</span>
          <input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} className="w-9 bg-transparent font-mono text-xs text-subtle outline-none" />
        </label>
        <datalist id="net-hosts">
          {Object.keys(netHosts).map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <HintLine hint={hint} />
      </div>
      <div>
        <FieldLabel>Who connects</FieldLabel>
        <Segmented id="net-who" value={who} onChange={setWho} options={[{ value: "svc", label: "This service" }, { value: "me", label: "Me (debug)" }]} />
      </div>
      <div>
        <FieldLabel>For how long</FieldLabel>
        <Segmented
          id="net-ttl"
          value={ttl}
          onChange={setTtl}
          options={[
            { value: "8h", label: "8 hours" },
            { value: "7d", label: "7 days" },
            { value: "perm", label: "Permanent" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Reason</FieldLabel>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className={cn(
            "w-full resize-none rounded-[8px] border bg-surface px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-foreground/80",
            reasonErr && tried ? "border-destructive/70" : "border-line-3",
          )}
        />
        <p className={cn("pt-1.5 text-xs", reasonErr && tried ? "text-destructive" : "text-subtle")}>{reasonErr && tried ? reasonErr : "Shown to the approver."}</p>
      </div>
      <KVCard
        rows={[
          ["Approver", <span key="a" className="font-sans">{found?.owner ?? "—"}</span>],
          ["Policy", `${(svc ?? "").replace("-service", "-svc")} → ${found?.group ?? "?"}:${port}`],
        ]}
      />
    </>
  )
}

/* ---------- Monitoring ---------- */
function MonitoringForm({ svc, tried, bind }: FormProps) {
  const [apm, setApm] = React.useState(true)
  const [logs, setLogs] = React.useState(true)
  const [uptime, setUptime] = React.useState(false)
  const [p95, setP95] = React.useState("800")
  const [errRate, setErrRate] = React.useState("2")
  const [chan, setChan] = React.useState("#orders-alerts")
  const errs = {
    p95: !/^\d+$/.test(p95) || +p95 < 50 ? "≥ 50 ms" : null,
    err: !/^\d+(\.\d+)?$/.test(errRate) || +errRate > 100 ? "0–100" : null,
    chan: !/^#[a-z0-9-]{2,}$/.test(chan) ? "Slack channel like #team-alerts" : null,
    none: !apm && !logs && !uptime ? "Pick at least one signal" : null,
  }
  React.useImperativeHandle(bind, () => () => ({
    ok: !Object.values(errs).some(Boolean),
    change: {
      id: "mon-datadog",
      type: "monitoring",
      title: `Datadog · ${[apm && "APM", logs && "logs", uptime && "uptime"].filter(Boolean).join(" + ")}`,
      label: "Monitoring",
      logo: "datadog",
      lines: [`tags: service:${svc}`, `alert: p95 > ${p95}ms or errors > ${errRate}%`, `notify: ${chan}`],
    },
  }))
  const rows: [string, string, boolean, (v: boolean) => void][] = [
    ["APM traces", "Latency, throughput, errors per endpoint", apm, setApm],
    ["Logs", "stdout · kept 15 days", logs, setLogs],
    ["Uptime check", "GET /healthz every 60s", uptime, setUptime],
  ]
  return (
    <>
      <div>
        <FieldLabel>Collect</FieldLabel>
        <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
          {rows.map(([t, d, on, set], i) => (
            <div key={t} className={cn("flex items-center gap-3 px-3.5 py-3", i > 0 && "border-t border-line")}>
              <span className="flex flex-1 flex-col">
                <span className="text-[13px] text-foreground">{t}</span>
                <span className="text-xs text-subtle">{d}</span>
              </span>
              <Toggle on={on} onChange={set} label={t} />
            </div>
          ))}
        </div>
        {errs.none && tried && <p className="pt-2 text-xs text-destructive">{errs.none}</p>}
      </div>
      <div className="flex flex-col gap-2.5">
        <FieldLabel>Alert me when</FieldLabel>
        {(
          [
            ["p95 latency above", p95, setP95, "ms", errs.p95],
            ["Error rate above", errRate, setErrRate, "%", errs.err],
            ["Notify", chan, setChan, "", errs.chan],
          ] as const
        ).map(([l, v, set, unit, e]) => (
          <div key={l} className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">{l}</span>
            <div className="flex flex-col items-end">
              <label className={cn("flex h-8.5 items-center gap-1.5 rounded-[8px] border bg-surface px-3 focus-within:border-foreground/80", e ? "border-destructive/70" : "border-line-3", unit ? "w-24" : "w-37")}>
                <input value={v} onChange={(ev) => set(ev.target.value)} className="w-full bg-transparent font-mono text-[12.5px] text-foreground outline-none" />
                {unit && <span className="font-mono text-xs text-subtle">{unit}</span>}
              </label>
              {e && <span className="pt-1 text-[11px] text-destructive">{e}</span>}
            </div>
          </div>
        ))}
      </div>
      <KVCard rows={[["Tags", `service:${svc}`], ["Dashboard", <span key="d" className="font-sans">Created for you</span>]]} />
    </>
  )
}

/* ================================================================== */
/* 04c · review change set                                             */
/* ================================================================== */

export function AddReview() {
  const { id } = useSvc()
  const href = useHref()
  const router = useRouter()
  // Staged list lives in sessionStorage: null on the server, read on the client.
  const storedRaw = React.useSyncExternalStore(noopSubscribe, readStagedRaw, () => null)
  const stored = React.useMemo(() => (storedRaw === null ? null : readStaged()), [storedRaw])
  const [edited, setList] = React.useState<StagedChange[] | null>(null)
  const list = edited ?? stored
  const [note, setNote] = React.useState("Points redemption events for the new rewards flow.")
  const [busy, setBusy] = React.useState(false)

  const remove = (c: StagedChange) => {
    const prev = list ?? []
    const next = prev.filter((x) => x.id !== c.id)
    setList(next)
    writeStaged(next)
    stagedStore.remove(c.id)
    if (c.id === "net-warehouse") stagedStore.remove("na-warehouse")
    toast(`Removed ${c.title}`, {
      action: {
        label: "Undo",
        onClick: () => {
          setList(prev)
          writeStaged(prev)
        },
      },
    })
  }
  const submit = () => {
    if (!list?.length) return
    setBusy(true)
    setTimeout(() => {
      stagedStore.clear()
      writeStaged([])
      toast.success(`Submitted ${list.length} change${list.length > 1 ? "s" : ""} · MR !518`)
      router.push(href(`/services/${id}/add/submitted?n=${list.length}`))
    }, 700)
  }
  useHotkey("enter", submit, { meta: true, enabled: !!list?.length && !busy })
  const n = list?.length ?? 0

  return (
    <FlowPanel className="w-[480px]" service={id}>
      <PanelHeader
        title={
          <>
            Review {n} change{n === 1 ? "" : "s"} <span className="font-normal text-subtle">· prod</span>
          </>
        }
        close={href(`/services/${id}`)}
      />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <AnimatePresence initial={false}>
          {list?.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: -16 }}
              transition={{ duration: 0.25, ease }}
              className="group overflow-hidden rounded-[10px] border border-line bg-surface"
            >
              <div className="flex items-center gap-2.5 px-4 py-3">
                <IntegrationLogo name={c.logo} className="size-3.5" />
                <span className={cn("flex-1 truncate text-[13px] text-foreground", c.type !== "network" && "font-mono")}>+ {c.title}</span>
                <span className="text-xs text-subtle">{c.label}</span>
                <button
                  onClick={() => remove(c)}
                  aria-label={`Remove ${c.title}`}
                  className="rounded p-0.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <pre className="border-t border-line bg-success/4 px-4 py-3 font-mono text-[12px] leading-5 text-success">
                {c.lines.map((l) => (
                  <div key={l}>+ {l}</div>
                ))}
              </pre>
            </motion.div>
          ))}
        </AnimatePresence>
        {list && list.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-line-3 px-6 py-10 text-center">
            <CircleDashed className="size-5 text-subtle" />
            <p className="text-[13px] text-muted-foreground">Nothing staged. Add a resource to build a change set.</p>
            <Btn size="sm" href={href(`/services/${id}/add`)}>
              Add resource
            </Btn>
          </div>
        )}
        <div className="pt-1">
          <FieldLabel>
            Note for reviewers <span className="text-subtle">· optional</span>
          </FieldLabel>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={280}
            className="w-full resize-none rounded-[8px] border border-line-3 bg-surface px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-foreground/80"
          />
          <p className="pt-1 text-right text-[11px] text-faint">{note.length}/280</p>
        </div>
        <p className="flex items-center gap-2 text-xs text-subtle">
          <Clock className="size-3.5 text-warning" /> PROD · needs 1 approval from <span className="text-foreground">commerce leads</span> (2 online)
        </p>
      </div>
      <div className="flex gap-2.5 border-t border-line px-5 py-4">
        <Btn variant="secondary" size="lg" href={href(`/services/${id}/add`)}>
          Back
        </Btn>
        <Btn variant="primary" size="lg" className="flex-1" onClick={submit} disabled={!n || busy}>
          {busy && <Loader className="animate-spin" />}
          Submit for approval <span className="font-mono text-[11px] font-normal opacity-60">⌘↵</span>
        </Btn>
      </div>
    </FlowPanel>
  )
}

/* ================================================================== */
/* 04d · submitted → in review → live                                  */
/* ================================================================== */

const STAGES = [
  { id: "submitted", label: "Submitted", sub: "just now · by you" },
  { id: "review", label: "In review", sub: "commerce leads · usually ~18m" },
  { id: "approved", label: "Approved", sub: "by Mai T. · commerce leads" },
  { id: "applying", label: "Applying", sub: "GitOps · Argo / Kafka operator" },
  { id: "live", label: "Live", sub: "Nodes turn solid on the canvas" },
]

export function AddSubmitted() {
  const { id } = useSvc()
  const href = useHref()
  const router = useRouter()
  const sp = useSearchParams()
  const n = Number(sp.get("n") ?? 2)
  const freeze = sp.get("at")
  const startAt = freeze ? Math.max(0, STAGES.findIndex((s) => s.id === freeze)) : 1
  const [at, setAt] = React.useState(startAt)
  const [withdrawn, setWithdrawn] = React.useState(false)

  React.useEffect(() => {
    if (freeze || withdrawn || at >= STAGES.length - 1) return
    const t = setTimeout(() => {
      const next = at + 1
      setAt(next)
      const s = STAGES[next]
      if (s.id === "live") toast.success(`${n} change${n > 1 ? "s" : ""} live on ${id}`, { description: "MR !518 merged and applied." })
      else toast(`${s.label} · MR !518`, { description: s.sub })
    }, at === 1 ? 3200 : 2200)
    return () => clearTimeout(t)
  }, [at, freeze, withdrawn, id, n])

  const withdraw = () => {
    setWithdrawn(true)
    toast("Request withdrawn — changes are back in your draft", {
      action: { label: "Undo", onClick: () => setWithdrawn(false) },
    })
  }
  const done = at === STAGES.length - 1

  return (
    <FlowPanel service={id}>
      <PanelHeader title={withdrawn ? "Request withdrawn" : done ? "Changes are live" : "Request sent"} close={href(`/services/${id}`)} />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <p className="text-[13px] leading-5 text-muted-foreground">
          {n} change{n > 1 ? "s" : ""} · MR <span className="text-foreground">!518</span>.{" "}
          {done ? "Everything was applied — nodes are solid on the canvas." : "You can leave — we’ll notify you here and in Slack."}
        </p>
        <ol className="relative flex flex-col">
          {STAGES.map((s, i) => {
            const state = withdrawn && i > 0 ? "off" : i < at || (done && i === at) ? "done" : i === at ? "active" : "off"
            return (
              <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < STAGES.length - 1 && (
                  <span className="absolute top-5 bottom-0 left-[7.5px] w-px bg-line-3">
                    <motion.span
                      className="block w-full origin-top bg-foreground/60"
                      initial={false}
                      animate={{ scaleY: state === "done" ? 1 : 0 }}
                      transition={{ duration: 0.4, ease }}
                      style={{ height: "100%" }}
                    />
                  </span>
                )}
                <span className="relative z-10 mt-0.5 flex size-4 items-center justify-center bg-page">
                  {state === "done" ? (
                    <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }}>
                      <CircleCheck className={cn("size-4", s.id === "live" ? "text-success" : "text-foreground")} />
                    </motion.span>
                  ) : state === "active" ? (
                    s.id === "review" ? (
                      <Clock className="size-4 text-warning" />
                    ) : (
                      <PixelGrid pattern="ripple" size={3} cell={3.5} gap={1.5} className="mx-px" />
                    )
                  ) : (
                    <CircleDashed className="size-4 text-subtle" />
                  )}
                </span>
                <span className="flex flex-col">
                  <span
                    className={cn(
                      "text-[13px]",
                      state === "active" ? (s.id === "review" ? "text-warning" : "text-info") : state === "done" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className={cn("text-xs", state === "off" ? "text-subtle" : "text-muted-foreground")}>{s.sub}</span>
                </span>
              </li>
            )
          })}
        </ol>
        {!done && !withdrawn && (
          <div className="h-0.5 overflow-hidden rounded-full bg-surface-3">
            <motion.div className="h-full bg-warning" animate={{ width: `${(at / (STAGES.length - 1)) * 100}%` }} transition={{ duration: 0.5, ease }} />
          </div>
        )}
      </div>
      <div className="flex gap-2.5 border-t border-line px-5 py-4">
        <Btn variant="secondary" size="lg" className="flex-1" href={href("/inbox")}>
          View request
        </Btn>
        {done ? (
          <Btn variant="primary" size="lg" className="flex-1" onClick={() => router.push(href(`/services/${id}`))}>
            Back to canvas
          </Btn>
        ) : withdrawn ? (
          <Btn variant="secondary" size="lg" className="flex-1" href={href(`/services/${id}/add/review`)}>
            Edit draft
          </Btn>
        ) : (
          <Btn variant="destructive" size="lg" className="flex-1" onClick={withdraw}>
            Withdraw
          </Btn>
        )}
      </div>
    </FlowPanel>
  )
}

