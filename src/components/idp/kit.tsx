"use client"

import * as React from "react"
import Link from "next/link"
import { motion, type HTMLMotionProps } from "motion/react"
import {
  CircleDashed,
  Clock,
  CircleCheck,
  Loader,
  ScanSearch,
  CircleDot,
  TriangleAlert,
  CircleX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Env, Health, Lifecycle, Logo } from "@/lib/data"

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export function BrandMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.svg" alt="makro IDP" className={cn("size-6 shrink-0 rounded-sm", className)} />
}

export function UserAvatar({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/avatar.svg" alt="Alex Chen" className={cn("size-6.5 shrink-0 rounded-full", className)} />
}

const LOGO_SRC: Record<Logo, string> = {
  argocd: "/logos/argocd.svg",
  kubernetes: "/logos/kubernetes.svg",
  gitlab: "/logos/gitlab.svg",
  vault: "/logos/vault.svg",
  kafka: "/logos/kafka.svg",
  postgres: "/logos/postgres.svg",
  netbird: "/logos/netbird.png",
  pulumi: "/logos/pulumi.svg",
  datadog: "/logos/datadog.svg",
  okta: "/logos/okta.svg",
}
const MONO_SRC: Partial<Record<Logo, string>> = {
  argocd: "/logos/mono-argo.svg",
  kubernetes: "/logos/mono-kubernetes.svg",
  gitlab: "/logos/mono-gitlab.svg",
  vault: "/logos/mono-vault.svg",
  kafka: "/logos/mono-apache-kafka.svg",
  postgres: "/logos/mono-postgresql.svg",
  pulumi: "/logos/mono-pulumi.svg",
  datadog: "/logos/mono-datadog.svg",
}

/** Official integration mark. `mono` renders a theme-aware single-colour version (inline in tables). */
export function IntegrationLogo({
  name,
  mono,
  className,
}: {
  name: Logo
  mono?: boolean
  className?: string
}) {
  const monoSrc = MONO_SRC[name]
  if (mono && monoSrc) {
    return (
      <span
        aria-label={name}
        role="img"
        className={cn("mask-icon inline-block size-3.5 shrink-0 text-muted-foreground", className)}
        style={{ maskImage: `url(${monoSrc})`, WebkitMaskImage: `url(${monoSrc})` }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC[name]}
      alt={name}
      className={cn("size-4 shrink-0 object-contain", name === "netbird" && "rounded-full", className)}
    />
  )
}

/** Glossy tile that frames an integration mark (Foundations · Integrations). */
export function LogoTile({ name, size = "md", className }: { name: Logo; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = size === "sm" ? "size-8 rounded-[8px]" : size === "lg" ? "size-13 rounded-[10px]" : "size-9 rounded-[9px]"
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-6.5" : "size-[18px]"
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-[var(--btn-secondary-edge)] shadow-[var(--btn-secondary-highlight)]",
        box,
        className,
      )}
      style={{ backgroundImage: "var(--btn-secondary-gradient)" }}
    >
      <IntegrationLogo name={name} className={icon} />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Status — "One lifecycle, every module"                              */
/* ------------------------------------------------------------------ */

const LIFECYCLE: Record<
  Lifecycle,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string; spin?: boolean }
> = {
  draft: { label: "Draft", icon: CircleDashed, cls: "text-muted-foreground border-dashed border-line-3" },
  review: { label: "In review", icon: Clock, cls: "text-warning border-warning/30 bg-warning/8" },
  approved: { label: "Approved", icon: CircleCheck, cls: "text-foreground border-line-3 bg-surface-2" },
  applying: { label: "Applying", icon: Loader, cls: "text-info border-info/30 bg-info/8", spin: true },
  verifying: { label: "Verifying", icon: ScanSearch, cls: "text-info border-info/30 bg-info/8" },
  live: { label: "Live", icon: CircleCheck, cls: "text-success border-success/30 bg-success/8" },
  failed: { label: "Failed", icon: TriangleAlert, cls: "text-destructive border-destructive/30 bg-destructive/8" },
  rejected: { label: "Rejected", icon: CircleX, cls: "text-muted-foreground border-line-3 bg-surface-2" },
}

export function StatusPill({
  status,
  label,
  className,
  size = "md",
}: {
  status: Lifecycle
  label?: string
  className?: string
  size?: "sm" | "md"
}) {
  const s = LIFECYCLE[status]
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-5.5 px-2 text-[11px]" : "h-6.5 px-2.5 text-xs",
        s.cls,
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "size-3" : "size-3.5", s.spin && "animate-spin-slow")} />
      {label ?? s.label}
    </span>
  )
}

/** Plain-text status with leading icon — used inline in tables & inspectors. */
export function StatusText({ status, label, className }: { status: Lifecycle; label?: string; className?: string }) {
  const s = LIFECYCLE[status]
  const Icon = s.icon
  const color = s.cls.split(" ")[0]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", color, className)}>
      <Icon className={cn("size-3.5", s.spin && "animate-spin-slow")} />
      {label ?? s.label}
    </span>
  )
}

