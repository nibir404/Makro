"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Plus, Users, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { KafkaCanvas, ViewSwitch, useModuleView } from "@/components/screens/platform-canvas"
import { useHref } from "@/lib/mode"
import { Btn, StatusDot, useHotkey } from "@/components/idp/kit"
import { TOPIC_HEALTH, clusterTopics, topics, type Topic } from "@/lib/data-ext/kafka-postgres"
import {
  ActiveChip,
  AddFilterChip,
  ClusterCrumb,
  EmptyRow,
  HealthText,
  LiveSpark,
  ModuleCrumbs,
  ModuleFrame,
  PageHead,
  SearchBox,
  Segmented,
  SortHead,
  TableCard,
  rowMotion,
  useSort,
} from "./ui"

export function KafkaTabs({ active }: { active: "topics" | "users" | "acls" | "requests" }) {
  const href = useHref()
  return (
    <Segmented
      id="kafka"
      active={active}
      items={[
        { key: "topics", label: "Topics", href: href("/kafka") },
        { key: "users", label: "Users", href: href("/kafka/users") },
        { key: "acls", label: "ACLs", href: href("/kafka/acls") },
        { key: "requests", label: "Requests · 3", href: href("/inbox?kind=kafka") },
      ]}
    />
  )
}

const fmtRate = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k/s` : `${n}/s`)

export function KafkaCatalog() {
  const sp = useSearchParams()
  const [mv, setMv] = useModuleView("kafka")
  if (sp.get("view") === "cluster") return <KafkaClusterView />
  if (mv === "canvas") return <KafkaCanvas onView={setMv} />
  return <KafkaTopicCatalog />
}

function KafkaTopicCatalog() {
  const href = useHref()
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = React.useState(sp.get("q") ?? "")
  const [cluster, setCluster] = React.useState<string | null>(sp.get("cluster") === "all" ? null : (sp.get("cluster") ?? "prod-core"))
  const [owner, setOwner] = React.useState<string | null>(sp.get("owner"))
  const [health, setHealth] = React.useState<string | null>(sp.get("health"))
  useHotkey("n", () => router.push(href("/services/order-service/add?type=kafka")))

  const base = topics.filter((t) => (!cluster || t.cluster === cluster) && (!owner || t.owner === owner) && (!health || t.health === health))
  const filtered = base.filter((t) => {
    const s = q.trim().toLowerCase()
    return !s || t.name.includes(s) || t.owner.includes(s) || t.schema.toLowerCase().includes(s)
  })
  const { sorted, sort, onSort } = useSort<Topic>(filtered, { key: "none", dir: "asc" }, (t, k) =>
    k === "name" ? t.name : k === "owner" ? t.owner : k === "partitions" ? t.partitions : k === "rate" ? t.rate : k === "consumers" ? t.consumers : k === "health" ? t.health : topics.indexOf(t),
  )
  const count = (pred: (t: Topic) => boolean) => topics.filter((t) => (!cluster || t.cluster === cluster) && pred(t)).length
  const owners = [...new Set(topics.map((t) => t.owner))]
  const clear = () => {
    setQ("")
    setOwner(null)
    setHealth(null)
  }

  return (
    <ModuleFrame module="kafka" crumbs={<ModuleCrumbs module="kafka" tail={<ClusterCrumb />} />}>
      <PageHead
        logo="kafka"
        title="Kafka"
        sub="248 topics · 3 clusters · 64 / 300 partitions on prod-core"
        right={
          <>
            <ViewSwitch view="list" module="kafka" hrefs={{ canvas: href("/kafka?view=canvas"), list: href("/kafka?view=list") }} />
            <KafkaTabs active="topics" />
            <Btn variant="primary" size="sm" className="h-8.5" href={href("/services/order-service/add?type=kafka")}>
              New topic
            </Btn>
          </>
        }
      />
      <motion.div layout className="flex items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search topics, owners, schemas" />
        <AnimatePresence mode="popLayout">
          {cluster && (
            <ActiveChip key="c" onClear={() => setCluster(null)}>
              Cluster: {cluster}
            </ActiveChip>
          )}
          {owner && (
            <ActiveChip key="o" onClear={() => setOwner(null)}>
              Owner: {owner}
            </ActiveChip>
          )}
          {health && (
            <ActiveChip key="h" onClear={() => setHealth(null)}>
              Health: {TOPIC_HEALTH[health as Topic["health"]].label}
            </ActiveChip>
          )}
        </AnimatePresence>
        {!cluster && (
          <AddFilterChip
            label="Cluster"
            onPick={setCluster}
            options={["prod-core", "prod-edge", "qa"].map((c) => ({ value: c, label: c, count: topics.filter((t) => t.cluster === c).length }))}
          />
        )}
        {!owner && (
          <AddFilterChip label="Owner" onPick={setOwner} options={owners.map((o) => ({ value: o, label: o, count: count((t) => t.owner === o) }))} />
        )}
        {!health && (
          <AddFilterChip
            label="Health"
            onPick={setHealth}
            options={(Object.keys(TOPIC_HEALTH) as Topic["health"][]).map((h) => ({
              value: h,
              label: (
                <>
                  <StatusDot health={TOPIC_HEALTH[h].tone} />
                  {TOPIC_HEALTH[h].label}
                </>
              ),
              count: count((t) => t.health === h),
            }))}
          />
        )}
      </motion.div>

      <TableCard>
        <div className="flex border-b border-line px-4 py-2.5">
          <SortHead label="Topic" k="name" sort={sort} onSort={onSort} className="flex-1" />
          <SortHead label="Owner" k="owner" sort={sort} onSort={onSort} className="w-37.5" />
          <SortHead label="Partitions" k="partitions" sort={sort} onSort={onSort} className="w-30" />
          <SortHead label="Throughput · 24h" k="rate" sort={sort} onSort={onSort} className="w-40" />
          <SortHead label="Consumers" k="consumers" sort={sort} onSort={onSort} className="w-30" />
          <SortHead label="Health" k="health" sort={sort} onSort={onSort} className="flex w-25 justify-end text-right" />
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {sorted.length === 0 && <EmptyRow key="empty" query={q || "filters"} onClear={clear} />}
          {sorted.map((t, i) => {
            const h = TOPIC_HEALTH[t.health]
            const dim = t.health === "orphaned"
            return (
              <motion.div key={t.name} {...rowMotion(i)}>
                <Link
                  href={href(`/kafka/topics/${encodeURIComponent(t.name)}`)}
                  className={cn(
                    "flex items-center border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2",
                    dim && "opacity-60 hover:opacity-100",
                  )}
                >
                  <span className={cn("flex-1 font-mono text-xs/4", dim ? "text-muted-foreground" : "text-foreground")}>{t.name}</span>
                  <span className={cn("w-37.5 shrink-0 text-[13px]/4", dim ? "text-subtle" : "text-muted-foreground")}>{t.owner}</span>
                  <span className={cn("w-30 shrink-0 text-[13px]/4", dim ? "text-subtle" : "text-muted-foreground")}>
                    {t.partitions} · rf {t.rf}
                  </span>
                  <span className="w-40 shrink-0" title={t.rate ? fmtRate(t.rate) : undefined}>
                    {t.rate ? (
                      <LiveSpark base={t.rate} seed={i + t.partitions} trend={t.trend} tone={t.health === "lag" ? "warn" : "neutral"} />
                    ) : (
                      <span className="text-xs/4 text-subtle">{t.note}</span>
                    )}
                  </span>
                  <span className={cn("w-30 shrink-0 text-[13px]/4", t.consumers || t.health === "orphaned" ? "text-muted-foreground" : "text-subtle")}>
                    {t.health === "review" ? "—" : t.lag ? `${t.consumers} · lag ${t.lag}` : t.consumers}
                  </span>
                  <span className="flex w-25 shrink-0 justify-end">
                    <HealthText tone={h.tone}>{h.label}</HealthText>
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </TableCard>
      <p className="text-xs/4 text-subtle">
        Showing {sorted.length} of 248 · open a topic to see its inspector (Details, Config, ACLs, History)
      </p>
    </ModuleFrame>
  )
}

/* C4d · Classic Kafka topics on a cluster */
function KafkaClusterView() {
  const href = useHref()
  const [q, setQ] = React.useState("")
  const rows = clusterTopics.filter((t) => !q || t.name.includes(q.toLowerCase()) || t.owner.includes(q.toLowerCase()))
  const tone = { ok: "text-success", warn: "text-warning", busy: "text-info", fail: "text-destructive", idle: "text-subtle" }
  return (
    <ModuleFrame module="kafka" crumbs={<ModuleCrumbs module="kafka" tail={<ClusterCrumb />} />}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">Kafka topics</h1>
          <p className="text-[13px] text-subtle">48 topics on makro-prod-core · 18.2k msg/s</p>
        </div>
        <div className="flex gap-2">
          <ViewSwitch view="list" module="kafka" hrefs={{ canvas: href("/kafka?view=canvas"), list: href("/kafka?view=list") }} className="h-9" />
          <Btn size="md" href={href("/kafka/users")}>
            <Users /> Users & ACLs
          </Btn>
          <Btn variant="primary" size="md" href={href("/services/order-service/add?type=kafka")}>
            <Plus /> New topic
          </Btn>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search topics…" />
        <AddFilterChip label="Owner" onPick={() => {}} options={clusterTopics.map((t) => ({ value: t.owner, label: t.owner, count: 1 }))} />
        <AddFilterChip label="Status" onPick={() => {}} options={["Live", "Lag rising", "In review"].map((s) => ({ value: s, label: s, count: clusterTopics.filter((t) => t.status === s).length }))} />
      </div>
      <TableCard>
        <div className="flex border-b border-line px-4 py-3">
          <SortHead label="Topic" className="flex-1" />
          <SortHead label="Owner" className="w-52" />
          <SortHead label="Partitions · RF" className="w-44" />
          <SortHead label="Throughput" className="w-44" />
          <SortHead label="Status" className="w-48" />
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {rows.length === 0 && <EmptyRow key="e" query={q} onClear={() => setQ("")} />}
          {rows.map((t, i) => (
            <motion.div key={t.name} {...rowMotion(i)}>
              <Link
                href={href(`/kafka/topics/${t.name}`)}
                className="flex items-center border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-surface-2"
              >
                <span className="flex flex-1 items-center gap-2.5 font-mono text-[13px] text-foreground">
                  <Radio className="size-3.5 text-subtle" />
                  {t.name}
                </span>
                <span className="w-52 text-[13px] text-muted-foreground">{t.owner}</span>
                <span className="w-44 text-[13px] text-muted-foreground">{t.prf}</span>
                <span className="w-44 font-mono text-[13px] text-muted-foreground">{t.tput}</span>
                <span className={cn("flex w-48 items-center gap-2 text-xs", tone[t.tone])}>
                  <StatusDot health={t.tone} />
                  {t.status}
                </span>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </TableCard>
    </ModuleFrame>
  )
}
