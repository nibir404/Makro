"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { ChevronsUpDown, ChevronRight, Boxes, Plus, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref, useMode } from "@/lib/mode"
import { getService, type Env } from "@/lib/data"
import { Btn, StatusDot } from "@/components/idp/kit"
import { ClassicTopbar } from "@/components/shell/classic-shell"

const TABS = [
  { id: "resources", label: "Resources", path: "" },
  { id: "deploys", label: "Deploys", path: "/deploys" },
  { id: "metrics", label: "Metrics", path: "/metrics" },
  { id: "settings", label: "Settings", path: "/settings" },
]
const ENVS: Env[] = ["dev", "qa", "prod"]

/** Current env from ?env= (defaults to prod). */
export function useServiceEnv(): Env {
  const sp = useSearchParams()
  const e = sp?.get("env")
  return e === "dev" || e === "qa" ? e : "prod"
}

function useActiveTab(service: string) {
  const pathname = usePathname() ?? ""
  const rest = pathname.split(`/services/${service}`)[1] ?? ""
  return TABS.find((t) => t.path && rest.startsWith(t.path))?.id ?? "resources"
}

function Tabs({ service, layoutId, className }: { service: string; layoutId: string; className?: string }) {
  const href = useHref()
  const active = useActiveTab(service)
  const sp = useSearchParams()
  const env = sp?.get("env")
  const q = env ? `?env=${env}` : ""
  return (
    <nav className={cn("flex items-end gap-6", className)}>
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={href(`/services/${service}${t.path}${q}`)}
          className={cn(
            "relative pb-2.5 text-[13px] transition-colors",
            active === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {active === t.id && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-x-[-2px] -bottom-px h-0.5 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
        </Link>
      ))}
    </nav>
  )
}

function EnvSwitch({ service }: { service: string }) {
  const env = useServiceEnv()
  const pathname = usePathname() ?? ""
  const sp = useSearchParams()
  const to = (e: Env) => {
    const p = new URLSearchParams(sp?.toString())
    if (e === "prod") p.delete("env")
    else p.set("env", e)
    const s = p.toString()
    return `${pathname}${s ? `?${s}` : ""}`
  }
  void service
  return (
    <div className="flex h-8 items-center gap-0.5 rounded-[9px] border border-line-2 bg-surface p-0.5">
      {ENVS.map((e) => (
        <Link
          key={e}
          href={to(e)}
          scroll={false}
          className={cn(
            "relative flex h-full items-center gap-1.5 rounded-[7px] px-2.5 text-xs transition-colors",
            env === e ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {env === e && (
            <motion.span
              layoutId="svc-env-pill"
              className="absolute inset-0 rounded-[7px] bg-surface-3"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          {env === e && <span className="relative size-1.5 rounded-full bg-foreground" />}
          <span className="relative">{e}</span>
        </Link>
      ))}
    </div>
  )
}

function CanvasFrame({ service, children }: { service: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-end justify-between border-b border-line px-6">
        <Tabs service={service} layoutId="svc-tab-canvas" />
        <div className="self-center">
          <EnvSwitch service={service} />
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

function ClassicFrame({ service, children }: { service: string; children: React.ReactNode }) {
  const href = useHref()
  const svc = getService(service)
  const env = useServiceEnv()
  const crumbs = (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="flex items-center gap-2 font-semibold text-foreground">
        commerce <ChevronsUpDown className="size-3.5 text-subtle" />
      </span>
      <ChevronRight className="size-3.5 text-subtle" />
      <Link href={href("/services")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Boxes className="size-3.5" /> Services
      </Link>
      <ChevronRight className="size-3.5 text-subtle" />
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Boxes className="size-3.5" /> {svc.name} <ChevronsUpDown className="size-3.5 text-subtle" />
      </span>
      <ChevronRight className="size-3.5 text-subtle" />
      <span className="flex items-center gap-2 font-medium text-foreground">
        <StatusDot health="ok" /> {env} <ChevronsUpDown className="size-3.5 text-subtle" />
      </span>
    </div>
  )
  return (
    <>
      <ClassicTopbar crumbs={crumbs} />
      <div className="flex flex-1 flex-col px-7 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-foreground">{svc.name}</h1>
            <p className="text-[13px] text-muted-foreground">
              {svc.host} · owned by {svc.owner} · repo {svc.repo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" href={href(`/services/${service}`).replace("/classic/", "/canvas/")}>
              <Workflow /> Open in canvas
            </Btn>
            <Btn variant="primary" href={href(`/services/${service}/add`)}>
              <Plus /> Add resource
            </Btn>
          </div>
        </div>
        <Tabs service={service} layoutId="svc-tab-classic" className="mt-4 border-b border-line" />
        <div className="flex flex-1 flex-col py-5">{children}</div>
      </div>
    </>
  )
}

/**
 * Service chrome shared by every /services/[service]/* route.
 * Canvas → sub-header tabs + env switch. Classic → topbar breadcrumb + title block + tabs.
 * Children render the tab body only (no ClassicPage wrapper needed).
 */
export function ServiceFrame({ service, children }: { service: string; children: React.ReactNode }) {
  const mode = useMode()
  const pathname = usePathname() ?? ""
  // add-resource / new flows own the full page
  const bare = service === "new" || /\/services\/[^/]+\/add(\/|$)/.test(pathname)
  if (bare) return <>{children}</>
  return (
    <React.Suspense>
      {mode === "canvas" ? (
        <CanvasFrame service={service}>{children}</CanvasFrame>
      ) : (
        <ClassicFrame service={service}>{children}</ClassicFrame>
      )}
    </React.Suspense>
  )
}
