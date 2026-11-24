"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { X, ArrowLeft, CircleCheck, TriangleAlert, Loader } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMode } from "@/lib/mode"
import { ease, IntegrationLogo } from "@/components/idp/kit"
import { getService } from "@/lib/data"
import { ClassicPage } from "@/components/shell/classic-page"
import { useStaged } from "@/components/screens/service/store"

/** Right-side flow panel. Canvas: sits under topbar + tabs. Classic: full height over the topbar. */
export function FlowPanel({
  children,
  top = "bar",
  className,
  service,
}: {
  children: React.ReactNode
  top?: "tabs" | "bar"
  className?: string
  /** render the service page backdrop behind the panel (add-resource flow owns its full layout) */
  service?: string
}) {
  const mode = useMode()
  return (
    <>
    {service && <ServiceBackdrop service={service} />}
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className={cn(
        "fixed right-0 bottom-0 z-50 flex w-[380px] flex-col border-l border-line bg-page shadow-[-24px_0_48px_-24px_#000] light:shadow-[-24px_0_48px_-24px_#0002]",
        mode === "classic" ? "top-0" : top === "tabs" ? "top-24" : "top-14",
        className,
      )}
    >
      {children}
    </motion.aside>
    </>
  )
}

function ServiceBackdrop({ service }: { service: string }) {
  const mode = useMode()
  const svc = getService(service)
  const staged = useStaged()
  const body = (
    <div className="flex flex-col gap-4 pr-[400px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold text-foreground">{svc.name}</h1>
        <p className="text-[13px] text-subtle">
          {svc.host} · owned by {svc.owner} · repo {svc.repo}
        </p>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-line opacity-70">
        {svc.resources.map((r) => (
          <div key={r.id} className="flex h-12 items-center gap-3 border-b border-line px-4 last:border-0">
            <IntegrationLogo name={r.logo} className="size-3.5" />
            <span className="w-64 truncate font-mono text-[13px] text-foreground">{r.name}</span>
            <span className="text-[13px] text-muted-foreground">{r.typeLabel}</span>
          </div>
        ))}
      </div>
      {staged.length > 0 && (
        <div className="rounded-[12px] border border-line px-4 py-3.5 text-[13px] text-muted-foreground">
          {staged.length} change{staged.length > 1 ? "s" : ""} staged — {staged.map((s) => s.label).join(", ")}
        </div>
      )}
    </div>
  )
  if (mode === "classic") return <ClassicPage crumbs={<span className="text-[15px] font-semibold text-foreground">{svc.name}</span>}>{body}</ClassicPage>
  return <div className="dot-grid min-h-[calc(100vh-56px)] w-full px-7 py-6">{body}</div>
}

export function PanelHeader({
  title,
  icon,
  back,
  close,
  right,
}: {
  title: React.ReactNode
  icon?: React.ReactNode
  back?: string
  close?: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-5">
      {back && (
        <Link href={back} aria-label="Back" className="-ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
      )}
      {icon}
      <span className="flex-1 truncate text-[15px] font-semibold text-foreground">{title}</span>
      {right}
      {close && (
        <Link href={close} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
          <X className="size-4" />
        </Link>
      )}
    </div>
  )
}

export function FieldLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pb-2">
      <span className="text-[13px] text-foreground">{children}</span>
      {right}
    </div>
  )
}

export type Hint = { tone: "ok" | "err" | "info"; text: React.ReactNode } | null

export function HintLine({ hint }: { hint: Hint }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {hint && (
        <motion.p
          key={String(hint.tone) + String(typeof hint.text === "string" ? hint.text : "")}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease }}
          className={cn(
            "flex items-start gap-1.5 pt-2 text-xs",
            hint.tone === "ok" ? "text-success" : hint.tone === "err" ? "text-destructive" : "text-subtle",
          )}
        >
          {hint.tone === "ok" && <CircleCheck className="mt-px size-3.5 shrink-0" />}
          {hint.tone === "err" && <TriangleAlert className="mt-px size-3.5 shrink-0" />}
          <span>{hint.text}</span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export const inputCls =
  "h-9.5 w-full rounded-[8px] border bg-surface px-3 font-mono text-[13px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-foreground/80 focus:ring-2 focus:ring-foreground/10"

export function TextInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(inputCls, invalid ? "border-destructive/70 focus:border-destructive" : "border-line-3", className)}
    />
  )
}

/** Segmented control with shared-layout pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  id: string
}) {
  return (
    <div className="flex gap-1.5" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative h-8.5 flex-1 rounded-[8px] border text-[13px] transition-colors",
              on ? "border-line-3 text-foreground" : "border-line-2 text-subtle hover:border-line-3 hover:text-muted-foreground",
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[7px] bg-surface-2"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className={cn("relative", on && "font-medium")}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function KVCard({
  title,
  edit,
  rows,
}: {
  title?: React.ReactNode
  edit?: () => void
  rows: [React.ReactNode, React.ReactNode, boolean?][]
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-4">
      {title && (
        <div className="flex items-center justify-between text-[13px] text-subtle">
          <span>{title}</span>
          {edit && (
            <button type="button" onClick={edit} className="text-xs text-primary hover:underline">
              Edit
            </button>
          )}
        </div>
      )}
      {rows.map(([k, v, mono], i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-subtle">{k}</span>
          <span className={cn("text-right text-foreground", mono !== false && "font-mono text-[12.5px]")}>{v}</span>
        </div>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-5 w-8.5 shrink-0 items-center rounded-full border transition-colors",
        on ? "border-foreground bg-foreground" : "border-line-3 bg-surface-3",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
        className={cn("size-3.5 rounded-full", on ? "ml-auto mr-0.5 bg-page" : "ml-0.5 bg-subtle")}
      />
    </button>
  )
}

/** White "Add to canvas" style CTA used at the bottom of every form. */
export function SolidCta({
  children,
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      {...(props as object)}
      className={cn(
        "flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-foreground text-[13px] font-semibold text-page transition-[filter,opacity] hover:brightness-90 disabled:opacity-45",
        className,
      )}
    >
      {loading && <Loader className="size-3.5 animate-spin" />}
      {children}
    </motion.button>
  )
}
