"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { Btn, StatusDot, Stagger, StaggerItem, ease, useHotkey } from "@/components/idp/kit"
import { deployHistory, deployRows, deployStats, envVersions } from "@/lib/data-ext/service-ops"
import { OpsBody, useOpHref } from "./common"
import { useRouter } from "next/navigation"

export function DeploysScreen({ service }: { service: string }) {
  const op = useOpHref()
  const router = useRouter()
  const href = useHref()
  useHotkey("p", () => router.push(op("promote")))
  return (
    <OpsBody
      service={service}
      actions={
        <>
          <Btn
            onClick={() =>
              toast("Redeploying v1.40.3 to prod", { description: "Same image, fresh pods", action: { label: "Watch", onClick: () => router.push(op("rollout")) } })
            }
          >
            Redeploy
          </Btn>
          <Btn variant="primary" href={op("promote")}>
            Promote qa <ArrowRight /> prod
          </Btn>
        </>
      }
    >
      <Stagger className="grid grid-cols-3 gap-3">
        {envVersions.map((e) => (
          <StaggerItem
            key={e.env}
            className={cn(
              "card-gloss flex flex-col gap-1.5 rounded-[14px] p-4",
              e.status === "behind" && "border border-warning/30",
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{e.env}</span>
              {e.status === "live" ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <StatusDot health="ok" /> Live
                </span>
              ) : (
                <Link href={op("promote")} className="text-warning hover:underline">
                  {e.behind} behind
                </Link>
              )}
            </div>
            <div className="font-mono text-xl text-foreground">{e.version}</div>
            <div className="text-xs text-subtle">{e.meta}</div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="overflow-hidden rounded-[14px] border border-line-2 bg-surface">
        <div className="grid grid-cols-[140px_90px_1fr_120px_160px_80px_110px] border-b border-line-2 px-4 py-2.5 text-[11px] tracking-wider text-subtle uppercase">
          <span>Version</span><span>Env</span><span>Change</span><span>By</span><span>Status</span><span className="text-right">When</span><span />
        </div>
        {deployRows.map((r, i) => (
          <motion.div
            key={r.version}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease, delay: 0.1 + i * 0.04 }}
            className="group grid grid-cols-[140px_90px_1fr_120px_160px_80px_110px] items-center border-b border-line-2 px-4 py-3 text-[13px] last:border-0 hover:bg-surface-2"
          >
            <span className="font-mono text-foreground">{r.version}</span>
            <span className={r.env === "prod" ? "text-warning" : "text-muted-foreground"}>{r.env}</span>
            <span className="truncate text-foreground">{r.change}</span>
            <span className="text-muted-foreground">{r.by}</span>
            <span>
              {r.status === "live" && <span className="inline-flex items-center gap-1.5 text-success"><StatusDot health="ok" /> Live</span>}
              {r.status === "failed" && <span className="inline-flex items-center gap-1.5 text-destructive"><StatusDot health="fail" /> Failed</span>}
              {r.status === "superseded" && <span className="text-muted-foreground">Superseded</span>}
            </span>
            <span className="text-right text-muted-foreground">{r.when}</span>
            <span className="text-right">
              {r.status === "superseded" ? (
                <Btn size="xs" variant="ghost" className="group-hover:btn-secondary-gloss group-hover:text-foreground" href={op("rollback", { to: r.version })}>
                  Roll back
                </Btn>
              ) : (
                <Link href={href(`/services/${service}/resources`)} className="text-muted-foreground hover:text-foreground">Logs</Link>
              )}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div className="card-gloss rounded-[14px] p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Deploys · last 30 days</span>
            <span className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-foreground"><i className="size-2 bg-foreground" />Succeeded {deployStats.succeeded}</span>
              <span className="flex items-center gap-1.5 text-destructive"><i className="size-2 bg-destructive" />Failed {deployStats.failed}</span>
            </span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {deployHistory.map((d, i) => (
              <motion.div
                key={i}
                title={d.h ? `${Math.round(d.h)} deploys` : "no deploys"}
                initial={{ height: 0 }}
                animate={{ height: d.h ? `${d.h * 10}%` : 8 }}
                transition={{ duration: 0.5, ease, delay: 0.2 + i * 0.015 }}
                className={cn("flex-1", d.failed ? "bg-destructive" : d.h ? "bg-foreground hover:opacity-80" : "bg-surface-3")}
              />
            ))}
          </div>
        </div>
        <div className="card-gloss flex items-center gap-5 rounded-[14px] p-4">
          <Donut value={deployStats.success} />
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <span>Lead time <b className="font-medium text-foreground">{deployStats.lead}</b></span>
            <span>MTTR <b className="font-medium text-foreground">{deployStats.mttr}</b></span>
            <span>Rollbacks <b className="font-medium text-foreground">{deployStats.rollbacks}</b></span>
          </div>
        </div>
      </div>
    </OpsBody>
  )
}

function Donut({ value }: { value: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-destructive" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-foreground"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1, ease, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold text-foreground">{value}%</span>
        <span className="text-[9px] text-subtle">success</span>
      </div>
    </div>
  )
}
