"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { useMode } from "@/lib/mode"
import { ClassicPage } from "@/components/shell/classic-page"
import { ease } from "@/components/idp/kit"

/** Page frame shared by both modes: canvas = padded column under topbar, classic = ClassicPage. */
export function Screen({
  crumbs,
  children,
  className,
}: {
  crumbs?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const mode = useMode()
  if (mode === "classic")
    return (
      <ClassicPage crumbs={crumbs} className={cn("gap-4", className)}>
        {children}
      </ClassicPage>
    )
  return <div className={cn("flex w-full flex-1 flex-col gap-4 px-10 pt-8 pb-7", className)}>{children}</div>
}

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-faint">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-foreground">
              {it.label}
            </Link>
          ) : (
            <span className="text-foreground">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  )
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[14px] border border-line-2 bg-surface", className)} {...p}>
      {children}
    </div>
  )
}

/** Segmented control with shared-layout pill. */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  id,
  className,
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  id: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center rounded-[10px] border border-line-2 bg-surface p-[3px]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative h-7 flex-1 rounded-[7px] px-2.5 text-[13px] transition-colors",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[7px] bg-surface-3" transition={{ duration: 0.3, ease }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  React.useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn("w-full max-w-[480px] rounded-[16px] border border-line-3 bg-surface p-6 shadow-2xl", className)}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <span className={cn("text-[11px] font-medium tracking-[0.08em] text-subtle uppercase", className)}>{children}</span>
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  "h-9 w-full rounded-[9px] border border-line-3 bg-page px-3 text-[14px] text-foreground outline-none placeholder:text-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20"

/** Count-up number. */
export function CountUp({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
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
  return (
    <>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </>
  )
}
