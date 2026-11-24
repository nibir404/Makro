"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ArrowUpRight, Check, Loader, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { Btn, EnvChip, StatusText, ease } from "@/components/idp/kit"
import { TOPIC_HEALTH, topicAcls, topicConfig, topicConsumers, topics } from "@/lib/data-ext/kafka-postgres"
import { HealthText, LiveSpark, ModuleCrumbs, ModuleFrame, PageHead, Segmented, SortHead, TableCard, rowMotion, useQueryState } from "./ui"

const TABS = ["partitions", "consumers", "acls", "config"] as const
type Tab = (typeof TABS)[number]

export function KafkaTopicDetail() {
  const href = useHref()
  const params = useParams<{ topic: string }>()
  const name = decodeURIComponent(params?.topic ?? "orders.created.v1")
  const t = topics.find((x) => x.name === name) ?? { ...topics[0], name }
  const [tabQ, setTab] = useQueryState("tab")
  const tab: Tab = (TABS as readonly string[]).includes(tabQ ?? "") ? (tabQ as Tab) : "partitions"
  const h = TOPIC_HEALTH[t.health]

  return (
    <ModuleFrame
      module="kafka"
      crumbs={<ModuleCrumbs module="kafka" tail={<span className="font-mono text-sm font-semibold text-foreground">{t.name}</span>} />}
    >
      <PageHead
        logo="kafka"
        title={<span className="font-mono">{t.name}</span>}
        sub={
          <span className="inline-flex items-center gap-2">
            {t.owner} · {t.cluster} · {t.partitions} partitions · rf {t.rf} · retention {t.retention}
            <EnvChip env={t.env} />
          </span>
        }
        right={
          <>
            <HealthText tone={h.tone}>{h.label}</HealthText>
            <Btn size="sm" className="h-8.5" href={href(`/services/order-service/r/${encodeURIComponent(t.name)}`)}>
              Open in service <ArrowUpRight />
            </Btn>
          </>
        }
      />
      <div className="flex items-center justify-between">
        <Segmented
          id="topic-tab"
          active={tab}
          items={TABS.map((k) => ({
            key: k,
            label: { partitions: "Partitions", consumers: "Consumers", acls: "ACLs", config: "Config" }[k],
            onClick: () => setTab(k === "partitions" ? null : k),
          }))}
        />
        <span className="flex items-center gap-2 text-xs text-subtle">
          Throughput {t.rate ? <LiveSpark base={t.rate} seed={3} width={90} height={16} /> : "—"}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease }}
        >
          {tab === "partitions" && <Partitions n={t.partitions} />}
          {tab === "consumers" && <Consumers />}
          {tab === "acls" && <Acls />}
          {tab === "config" && <Config />}
        </motion.div>
      </AnimatePresence>
    </ModuleFrame>
  )
}

function Partitions({ n }: { n: number }) {
  const parts = Array.from({ length: n }, (_, i) => ({ id: i, leader: (i % 3) + 1, isr: i === 7 ? 2 : 3, size: 40 + ((i * 37) % 60) }))
  return (
    <TableCard>
      <div className="grid grid-cols-4 gap-px bg-line md:grid-cols-6">
        {parts.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.025, duration: 0.25, ease }}
            className="flex flex-col gap-2 bg-surface p-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-foreground">p{p.id}</span>
              <span className={cn("text-[11px]", p.isr < 3 ? "text-warning" : "text-subtle")}>ISR {p.isr}/3</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className={cn("h-full rounded-full", p.isr < 3 ? "bg-warning" : "bg-muted-foreground")}
                initial={{ width: 0 }}
                animate={{ width: `${p.size}%` }}
                transition={{ delay: 0.15 + i * 0.025, duration: 0.5, ease }}
              />
            </div>
            <span className="text-[11px] text-subtle">leader broker-{p.leader} · {(p.size * 0.42).toFixed(1)} GB</span>
          </motion.div>
        ))}
      </div>
    </TableCard>
  )
}

