"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { GitBranch, Plus, Search, ChevronDown, ChevronsUpDown, ChevronRight, Boxes } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { services, type Health, type Service } from "@/lib/data"
import { Btn, GlossCard, IntegrationLogo, Spark, Stagger, StaggerItem, StatusDot, ease } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"

function status(s: Service): [Health, string] {
  const prod = s.envHealth[2]
  if (s.envHealth.includes("fail")) return ["warn", "Degraded"]
  if (prod === "busy") return ["busy", "Deploying"]
  return ["ok", "Live"]
}
const TXT: Record<Health, string> = { ok: "text-success", warn: "text-warning", fail: "text-destructive", busy: "text-info", idle: "text-muted-foreground" }
const sparkOf = (i: number) => Array.from({ length: 14 }, (_, k) => 6 + Math.round(Math.sin(k * 0.8 + i) * 3) + ((k * (i + 2)) % 3))

function useFilter() {
  const [q, setQ] = React.useState("")
  return { q, setQ, list: services.filter((s) => s.name.includes(q.toLowerCase())) }
}

export function CanvasServices() {
  const href = useHref()
  const { q, setQ, list } = useFilter()
  return (
    <div className="dot-grid flex flex-1 flex-col gap-6 px-6 py-7">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Services</h1>
          <p className="text-[13px] text-muted-foreground">36 services in commerce · 3 need attention</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-64 items-center gap-2 rounded-[10px] border border-line-3 bg-surface px-3">
            <Search className="size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <Btn variant="primary" href={href("/services/new")}>
            <Plus /> New service
          </Btn>
        </div>
      </div>
      <Stagger className="grid grid-cols-3 gap-3">
        {list.map((s, i) => {
          const [h, label] = status(s)
          return (
            <StaggerItem key={s.id}>
              <motion.a whileHover={{ y: -3 }} transition={{ duration: 0.2, ease }} href={href(`/services/${s.id}`)} className="block">
                <GlossCard className="flex flex-col gap-4 p-5 transition-shadow hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <IntegrationLogo name="kubernetes" /> {s.name}
                    </span>
                    <span className="flex gap-1">
                      {s.envHealth.map((e, k) => (
                        <StatusDot key={k} health={e} />
                      ))}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{s.host}</div>
                  <div className="flex items-center justify-between">
                    <span className={cn("flex items-center gap-1.5 text-xs", TXT[h])}>
                      <StatusDot health={h} /> {label} · {s.version}
                    </span>
                    <Spark data={sparkOf(i)} tone={h} width={60} height={16} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.logos.map((l) => (
                      <IntegrationLogo key={l} name={l} mono />
                    ))}
                    <span className="ml-auto text-xs text-subtle">{s.resources.length} resources</span>
                  </div>
                </GlossCard>
              </motion.a>
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}

export function ClassicServices() {
  const href = useHref()
  const router = useRouter()
  const { q, setQ, list } = useFilter()
  const crumbs = (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="flex items-center gap-2 font-semibold text-foreground">
        commerce <ChevronsUpDown className="size-3.5 text-subtle" />
      </span>
      <ChevronRight className="size-3.5 text-subtle" />
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <Boxes className="size-3.5" /> Services
      </span>
    </div>
  )
  return (
    <ClassicPage crumbs={crumbs}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Services</h1>
          <p className="text-[13px] text-muted-foreground">36 services in commerce · 3 need attention</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" href={href("/services/new?import=1")}>
            <GitBranch /> Import repo
          </Btn>
          <Btn variant="primary" href={href("/services/new")}>
            <Plus /> New service
          </Btn>
        </div>
      </div>
      <div className="-mt-2 flex gap-2">
        <div className="flex h-8.5 w-80 items-center gap-2 rounded-[9px] border border-line-3 bg-surface px-3">
          <Search className="size-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
        </div>
        {["Team: mine", "Env: prod", "Status"].map((f) => (
          <button key={f} className="flex h-8.5 items-center gap-1 rounded-[9px] border border-dashed border-line-3 px-3 text-xs text-muted-foreground hover:text-foreground">
            {f} <ChevronDown className="size-3" />
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[12px] border border-line-2 bg-surface">
        <div className="grid h-10 grid-cols-[2fr_1.3fr_1fr_1.1fr_1.1fr_0.6fr] items-center border-b border-line-2 px-4 font-mono text-[11px] uppercase tracking-[0.06em] text-subtle">
          <span>Service</span><span>Owner</span><span>Status</span><span>Version · prod</span><span>Traffic</span><span>Updated</span>
        </div>
        {list.map((s, i) => {
          const [h, label] = status(s)
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease }}
              onClick={() => router.push(href(`/services/${s.id}`))}
              className="grid h-12 w-full grid-cols-[2fr_1.3fr_1fr_1.1fr_1.1fr_0.6fr] items-center border-b border-line-2 px-4 text-left text-[13px] last:border-b-0 hover:bg-surface-2"
            >
              <span className="flex items-center gap-2.5 font-mono text-[12.5px] text-foreground">
                <IntegrationLogo name="kubernetes" /> {s.name}
              </span>
              <span className="text-foreground">{s.owner}</span>
              <span className={cn("flex items-center gap-2 text-xs", TXT[h])}>
                <StatusDot health={h} /> {label}
              </span>
              <span className="font-mono text-[12.5px] text-muted-foreground">{s.version}</span>
              <Spark data={sparkOf(i)} tone={h === "ok" ? "idle" : h} width={60} height={16} />
              <span className="text-foreground">{s.deployed.replace("deployed ", "").replace(" ago", "")}</span>
            </motion.button>
          )
        })}
      </div>
    </ClassicPage>
  )
}
