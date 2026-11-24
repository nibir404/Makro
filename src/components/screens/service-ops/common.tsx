"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { Boxes } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMode } from "@/lib/mode"
import { getService } from "@/lib/data"
import { ease } from "@/components/idp/kit"

/** Current path + ?op=… (keeps other params). */
export function useOpHref() {
  const pathname = usePathname() ?? ""
  const sp = useSearchParams()
  return (op: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(sp?.toString())
    p.set("op", op)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return `${pathname}?${p.toString()}`
  }
}

/** Tab body wrapper: canvas gets the service title row; classic chrome comes from the frame. */
export function OpsBody({
  service,
  actions,
  children,
}: {
  service: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const mode = useMode()
  const svc = getService(service)
  if (mode === "classic")
    return <div className="flex flex-1 flex-col gap-6 px-7 py-5">{children}</div>
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-10 py-8">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-[10px] border border-line-3 bg-surface-2">
            <Boxes className="size-4.5 text-foreground" />
          </div>
          <div>
            <div className="text-lg leading-6 font-semibold text-foreground">{svc.name}</div>
            <div className="text-xs text-muted-foreground">
              {svc.namespace} · owned by {svc.owner}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </motion.div>
      {children}
    </div>
  )
}

/** Animated area/line chart (pure SVG). */
export function AreaChart({
  data,
  color = "var(--foreground)",
  height = 100,
  step,
  className,
  delay = 0,
}: {
  data: number[]
  color?: string
  height?: number
  step?: boolean
  className?: string
  delay?: number
}) {
  const w = 600
  const max = Math.max(...data) * 1.15
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - (v / max) * height] as const)
  let d = `M${pts[0][0]},${pts[0][1]}`
  pts.slice(1).forEach(([x, y], i) => {
    d += step ? ` H${x} V${y}` : ` L${x},${y}`
    void i
  })
  const area = `${d} L${w},${height} L0,${height} Z`
  const id = React.useId().replace(/:/g, "")
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn("w-full overflow-visible", className)} style={{ height }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.12" />
          <stop offset="1" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#g${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: delay + 0.3 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease, delay }}
      />
    </svg>
  )
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={cn(
        "relative inline-flex h-5.5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-45",
        on ? "border-foreground bg-foreground" : "border-line-3 bg-surface-3",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn("size-4 rounded-full", on ? "ml-[18px] bg-page" : "ml-0.5 bg-subtle")}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
  className,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  id: string
  className?: string
}) {
  return (
    <div className={cn("flex rounded-[10px] border border-line-3 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex-1 rounded-[7px] px-3 py-1.5 text-xs transition-colors",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && (
            <motion.span layoutId={id} className="absolute inset-0 rounded-[7px] bg-surface-3" transition={{ duration: 0.3, ease }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