function LagChart({ data, warn }: { data: number[]; warn: boolean }) {
  const w = 240
  const hgt = 44
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, hgt - 2 - (v / max) * (hgt - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const color = warn ? "var(--warning)" : "var(--success)"
  return (
    <svg width={w} height={hgt} className="overflow-visible">
      <motion.path d={`${line} L${w},${hgt} L0,${hgt} Z`} fill={color} opacity={0.12} initial={{ opacity: 0 }} animate={{ opacity: 0.12 }} transition={{ delay: 0.4 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease }} />
    </svg>
  )
}

function Consumers() {
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`)
  return (
    <TableCard>
      <div className="flex border-b border-line px-4 py-2.5">
        <SortHead label="Consumer group" className="flex-1" />
        <SortHead label="User" className="w-48" />
        <SortHead label="Members" className="w-24" />
        <SortHead label="Lag · last 1h" className="w-72" />
        <SortHead label="State" className="w-24 text-right" />
      </div>
      {topicConsumers.map((c, i) => {
        const last = c.lag[c.lag.length - 1]
        const warn = last > 10000
        return (
          <motion.div key={c.group} {...rowMotion(i)} className="flex items-center border-b border-line px-4 py-3 last:border-b-0">
            <span className="flex-1 font-mono text-xs text-foreground">{c.group}</span>
            <span className="w-48 font-mono text-xs text-muted-foreground">{c.user}</span>
            <span className="w-24 text-[13px] text-muted-foreground">{c.members}</span>
            <span className="flex w-72 items-center gap-3">
              <LagChart data={c.lag} warn={warn} />
              <span className={cn("font-mono text-xs", warn ? "text-warning" : "text-muted-foreground")}>{fmt(last)}</span>
            </span>
            <span className="flex w-24 justify-end">
              <HealthText tone={warn ? "warn" : "ok"}>{c.state}</HealthText>
            </span>
          </motion.div>
        )
      })}
    </TableCard>
  )
}

function Acls() {
  const [rows, setRows] = React.useState(topicAcls)
  const [busy, setBusy] = React.useState<number | null>(null)
  const retry = (i: number) => {
    setBusy(i)
    setRows((r) => r.map((x, j) => (j === i ? { ...x, status: "applying" } : x)))
    window.setTimeout(() => {
      setRows((r) => r.map((x, j) => (j === i ? { ...x, status: "live" } : x)))
      setBusy(null)
      toast.success("ACL applied", { description: `${topicAcls[i].principal} can now READ orders.created.v1` })
    }, 1600)
  }
  return (
    <TableCard>
      <div className="flex border-b border-line px-4 py-2.5">
        <SortHead label="Principal" className="flex-1" />
        <SortHead label="Operation" className="w-32" />
        <SortHead label="Resource" className="w-80" />
        <SortHead label="Status" className="w-32" />
        <SortHead label="" className="w-20" />
      </div>
      {rows.map((a, i) => (
        <motion.div
          key={a.principal + a.resource}
          {...rowMotion(i)}
          className={cn("flex items-center border-b border-line px-4 py-3 last:border-b-0", a.status === "failed" && "bg-destructive/5")}
        >
          <span className="flex-1 font-mono text-xs text-foreground">User:{a.principal}</span>
          <span className="w-32 font-mono text-xs text-muted-foreground">{a.op}</span>
          <span className="w-80 font-mono text-xs text-muted-foreground">{a.resource}</span>
          <span className="w-32">
            <StatusText status={a.status} label={a.status === "failed" ? "Apply failed" : undefined} />
          </span>
          <span className="flex w-20 justify-end">
            {a.status === "failed" && (
              <Btn size="xs" variant="outline" onClick={() => retry(i)} disabled={busy === i}>
                {busy === i ? <Loader className="animate-spin" /> : <RotateCw />} Retry
              </Btn>
            )}
          </span>
        </motion.div>
      ))}
    </TableCard>
  )
}

function Config() {
  const [vals, setVals] = React.useState<Record<string, string>>(Object.fromEntries(topicConfig))
  const [edit, setEdit] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")
  const save = (k: string) => {
    const prev = vals[k]
    if (draft === prev) return setEdit(null)
    setVals((v) => ({ ...v, [k]: draft }))
    setEdit(null)
    toast(`Staged ${k} → ${draft}`, {
      description: "Change set sent for review on PROD",
      action: { label: "Undo", onClick: () => setVals((v) => ({ ...v, [k]: prev })) },
    })
  }
  return (
    <TableCard>
      {Object.entries(vals).map(([k, v], i) => {
        const changed = v !== Object.fromEntries(topicConfig)[k]
        return (
          <motion.div key={k} {...rowMotion(i)} className="relative flex items-center border-b border-line px-4 py-3 last:border-b-0">
            {changed && <motion.span layoutId={`stg-${k}`} className="absolute inset-y-0 left-0 w-0.5 bg-warning" />}
            <span className="w-72 font-mono text-xs text-muted-foreground">{k}</span>
            {edit === k ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  save(k)
                }}
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setEdit(null)}
                  className="h-7 flex-1 rounded-[6px] border border-primary/60 bg-page px-2 font-mono text-xs text-foreground outline-none"
                />
                <Btn size="xs" variant="primary" type="submit">
                  <Check /> Stage
                </Btn>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEdit(k)
                  setDraft(v)
                }}
                className="flex-1 rounded-[6px] px-2 py-1 text-left font-mono text-xs text-foreground hover:bg-surface-2"
              >
                {v}
                {changed && <span className="ml-2 font-sans text-[11px] text-warning">staged</span>}
              </button>
            )}
          </motion.div>
        )
      })}
    </TableCard>
  )
}

export function TopicLink({ name, className }: { name: string; className?: string }) {
  const href = useHref()
  return (
    <Link className={className} href={href(`/kafka/topics/${name}`)}>
      {name}
    </Link>
  )
}
