"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Network, Plus, Search, Waypoints } from "lucide-react"
import { cn } from "@/lib/utils"
import { ViewSwitch } from "@/components/screens/platform-canvas"
import { useHref, useMode } from "@/lib/mode"
import { grants as seed, myAccess, reachTargets, type Grant, type GrantState } from "@/lib/data-ext/network-secrets"
import { Btn, IntegrationLogo, StatusDot, Stagger, StaggerItem, ease, useHotkey } from "@/components/idp/kit"
import { Crumbs, Drawer, FilterTabs, Frame, MiniProgress, Modal, Segmented, TableCard, Th } from "./ui"

const TONE: Record<GrantState, string> = {
  expiring: "text-warning",
  active: "text-success",
  pending: "text-warning",
  failed: "text-destructive",
  expired: "text-subtle",
}

function GrantStatus({ g }: { g: Grant }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn("flex items-center gap-1.5 text-[13px]", TONE[g.state])}>
        {g.state === "pending" || g.state === "expired" ? (
          <span className={cn("size-2.5 rounded-full border", g.state === "pending" ? "border-warning" : "border-subtle")} />
        ) : (
          <StatusDot health={g.state === "failed" ? "fail" : g.state === "expiring" ? "warn" : "ok"} pulse={g.state === "expiring"} className="size-2" />
        )}
        {g.label}
      </span>
      {g.left !== undefined && <MiniProgress value={g.left} tone={g.state === "expiring" ? "bg-warning" : "bg-success"} />}
      {g.sub && <span className="text-[11.5px] text-subtle">{g.sub}</span>}
    </div>
  )
}

const REASONS = ["No longer needed", "Task finished", "Security concern", "Other…"]

export function NetworkHeader({ count, onRequest }: { count: number; onRequest: () => void }) {
  const href = useHref()
  const [tab, setTab] = React.useState<"grants" | "groups" | "review" | "lookup">("grants")
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex size-6 items-center justify-center">
          <IntegrationLogo name="netbird" className="size-5" />
        </span>
        <div>
          <h1 className="text-[20px] leading-7 font-semibold tracking-[-0.01em] text-foreground">Network access</h1>
          <p className="text-sm text-muted-foreground">{count} grants · 1 expiring this week</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <ViewSwitch view="list" module="network" hrefs={{ canvas: href("/network/map"), list: href("/network") }} />
        <Segmented
          id="net-top"
          value={tab}
          onChange={setTab}
          options={[
            { value: "grants", label: "Grants", href: href("/network") },
            { value: "groups", label: "Groups", href: href("/network/groups") },
            { value: "review", label: "Review · 9", href: href("/network/review") },
            { value: "lookup", label: "Lookup", href: href("/network/lookup") },
          ]}
        />
        <Btn variant="primary" size="md" kbd="R" onClick={onRequest}>
          Request access
        </Btn>
      </div>
    </div>
  )
}

