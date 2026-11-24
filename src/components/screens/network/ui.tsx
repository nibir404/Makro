"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { ease, useHotkey } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"

/** Page frame — Canvas renders straight under the topbar, Classic wraps in ClassicPage. */
export function Frame({
  crumbs,
  children,
  className,
  bare,
}: {
  crumbs?: React.ReactNode
  children: React.ReactNode
  className?: string
  bare?: boolean
}) {
  const mode = useMode()
  if (mode === "classic")
    return (
      <ClassicPage crumbs={crumbs} bare={bare} className={cn("gap-0 px-10 pt-8 pb-10", className)}>
        {children}
      </ClassicPage>
    )
  if (bare) return <>{children}</>
  return <div className={cn("flex flex-1 flex-col px-10 pt-8 pb-10", className)}>{children}</div>
}

/** Classic breadcrumb trail: "Network access › Groups". */
export function Crumbs({ items }: { items: { label: React.ReactNode; href?: string; icon?: React.ReactNode }[] }) {
  const href = useHref()
  return (
    <span className="flex items-center gap-3 text-sm">
      {items.map((it, i) => {
        const last = i === items.length - 1
        const inner = (
          <span className={cn("flex items-center gap-1.5", last ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {it.icon}
            {it.label}
          </span>
        )
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3.5 text-faint" />}
            {it.href && !last ? <Link href={href(it.href)}>{inner}</Link> : inner}
          </React.Fragment>
        )
      })}
    </span>
  )
}

/** Segmented control with a shared-layout pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  itemClassName,
  stretch,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode; href?: string }[]
  id: string
  className?: string
  itemClassName?: string
  stretch?: boolean
}) {
  return (
    <div className={cn("flex items-center rounded-[10px] border border-line-2 bg-page p-1", stretch && "w-full", className)}>
      {options.map((o) => {
        const active = o.value === value
        const cls = cn(
          "relative flex h-7 items-center justify-center rounded-[7px] px-2.5 text-[12.5px] transition-colors",
          stretch && "flex-1",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          itemClassName,
        )
        const body = (
          <>
            {active && (
              <motion.span layoutId={`seg-${id}`} transition={{ duration: 0.3, ease }} className="absolute inset-0 rounded-[7px] bg-surface-3" />
            )}
            <span className="relative">{o.label}</span>
          </>
        )
        return o.href ? (
          <Link key={o.value} href={o.href} className={cls} onClick={() => onChange(o.value)}>
            {body}
          </Link>
        ) : (
          <button key={o.value} type="button" className={cls} onClick={() => onChange(o.value)}>
            {body}
          </button>
        )
      })}
    </div>
  )
}

/** Text filter tabs ("All 6 · Active 2 …") with sliding pill. */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number; tone?: string }[]
  id: string
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn("relative h-7 rounded-[7px] px-2.5 text-[13px] transition-colors", o.tone ?? (active ? "text-foreground" : "text-muted-foreground hover:text-foreground"))}
          >
            {active && <motion.span layoutId={`ft-${id}`} transition={{ duration: 0.3, ease }} className="absolute inset-0 rounded-[7px] bg-surface-2" />}
            <span className="relative">
              {o.label}
              {o.count !== undefined && ` ${o.count}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function TableCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-[14px] border border-line-2 bg-surface", className)}>{children}</div>
}

export function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <span className={cn("text-[11px] font-medium tracking-[0.08em] text-subtle uppercase", className)}>{children}</span>
}

/** Centered modal with scrim. */
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
  useHotkey("escape", () => onClose(), { enabled: open })
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 light:bg-black/25" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.25, ease }}
            className={cn("relative w-[500px] overflow-hidden rounded-[16px] border border-line-3 bg-surface shadow-2xl", className)}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Right-hand spring drawer (440px). */
export function Drawer({
  open,
  onClose,
  title,
  right,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  right?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  useHotkey("escape", () => onClose(), { enabled: open })
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/35 light:bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 460 }}
            animate={{ x: 0 }}
            exit={{ x: 460 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed top-14 right-0 bottom-0 z-50 flex w-[440px] flex-col border-l border-line-2 bg-surface"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line-2 px-5">
              <div className="text-[15px] font-semibold text-foreground">{title}</div>
              <div className="flex items-center gap-3">
                {right}
                <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
            {footer && <div className="flex shrink-0 gap-2 border-t border-line-2 p-5">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Initials({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9.5px] font-medium text-muted-foreground", className)}>
      {children}
    </span>
  )
}

export { UserAvatar as MeAvatar } from "@/components/idp/kit"

/** Vault triangle mark. */
export function VaultMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 shrink-0", className)} aria-hidden>
      <path d="M2 3h20L12 22z" fill="#FFD814" />
      <path d="M9 7h1.6v1.6H9zM11.2 7h1.6v1.6h-1.6zM13.4 7H15v1.6h-1.6zM11.2 9.2h1.6v1.6h-1.6zM11.2 11.4h1.6V13h-1.6z" fill="#000" />
    </svg>
  )
}

export function MiniProgress({ value, tone }: { value: number; tone: string }) {
  return (
    <span className="block h-[3px] w-40 overflow-hidden rounded-full bg-surface-3">
      <motion.span className={cn("block h-full rounded-full", tone)} initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.7, ease }} />
    </span>
  )
}
