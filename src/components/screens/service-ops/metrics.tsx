"use client"

import * as React from "react"
import { ChevronDown, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Btn, Stagger, StaggerItem } from "@/components/idp/kit"
import { metricSeries } from "@/lib/data-ext/service-ops"
import { OpsBody } from "./common"
import { AreaChart } from "./common"
import { cn } from "@/lib/utils"

const RANGES = ["Last 1h", "Last 24h", "Last 7d"] as const

function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 700)
      setV(to * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
}

function Card({
  title, value, unit, decimals, right, rightTone, data, color, height, delay,
}: {
  title: string; value: number; unit: string; decimals?: number; right?: string; rightTone?: string
  data: number[]; color: string; height: number; delay: number
}) {
  return (
    <StaggerItem className="card-gloss flex flex-col gap-2 rounded-[14px] p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{title}</span>
        {right && <span className={cn("text-subtle", rightTone)}>{right}</span>}
      </div>
      <div className="mb-4 text-[22px] font-semibold text-foreground tabular-nums">
        <CountUp to={value} decimals={decimals} /> <span className="text-xs font-normal text-subtle">{unit}</span>
      </div>
      <AreaChart data={data} color={color} height={height} delay={delay} />
    </StaggerItem>
  )
}

export function MetricsScreen({ service }: { service: string }) {
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("Last 24h")
  return (
    <OpsBody service={service}>
      <div className="-mb-2 flex justify-end gap-2">
        <Btn
          onClick={() => {
            const next = RANGES[(RANGES.indexOf(range) + 1) % RANGES.length]
            setRange(next)
          }}
        >
          {range} <ChevronDown />
        </Btn>
        <Btn variant="outline" onClick={() => toast("Opening Datadog dashboard…")}>
          <ExternalLink /> Open in Datadog
        </Btn>
      </div>
      <Stagger key={range} className="grid grid-cols-6 gap-3">
        <div className="col-span-3 grid">
          <Card title="Requests / s" value={1284} unit="req/s" data={metricSeries.rps} color="var(--foreground)" height={110} delay={0} />
        </div>
        <div className="col-span-3 grid">
          <Card title="p95 latency" value={412} unit="ms" right="spike 14:10" rightTone="text-warning" data={metricSeries.p95} color="var(--warning)" height={110} delay={0.1} />
        </div>
        <div className="col-span-2 grid">
          <Card title="Error rate" value={0.42} decimals={2} unit="%" right="SLO 1%" data={metricSeries.err} color="var(--destructive)" height={80} delay={0.2} />
        </div>
        <div className="col-span-2 grid">
          <Card title="CPU · 3 pods" value={38} unit="%" data={metricSeries.cpu} color="var(--foreground)" height={80} delay={0.25} />
        </div>
        <div className="col-span-2 grid">
          <Card title="Memory" value={612} unit="MiB" right="limit 1 GiB" data={metricSeries.mem} color="var(--info)" height={80} delay={0.3} />
        </div>
      </Stagger>
    </OpsBody>
  )
}
