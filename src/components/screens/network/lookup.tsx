"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Check, Loader2, Minus, Network, Search, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { lookupUser, orgMismatches } from "@/lib/data-ext/network-secrets"
import { Btn, Stagger, StaggerItem, ease } from "@/components/idp/kit"
import { Crumbs, Frame, Initials, TableCard, Th } from "./ui"

function Count({ to }: { to: number }) {
  const [n, setN] = React.useState(0)
  React.useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      i++
      setN(Math.min(to, i))
      if (i >= to) clearInterval(t)
    }, 90)
    return () => clearInterval(t)
  }, [to])
  return <>{n}</>
}

/** 13d — User lookup + mismatches. */
export function LookupScreen() {
  const [q, setQ] = React.useState("mia.romero")
  const [rows, setRows] = React.useState(lookupUser.rows)
  const [fixing, setFixing] = React.useState<string | null>(null)
  const found = "mia romero".includes(q.toLowerCase().replace(".", " ")) || q.startsWith("10.")
  const open = rows.filter((r) => r.mismatch)

  const fix = (groups: string[]) => {
    setFixing(groups.join())
    setTimeout(() => {
      const prev = rows
      setRows((rs) => rs.map((r) => (groups.includes(r.group) ? { ...r, okta: true, netbird: true, idp: true, mismatch: false, action: "in sync" } : r)).filter((r) => !(groups.includes(r.group) && r.group === "commerce-order")))
      setFixing(null)
      toast.success(groups.length > 1 ? "Both mismatches fixed for Mia" : `${groups[0]} fixed for Mia`, { action: { label: "Undo", onClick: () => setRows(prev) } })
    }, 900)
  }

  return (
    <Frame crumbs={<Crumbs items={[{ label: "Network access", href: "/network", icon: <Network className="size-[15px]" /> }, { label: "Lookup" }]} />}>
      <h1 className="text-[20px] font-semibold text-foreground">Who can reach what</h1>
      <p className="text-sm text-muted-foreground">Look up a person or an IP. Mismatches between Okta, NetBird and IDP are flagged.</p>
      <div className="mt-4 flex h-10 items-center gap-2.5 rounded-[10px] border border-foreground/80 px-4">
        <Search className="size-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground outline-none" placeholder="Name, email or IP" />
      </div>

      <AnimatePresence mode="wait">
        {found ? (
          <motion.div key="hit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-[340px_1fr] gap-3">
              <div className="flex flex-col gap-3 rounded-[12px] border border-line-2 bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Initials className="size-9 text-[11px]">{lookupUser.initials}</Initials>
                  <div>
                    <div className="text-sm text-foreground">{lookupUser.name}</div>
                    <div className="text-[12px] text-subtle">{lookupUser.sub}</div>
                  </div>
                </div>
                {lookupUser.stats.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[12.5px]">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <TableCard className="rounded-[12px]">
                <div className="grid h-9 grid-cols-[1fr_80px_80px_80px_140px] items-center border-b border-line px-4">
                  <Th>Group</Th>
                  <Th className="text-center">Okta</Th>
                  <Th className="text-center">NetBird</Th>
                  <Th className="text-center">IDP</Th>
                  <span />
                </div>
                <AnimatePresence initial={false}>
                  {rows.map((r) => (
                    <motion.div
                      layout
                      key={r.group}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn("grid h-[41px] grid-cols-[1fr_80px_80px_80px_140px] items-center border-b border-line px-4 text-sm last:border-0", r.mismatch && r.action === "Remove" && "bg-warning/5")}
                    >
                      <span className="text-foreground">{r.group}</span>
                      {[r.okta, r.netbird, r.idp].map((v, i) => (
                        <span key={i} className="flex justify-center">
                          {v ? <Check className="size-3.5 text-success" /> : <Minus className="size-3.5 text-subtle" />}
                        </span>
                      ))}
                      <span className="flex justify-end">
                        {fixing?.includes(r.group) ? (
                          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        ) : r.mismatch ? (
                          <button onClick={() => fix([r.group])} className="rounded px-1.5 py-0.5 text-[12.5px] text-foreground hover:bg-surface-3">
                            {r.action}
                          </button>
                        ) : (
                          <span className="text-[12.5px] text-subtle">in sync</span>
                        )}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </TableCard>
            </div>

            <AnimatePresence>
              {open.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between rounded-[12px] border border-warning/25 bg-warning/6 px-4 py-3"
                >
                  <span className="flex items-center gap-2.5 text-sm text-warning">
                    <TriangleAlert className="size-4" />
                    {open.length} mismatch{open.length > 1 ? "es" : ""} for Mia · fixing {open.length > 1 ? "both " : ""}removes prod order access and grants CRM access
                  </span>
                  <Btn size="sm" variant="secondary" onClick={() => fix(open.map((r) => r.group))} disabled={!!fixing}>
                    {fixing && fixing.includes(",") && <Loader2 className="animate-spin" />}
                    Fix {open.length > 1 ? "both" : "it"}
                  </Btn>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="miss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-[12px] border border-dashed border-line-3 px-4 py-10 text-center text-sm text-subtle">
            No person or host matches “{q}”.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 mb-3 text-[11px] font-medium tracking-[0.08em] text-subtle uppercase">Org-wide · 7 open mismatches</div>
      <Stagger className="grid grid-cols-3 gap-3">
        {orgMismatches.map((m) => (
          <StaggerItem key={m.label}>
            <button
              onClick={() => toast(`${m.n} ${m.label}`, { description: m.n ? "Opening filtered lookup…" : "Nothing to fix" })}
              className="w-full rounded-[12px] border border-line-2 bg-surface px-4 py-4 text-left transition-colors hover:border-line-3 hover:bg-surface-2"
            >
              <div className="text-[22px] font-semibold text-foreground tabular-nums">
                <Count to={m.n} />
              </div>
              <div className="text-[12.5px] text-muted-foreground">{m.label}</div>
            </button>
          </StaggerItem>
        ))}
      </Stagger>
    </Frame>
  )
}