/** 13a — My access, every state; ?revoke=<id> opens 13b; `request` opens 16e drawer. */
export function GrantsScreen({ initialRequest = false }: { initialRequest?: boolean }) {
  const router = useRouter()
  const href = useHref()
  const sp = useSearchParams()
  const [rows, setRows] = React.useState(seed)
  const [filter, setFilter] = React.useState<"all" | GrantState>("all")
  const [busy, setBusy] = React.useState<string | null>(null)
  const view = sp.get("view")
  const base = href("/network") + (view ? "?view=grants" : "")
  const withRevoke = (id: string) => `${base}${view ? "&" : "?"}revoke=${id}`
  const revokeId = sp.get("revoke")
  const revoking = rows.find((r) => r.id === revokeId)
  const [reason, setReason] = React.useState(REASONS[0])
  const [requestOpen, setRequestOpen] = React.useState(initialRequest)
  useHotkey("r", () => setRequestOpen(true))

  const count = (s: GrantState) => rows.filter((r) => r.state === s).length
  const shown = filter === "all" ? rows : rows.filter((r) => r.state === filter)

  const closeRevoke = () => router.replace(base, { scroll: false })
  const closeRequest = () => {
    setRequestOpen(false)
    if (initialRequest) router.replace(base, { scroll: false })
  }

  const act = (g: Grant) => {
    if (g.state === "active") return router.replace(withRevoke(g.id), { scroll: false })
    if (g.state === "expiring") {
      setBusy(g.id)
      setTimeout(() => {
        setBusy(null)
        const prev = g
        setRows((rs) => rs.map((r) => (r.id === g.id ? { ...r, state: "active", label: "Active · 33 days", left: 1, action: "…" } : r)))
        toast.success(`${g.dest} renewed for 30 days`, {
          action: { label: "Undo", onClick: () => setRows((rs) => rs.map((r) => (r.id === prev.id ? prev : r))) },
        })
      }, 700)
      return
    }
    if (g.state === "failed") {
      setBusy(g.id)
      setTimeout(() => {
        setBusy(null)
        setRows((rs) => rs.map((r) => (r.id === g.id ? { ...r, state: "active", label: "Active · 30 days", sub: undefined, left: 0.95, action: "…" } : r)))
        toast.success(`${g.dest} reachable again · routed via rp-bkk-02`)
      }, 1100)
      return
    }
    if (g.state === "pending") {
      const prev = g
      setRows((rs) => rs.filter((r) => r.id !== g.id))
      toast(`Request for ${g.dest} withdrawn`, { action: { label: "Undo", onClick: () => setRows((rs) => [...rs.slice(0, 3), prev, ...rs.slice(3)]) } })
      return
    }
    setRequestOpen(true)
  }

  const doRevoke = () => {
    if (!revoking) return
    const prev = revoking
    setRows((rs) => rs.map((r) => (r.id === prev.id ? { ...r, state: "expired", label: "Revoked · just now", left: undefined, sub: reason, action: "Request again" } : r)))
    closeRevoke()
    toast(`Access to ${prev.dest} revoked`, {
      description: `Reason: ${reason} · connection drops within a minute`,
      action: { label: "Undo", onClick: () => setRows((rs) => rs.map((r) => (r.id === prev.id ? prev : r))) },
    })
  }

  return (
    <Frame crumbs={<Crumbs items={[{ label: "Network access", icon: <Network className="size-[15px]" /> }]} />}>
      <NetworkHeader count={rows.length} onRequest={() => setRequestOpen(true)} />
      <div className="mt-4 mb-4">
        <FilterTabs
          id="grants"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: rows.length },
            { value: "active", label: "Active", count: count("active") },
            { value: "expiring", label: "Expiring", count: count("expiring"), tone: "text-warning" },
            { value: "pending", label: "Pending", count: count("pending") },
            { value: "failed", label: "Failed", count: count("failed"), tone: "text-destructive" },
            { value: "expired", label: "Expired", count: count("expired"), tone: "text-subtle" },
          ]}
        />
      </div>
      <TableCard>
        <div className="grid h-9 grid-cols-[1fr_170px_260px_140px] items-center border-b border-line px-4">
          <Th>Destination</Th>
          <Th>Group</Th>
          <Th>Time left</Th>
          <span />
        </div>
        <Stagger>
          <AnimatePresence initial={false}>
            {shown.map((g) => (
              <StaggerItem key={g.id} layout exit={{ opacity: 0, height: 0 }}>
                <div
                  className={cn(
                    "grid min-h-[62px] grid-cols-[1fr_170px_260px_140px] items-center border-b border-line px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-2/60",
                    g.state === "expired" && "opacity-55",
                  )}
                >
                  <div>
                    <div className="text-sm text-foreground">{g.dest}</div>
                    <div className="font-mono text-[11px] text-subtle">
                      {g.addr}
                      {g.proto && ` · ${g.proto}`}
                    </div>
                  </div>
                  <span className="text-[13px] text-muted-foreground">{g.group}</span>
                  <GrantStatus g={g} />
                  <div className="flex justify-end">
                    {busy === g.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : g.action === "…" ? (
                      <button
                        aria-label={`Revoke ${g.dest}`}
                        onClick={() => act(g)}
                        className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-foreground"
                        title="Revoke access"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => act(g)}
                        className={cn(
                          "rounded-md px-2 py-1 text-[13px] transition-colors hover:bg-surface-3",
                          g.state === "expiring" || g.state === "failed" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {g.action}
                      </button>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </AnimatePresence>
        </Stagger>
        {shown.length === 0 && <div className="px-4 py-10 text-center text-sm text-subtle">Nothing in this state.</div>}
      </TableCard>

      {/* 13b — revoke confirm (tier 2) */}
      <Modal open={!!revoking} onClose={closeRevoke}>
        {revoking && (
          <>
            <div className="flex flex-col gap-2 px-5.5 pt-5.5 pb-5">
              <h2 className="text-base font-semibold text-foreground">Revoke access to {revoking.dest}?</h2>
              <p className="text-sm leading-5 text-muted-foreground">
                Your connection on {revoking.addr} drops within a minute. You can request it again later; approval takes ~11 min.
              </p>
              <div className="mt-3 text-[13px] text-muted-foreground">Reason (shown in Activity)</div>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={cn(
                      "h-7 rounded-[7px] border px-2.5 text-[12.5px] transition-colors",
                      reason === r ? "border-foreground text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-line-2 bg-page/40 px-5.5 py-4">
              <Btn variant="secondary" onClick={closeRevoke}>
                Keep access
              </Btn>
              <Btn variant="destructive" onClick={doRevoke} autoFocus>
                Revoke now
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <RequestDrawer open={requestOpen} onClose={closeRequest} onSent={(t) => setRows((rs) => [...rs.slice(0, 3), t, ...rs.slice(3)])} />
    </Frame>
  )
}

/** 16e — Request access form. */
function RequestDrawer({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: (g: Grant) => void }) {
  const [q, setQ] = React.useState("kafka-prod-core")
  const [target, setTarget] = React.useState(reachTargets[0])
  const [dur, setDur] = React.useState("7 days")
  const [why, setWhy] = React.useState("Debug consumer lag on inventory.adjusted.v3")
  const [sending, setSending] = React.useState(false)
  const matches = reachTargets.filter((t) => t.id.includes(q.split("-")[0].toLowerCase()) || t.id.includes(q.toLowerCase())).slice(0, 4)

  const send = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      onSent({
        id: `${target.id}-req`,
        dest: target.id,
        addr: target.addr.replace(" · ", ":"),
        group: target.group,
        state: "pending",
        label: `Pending · ${target.approver.split(" ")[0]}`,
        sub: "requested just now",
        action: "Withdraw",
      })
      onClose()
      toast.success(`Request sent to ${target.approver}`, { description: `${target.id} for ${dur} · usually within 15 min` })
    }, 900)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Request access"
      footer={
        <>
          <Btn variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" size="lg" className="flex-1" onClick={send} disabled={!why.trim() || sending}>
            {sending ? <Loader2 className="animate-spin" /> : null}
            {sending ? "Sending…" : "Send request"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-2 p-5">
        <label className="text-[13px] text-muted-foreground">What do you need to reach?</label>
        <div className="flex h-9 items-center gap-2 rounded-[9px] border border-foreground/80 bg-page px-3">
          <Search className="size-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground outline-none" />
        </div>
        <div className="flex flex-col rounded-[10px] border border-line-2 p-1">
          {(matches.length ? matches : reachTargets.slice(0, 2)).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTarget(t)
                setQ(t.id)
              }}
              className={cn(
                "flex h-7.5 items-center justify-between rounded-[7px] px-2.5 text-[12.5px] transition-colors hover:bg-surface-2",
                target.id === t.id ? "bg-surface-2 text-foreground" : "text-muted-foreground",
              )}
            >
              {t.id}
              <span className="font-mono text-[11.5px] text-subtle">{t.addr}</span>
            </button>
          ))}
        </div>

        <label className="mt-3 text-[13px] text-muted-foreground">For how long?</label>
        <Segmented id="req-dur" stretch value={dur} onChange={setDur} options={["4h", "1 day", "7 days", "30 days"].map((v) => ({ value: v, label: v }))} />

        <label className="mt-3 text-[13px] text-muted-foreground">Why?</label>
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={2}
          className="resize-none rounded-[10px] border border-line-3 bg-page px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/60"
        />

        <motion.div layout className="mt-3 flex flex-col gap-1 rounded-[10px] border border-line-2 p-3 text-[12.5px]">
          <span className="text-muted-foreground">Who approves</span>
          <AnimatePresence mode="wait">
            <motion.div key={target.id + dur} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
              <div className="text-foreground">{target.approver} · usually within 15 min</div>
              <div className="mt-1 text-subtle">
                You&apos;ll be added to {target.group} for {dur} through {target.peer}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </Drawer>
  )
}

/** Classic C4b — My access table. */
export function ClassicNetworkAccess() {
  const href = useHref()
  const [tab, setTab] = React.useState("mine")
  return (
    <Frame>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">Network access</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Private hosts you and your services can reach through NetBird</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" href={href("/network/map")}>
            <Waypoints /> Access map
          </Btn>
          <Btn variant="primary" href={href("/network/request")}>
            <Plus /> Request access
          </Btn>
        </div>
      </div>
      <div className="mt-3 mb-5 flex gap-6 border-b border-line-2">
        {[
          ["mine", "My access", "/network"],
          ["groups", "Groups & members", "/network/groups"],
          ["review", "Access review", "/network/review"],
        ].map(([v, l, p]) => (
          <Link key={v} href={href(p)} onClick={() => setTab(v)} className={cn("relative px-0.5 pb-2.5 text-[13px]", tab === v ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {l}
            {tab === v && <motion.span layoutId="c4b-tab" className="absolute right-0 bottom-[-1px] left-0 h-0.5 bg-foreground" />}
          </Link>
        ))}
      </div>
      <TableCard>
        <div className="grid h-10 grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.6fr] items-center border-b border-line px-4">
          <Th>Host</Th>
          <Th>Who</Th>
          <Th>Approved by</Th>
          <Th>Expires</Th>
          <Th>Status</Th>
        </div>
        <Stagger>
          {myAccess.map((a) => (
            <StaggerItem key={a.id}>
              <Link
                href={a.tone === "ok" ? `${href("/network")}?view=grants&revoke=${a.id}` : href("/network?view=grants")}
                className={cn(
                  "grid h-12 grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.6fr] items-center border-b border-line px-4 text-[13px] transition-colors last:border-0 hover:bg-surface-2/60",
                  a.tone === "idle" && "text-subtle",
                )}
              >
                <span className={cn("flex items-center gap-2.5 font-mono text-[12.5px]", a.tone === "idle" ? "text-subtle" : "text-foreground")}>
                  <IntegrationLogo name="netbird" className="size-3.5" />
                  {a.host}
                </span>
                <span className="text-foreground">{a.who}</span>
                <span className={a.approver === "—" ? "text-subtle" : "text-foreground"}>{a.approver}</span>
                <span className={cn(a.expTone === "warn" ? "text-warning" : a.expTone === "muted" ? "text-subtle" : a.expires === "—" ? "text-subtle" : "text-foreground")}>{a.expires}</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    a.tone === "ok" ? "text-success" : a.tone === "busy" ? "text-info" : "text-muted-foreground",
                  )}
                >
                  <StatusDot health={a.tone} className="size-2" />
                  {a.status}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </TableCard>
    </Frame>
  )
}

export function NetworkPageSwitch() {
  const mode = useMode()
  const sp = useSearchParams()
  if (mode === "classic" && !sp.get("view") && !sp.get("revoke")) return <ClassicNetworkAccess />
  return <GrantsScreen />
}
