"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ChevronDown, GitBranch, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getService } from "@/lib/data"
import { Btn, ease } from "@/components/idp/kit"
import { OpsBody, Toggle, useOpHref } from "./common"
import Link from "next/link"

const NAV = ["General", "Scaling", "Variables", "Access", "Danger zone"] as const
const TEAMS = ["team-orders", "team-cart", "team-platform"]

export function SettingsScreen({ service }: { service: string }) {
  const svc = getService(service)
  const op = useOpHref()
  const initial = { name: svc.name, owner: svc.owner, repo: svc.repo, approval: true }
  const [saved, setSaved] = React.useState(initial)
  const [form, setForm] = React.useState(initial)
  const [nav, setNav] = React.useState<(typeof NAV)[number]>("General")
  const [paused, setPaused] = React.useState(false)
  const dirty = (Object.keys(form) as (keyof typeof form)[]).filter((k) => form[k] !== saved[k]).length
  const danger = React.useRef<HTMLDivElement>(null)

  const field = "h-9 w-80 rounded-[8px] border border-line-3 bg-surface-2 px-3 text-[13px] text-foreground outline-none focus:border-info"
  const rows = [
    {
      t: "Service name", d: "Used in URLs and the canvas. Lowercase, dashes.",
      c: <input className={cn(field, "font-mono")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />,
    },
    {
      t: "Owner team", d: "Gets approvals and alerts.",
      c: (
        <div className="relative">
          <select className={cn(field, "appearance-none")} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
            {TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-2.5 right-3 size-4 text-subtle" />
        </div>
      ),
    },
    {
      t: "Repository", d: "Deploys on push to main.",
      c: (
        <div className="relative">
          <GitBranch className="absolute top-2.5 left-3 size-4 text-subtle" />
          <input className={cn(field, "pl-9")} value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} />
        </div>
      ),
    },
    {
      t: "Require approval for prod", d: "One reviewer from team-orders.",
      c: <Toggle on={form.approval} onChange={(v) => setForm({ ...form, approval: v })} />,
    },
  ]

  return (
    <OpsBody service={service}>
      <div className="grid grid-cols-[180px_1fr] gap-10">
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n}
              onClick={() => {
                setNav(n)
                if (n === "Danger zone") danger.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                else if (n === "Scaling") window.history.replaceState(null, "", op("scale"))
              }}
              className={cn(
                "relative rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors",
                n === "Danger zone" ? "text-destructive" : nav === n ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {nav === n && <motion.span layoutId="settings-nav" className="absolute inset-0 rounded-[8px] bg-surface-2" transition={{ duration: 0.3, ease }} />}
              <span className="relative">{n}</span>
            </button>
          ))}
          {nav === "Scaling" && <Link href={op("scale")} className="px-2.5 pt-2 text-xs text-info hover:underline">Open scale & autoscaling →</Link>}
          {nav === "Variables" && <Link href={op("edit-config", { env: "qa" })} className="px-2.5 pt-2 text-xs text-info hover:underline">Edit config (YAML) →</Link>}
        </nav>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[14px] border border-line-2 bg-surface">
            {rows.map((r) => (
              <div key={r.t} className="flex items-center justify-between border-b border-line-2 px-4 py-3.5 last:border-0">
                <div>
                  <div className="text-[13px] font-medium text-foreground">{r.t}</div>
                  <div className="text-xs text-subtle">{r.d}</div>
                </div>
                {r.c}
              </div>
            ))}
          </div>

          <div className="flex h-9 items-center justify-end gap-2">
            <AnimatePresence>
              {dirty > 0 && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex items-center gap-2">
                  <span className="text-xs text-subtle">{dirty} unsaved change{dirty > 1 ? "s" : ""}</span>
                  <Btn onClick={() => setForm(saved)}>Discard</Btn>
                  <Btn
                    variant="primary"
                    onClick={() => {
                      const prev = saved
                      setSaved(form)
                      toast.success("Settings saved", { action: { label: "Undo", onClick: () => { setSaved(prev); setForm(prev) } } })
                    }}
                  >
                    Save
                  </Btn>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={danger} className="overflow-hidden rounded-[14px] border border-destructive/25 bg-surface">
            <div className="flex items-center justify-between border-b border-line-2 px-4 py-3.5">
              <div>
                <div className="text-[13px] font-medium text-foreground">{paused ? "Service paused" : "Pause service"}</div>
                <div className="text-xs text-subtle">Scales every environment to 0. Reversible.</div>
              </div>
              <Btn
                onClick={() => {
                  const was = paused
                  setPaused(!was)
                  toast(was ? "Service resumed" : "Service paused · 0 pods", { action: { label: "Undo", onClick: () => setPaused(was) } })
                }}
              >
                {paused ? "Resume" : "Pause"}
              </Btn>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-[13px] font-medium text-foreground">Delete service</div>
                <div className="text-xs text-subtle">Removes 3 environments, 4 resources and history. Type the name to confirm.</div>
              </div>
              <Btn variant="destructive" href={op("delete")}>
                <Trash2 /> Delete…
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </OpsBody>
  )
}