const DOT: Record<Health, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  fail: "bg-destructive",
  busy: "bg-info",
  idle: "bg-faint",
}

export function StatusDot({ health, pulse, className }: { health: Health; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-[7px] shrink-0", className)}>
      {(pulse || health === "busy" || health === "fail") && (
        <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", DOT[health])} />
      )}
      <span className={cn("relative inline-flex size-full rounded-full", DOT[health])} />
    </span>
  )
}

/** Only PROD is coloured — it's the one that needs care. */
export function EnvChip({ env, className }: { env: Env; className?: string }) {
  if (env === "prod")
    return (
      <span
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 rounded-[5px] border border-warning/70 px-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-warning",
          className,
        )}
      >
        <TriangleAlert className="size-2.5" />
        prod
      </span>
    )
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-[5px] border border-line-3 px-1.5 font-mono text-[10.5px] text-muted-foreground",
        className,
      )}
    >
      {env}
    </span>
  )
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[11px] leading-3.5 text-muted-foreground", className)}>{children}</span>
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

export function Spark({
  data,
  tone = "ok",
  width = 44,
  height = 14,
  step,
  className,
}: {
  data: number[]
  tone?: Health
  width?: number
  height?: number
  step?: boolean
  className?: string
}) {
  if (!data.length) return <span className={cn("inline-block", className)} style={{ width, height }} />
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - 1 - ((v - min) / (max - min || 1)) * (height - 2)
    return [x, y] as const
  })
  const d = step
    ? pts.reduce((acc, [x, y], i) => (i === 0 ? `M${x},${y}` : `${acc} H${x} V${y}`), "")
    : pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const color = { ok: "var(--success)", warn: "var(--warning)", fail: "var(--destructive)", busy: "var(--info)", idle: "var(--faint)" }[tone]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("shrink-0 overflow-visible", className)}>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Buttons — "the action contract"                                     */
/* ------------------------------------------------------------------ */

type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link"
type BtnSize = "xs" | "sm" | "md" | "lg"

const BTN_BASE =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-[filter,background-color,border-color,color,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0"
const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "btn-primary-gloss font-semibold hover:brightness-110",
  secondary: "btn-secondary-gloss text-foreground hover:brightness-125",
  outline: "border border-line-3 bg-transparent text-foreground hover:bg-surface-2",
  ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
  destructive: "border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/18",
  link: "text-primary hover:underline underline-offset-4",
}
const BTN_SIZE: Record<BtnSize, string> = {
  xs: "h-7 rounded-[7px] px-2.5 text-xs [&_svg]:size-3.5",
  sm: "h-8 rounded-[8px] px-3 text-[13px] [&_svg]:size-3.5",
  md: "h-9 rounded-[10px] px-3.5 text-[13px] [&_svg]:size-4",
  lg: "h-10 rounded-[12px] px-4 text-sm [&_svg]:size-4",
}

type BtnProps = {
  variant?: BtnVariant
  size?: BtnSize
  href?: string
  kbd?: string
  className?: string
  children?: React.ReactNode
} & Omit<HTMLMotionProps<"button">, "children">

export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = "secondary", size = "md", href, kbd, className, children, ...props },
  ref,
) {
  const cls = cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)
  const inner = (
    <>
      {children}
      {kbd && (
        <span className={cn("font-mono text-[11px] font-normal", variant === "primary" ? "opacity-60" : "text-muted-foreground")}>
          {kbd}
        </span>
      )}
    </>
  )
  if (href)
    return (
      <motion.span whileTap={{ scale: 0.97 }} className="inline-flex">
        <Link href={href} className={cls}>
          {inner}
        </Link>
      </motion.span>
    )
  return (
    <motion.button ref={ref} whileTap={{ scale: 0.97 }} className={cls} {...props}>
      {inner}
    </motion.button>
  )
})

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function GlossCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-gloss rounded-[18px]", className)} {...props}>
      {children}
    </div>
  )
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[12px] border border-line bg-surface", className)} {...props}>
      {children}
    </div>
  )
}

export function SectionLabel({ children, right, className }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="text-[13px] text-subtle">{children}</div>
      {right}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground", className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

export const ease = [0.22, 1, 0.36, 1] as const

export function FadeIn({
  delay = 0,
  y = 8,
  className,
  children,
  ...props
}: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
  },
}

export function Stagger({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show" className={className} {...props}>
      {children}
    </motion.div>
  )
}
export function StaggerItem({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={stagger.item} className={className} {...props}>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Hotkeys                                                             */
/* ------------------------------------------------------------------ */

export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, opts: { meta?: boolean; enabled?: boolean } = {}) {
  const ref = React.useRef(handler)
  React.useEffect(() => {
    ref.current = handler
  })
  React.useEffect(() => {
    if (opts.enabled === false) return
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      if (opts.meta) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
          e.preventDefault()
          ref.current(e)
        }
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === key) ref.current(e)
    }
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [key, opts.meta, opts.enabled])
}

export const HealthIcon = CircleDot
