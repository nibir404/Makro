"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { CircleCheck, CheckCheck, TriangleAlert, Inbox as InboxIcon, Loader } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { inbox as seed, type InboxItem } from "@/lib/data"
import { doneItems, inboxListMeta, myInFlight, prodConfirm, rejectReasons } from "@/lib/data-ext/inbox-activity"
import { Btn, EnvChip, IntegrationLogo, Kbd, StatusPill, StatusText, useHotkey, ease } from "@/components/idp/kit"
import { ClassicPage } from "@/components/shell/classic-page"

type Tab = "review" | "mine" | "done"

function useInbox() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [items, setItems] = React.useState<InboxItem[]>(() => (params.get("state") === "clear" ? [] : seed))
  const [busy, setBusy] = React.useState(false)
  const tab = (params.get("tab") as Tab) || "review"
  const selId = params.get("item") ?? items[0]?.id
  const sel = items.find((i) => i.id === selId) ?? items[0]
  const confirm = params.get("confirm") === "1"
  const reject = params.get("reject") === "1"
  const tracked = tab === "mine" ? myInFlight : tab === "done" ? doneItems : []
  const trackedSel = tracked.find((t) => t.id === params.get("item")) ?? tracked[0]

  const setQ = React.useCallback(
    (patch: Record<string, string | null>) => {
      const q = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) q.delete(k)
        else q.set(k, v)
      }
      const s = q.toString()
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  const remove = (it: InboxItem, verb: "Approved" | "Rejected") => {
    const idx = items.findIndex((i) => i.id === it.id)
    const rest = items.filter((i) => i.id !== it.id)
    setItems(rest)
    const next = rest[Math.min(idx, rest.length - 1)]
    setQ({ item: next ? next.id : null, confirm: null, reject: null })
    const fn = verb === "Approved" ? toast.success : toast
    fn(`${verb} ${it.ref}`, {
      description: verb === "Approved" ? `Opens MR ${it.mr} · applies after merge` : `Returned to ${it.by} as "Changes requested"`,
      action: {
        label: "Undo",
        onClick: () => {
          setItems((cur) => {
            const c = [...cur]
            c.splice(idx, 0, it)
            return c
          })
          setQ({ item: it.id })
        },
      },
    })
  }

  const approve = (force = false) => {
    if (!sel || tab !== "review") return
    if (sel.env === "prod" && !force) return setQ({ confirm: "1", reject: null })
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      remove(sel, "Approved")
    }, 550)
  }
  const doReject = () => sel && remove(sel, "Rejected")
  const move = (d: 1 | -1) => {
    if (tab !== "review") {
      const i = tracked.findIndex((x) => x.id === trackedSel?.id)
      const n = tracked[Math.max(0, Math.min(tracked.length - 1, i + d))]
      if (n) setQ({ item: n.id })
      return
    }
    if (!sel) return
    const i = items.findIndex((x) => x.id === sel.id)
    const n = items[Math.max(0, Math.min(items.length - 1, i + d))]
    if (n) setQ({ item: n.id })
  }
  const overlay = confirm || reject
  useHotkey("j", () => move(1), { enabled: !overlay })
  useHotkey("k", () => move(-1), { enabled: !overlay })
  useHotkey("a", () => approve(), { enabled: !overlay })
  useHotkey("r", () => setQ({ reject: "1", confirm: null }), { enabled: !overlay && !!sel })
  useHotkey("escape", () => setQ({ confirm: null, reject: null }), { enabled: overlay })

  return { items, sel, tab, confirm, reject, busy, setQ, approve, doReject, tracked, trackedSel }
}
type Ctl = ReturnType<typeof useInbox>

/* ---------------- Shared pieces ---------------- */

function Tabs({ ctl, classic }: { ctl: Ctl; classic?: boolean }) {
  const n = ctl.items.length
  const tabs: [Tab, string, string][] = classic
    ? [["review", "Needs me", ` · ${n}`], ["mine", "Mine in flight", ` · ${myInFlight.length}`], ["done", "Done", ""]]
    : [["review", "To review", ` ${n}`], ["mine", "My requests", ` ${myInFlight.length}`], ["done", "Done", ""]]
  return (
    <div className={cn("flex items-center", classic ? "gap-1.5" : "gap-4")}>
      {tabs.map(([k, l, c]) => {
        const on = ctl.tab === k
        return classic ? (
          <button
            key={k}
            onClick={() => ctl.setQ({ tab: k === "review" ? null : k, item: null })}
            className={cn(
              "relative h-7 rounded-full border px-2.5 text-[12.5px] transition-colors",
              on ? "border-transparent text-page" : "border-line-3 text-muted-foreground hover:text-foreground",
            )}
          >
            {on && <motion.span layoutId="inbox-tab-c" className="absolute inset-0 -z-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative">{l}{c}</span>
          </button>
        ) : (
          <button
            key={k}
            onClick={() => ctl.setQ({ tab: k === "review" ? null : k, item: null })}
            className={cn("relative pb-1 text-[13px] transition-colors", on ? "text-foreground" : "text-subtle hover:text-foreground")}
          >
            {l}
            <span className="text-subtle">{c}</span>
            {on && <motion.span layoutId="inbox-tab" className="absolute right-0 -bottom-px left-0 h-px bg-foreground" />}
          </button>
        )
      })}
    </div>
  )
}

function Diff({ item, classic }: { item: InboxItem; classic?: boolean }) {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className={cn("overflow-hidden rounded-[10px] border", classic ? "border-line-2 bg-surface" : "border-line-2 bg-success/[0.025]")}
    >
      {!classic && (
        <div className="flex items-center justify-between border-b border-line-2 px-3.5 py-2.5">
          <span className="font-mono text-[12px] text-muted-foreground">{item.file}</span>
          <span className="text-[11.5px] text-subtle">+{item.diff.length} · new file</span>
        </div>
      )}
      <pre className="px-4 py-4 font-mono text-[12.5px] leading-[22px] text-success">
        {item.diff.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
            + {l}
          </motion.div>
        ))}
      </pre>
    </motion.div>
  )
}

function ConfirmDialog({ ctl }: { ctl: Ctl }) {
  const [busy, setBusy] = React.useState(false)
  const go = () => {
    setBusy(true)
    setTimeout(() => ctl.approve(true), 500)
  }
  return (
    <AnimatePresence>
      {ctl.confirm && ctl.sel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-page/60 backdrop-blur-[1px]"
          onClick={() => ctl.setQ({ confirm: null })}
        >
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[460px] rounded-[14px] border border-line-3 bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2.5">
              <TriangleAlert className="size-4.5 text-warning" />
              <h2 className="text-[17px] font-semibold text-foreground">Approve change to production?</h2>
            </div>
            <div className="mt-5 flex flex-col gap-2 rounded-[8px] border border-line-3 px-3.5 py-3">
              {prodConfirm.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">{k}</span>
                  <span className={cn("text-foreground", k !== "Affects" && "font-mono")}>{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] leading-5 text-muted-foreground">{prodConfirm.body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => ctl.setQ({ confirm: null })}>Cancel</Btn>
              <Btn variant="primary" autoFocus onClick={go} className="ring-2 ring-primary/50 ring-offset-2 ring-offset-surface">
                {busy && <Loader className="animate-spin" />} Approve &amp; apply
              </Btn>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function RejectPanel({ ctl }: { ctl: Ctl }) {
  const [reason, setReason] = React.useState(0)
  const [text, setText] = React.useState("Expected volume is ~200 msg/s — 6 partitions is plenty. Please resubmit with 6.")
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="flex flex-col gap-3.5 border-t border-line-2 px-9 pt-6 pb-5"
    >
      <span className="text-[13px] text-foreground">
        Why are you rejecting? <span className="text-subtle">· {ctl.sel?.by} will see this</span>
      </span>
      <div className="flex gap-1.5">
        {rejectReasons.map((r, i) => (
          <button
            key={r}
            onClick={() => setReason(i)}
            className={cn(
              "h-7 rounded-full border px-2.5 text-[12px] transition-colors",
              reason === i ? "border-line-3 bg-surface-3 text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-18 resize-none rounded-[8px] border border-foreground/80 bg-transparent px-3 py-2.5 text-[13px] text-foreground outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-subtle">The request returns to the author as &quot;Changes requested&quot;.</span>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => ctl.setQ({ reject: null })}>Cancel</Btn>
          <Btn variant="destructive" disabled={!text.trim()} onClick={ctl.doReject}>Reject request</Btn>
        </div>
      </div>
    </motion.div>
  )
}

function AllClear() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <motion.span initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }} className="flex size-13 items-center justify-center rounded-[12px] border border-line-3 bg-surface-2">
        <CheckCheck className="size-5 text-foreground" />
      </motion.span>
      <h2 className="text-[17px] font-semibold text-foreground">You&apos;re all caught up</h2>
      <p className="max-w-[360px] text-[13.5px] leading-5.5 text-muted-foreground">New requests for your namespaces land here instantly. We&apos;ll also ping you in Slack if one waits more than 2h.</p>
      <p className="text-[12.5px] text-subtle">
        Approved today · <span className="text-foreground">6</span> · Avg review time · <span className="text-foreground">18m</span>
      </p>
    </motion.div>
  )
}

const STEPS = ["Requested", "Review", "Approved", "Applying", "Live"]

function OtherList({ ctl }: { ctl: Ctl }) {
  return (
    <div className="flex flex-col">
      {ctl.tracked.map((r, i) => {
        const on = ctl.trackedSel?.id === r.id
        return (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => ctl.setQ({ item: r.id })}
            className={cn("relative flex items-start gap-3 border-b border-line-2 px-5 py-4 text-left transition-colors", on ? "bg-surface-2/60" : "hover:bg-surface/60")}
          >
            {on && <motion.span layoutId={`track-sel-${ctl.tab}`} className="absolute top-0 bottom-0 left-0 w-0.5 bg-foreground" />}
            <IntegrationLogo name={r.logo} mono={r.logo !== "netbird"} className="mt-0.5 size-4" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[13.5px] text-foreground">{r.title}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{r.target}</span>
              <span className="flex items-center gap-2 text-[11.5px] text-subtle">
                {r.env === "prod" ? <EnvChip env="prod" className="h-4.5" /> : <span className="font-mono">{r.env}</span>}
                <StatusText status={r.status} className="text-[11.5px]" />
              </span>
            </div>
            <span className="text-[11.5px] text-subtle">{r.age}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

function TrackedDetail({ ctl }: { ctl: Ctl }) {
  const href = useHref()
  const r = ctl.trackedSel
  const [busy, setBusy] = React.useState(false)
  if (!r) return null
  const failed = r.status === "failed" || r.status === "rejected"
  const act = () => {
    if (r.action === "Open service") return
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      toast.success(r.action === "Retry apply" ? "Apply re-queued" : r.action === "Nudge reviewers" ? "Nudged nattaya.k and ploy.w on Slack" : "Opened as draft", { description: `${r.title} · ${r.target}` })
    }, 700)
  }
  return (
    <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-9 pt-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">{r.title}</h1>
            <EnvChip env={r.env} />
            <StatusPill status={r.status} size="sm" />
          </div>
          <p className="font-mono text-[13px] text-muted-foreground">{r.target}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((st, i) => {
            const done = i < r.step || (i === r.step && r.status === "live")
            const cur = i === r.step && !done
            return (
              <div key={st} className="flex flex-1 flex-col gap-2">
                <div className="h-1 overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: done ? "100%" : cur ? (failed ? "100%" : "55%") : 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5, ease }}
                    className={cn("h-full rounded-full", done ? "bg-success" : failed ? "bg-destructive" : "bg-info")}
                  />
                </div>
                <span className={cn("text-[11.5px]", done || cur ? "text-foreground" : "text-subtle")}>{st}</span>
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-[10.5px] tracking-[0.08em] text-subtle uppercase">Timeline</span>
          {r.timeline.map(([t, l, k], i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="grid grid-cols-[86px_16px_1fr] items-center text-[13px]">
              <span className="font-mono text-[12px] text-subtle">{t}</span>
              {k === "ok" ? <CircleCheck className="size-3.5 text-success" /> : k === "fail" ? <TriangleAlert className="size-3.5 text-destructive" /> : k === "busy" ? <Loader className="size-3.5 animate-spin text-info" /> : <span className="ml-1 size-1.5 rounded-full bg-faint" />}
              <span className={k === "fail" ? "text-destructive" : k === "wait" ? "text-subtle" : "text-foreground"}>{l}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex h-17 items-center justify-between border-t border-line-2 px-9">
        <span className="text-[13px] text-muted-foreground">{r.note ?? r.sub}</span>
        {r.action &&
          (r.action === "Open service" ? (
            <Btn variant="secondary" href={href("/services/order-service")}>Open service</Btn>
          ) : (
            <Btn variant={r.action === "Retry apply" ? "primary" : "secondary"} onClick={act}>
              {busy && <Loader className="animate-spin" />} {r.action}
            </Btn>
          ))}
      </div>
    </motion.div>
  )
}

/* ================= Canvas 03a–03d ================= */

export function CanvasInbox() {
  return <InboxBody />
}

function InboxBody() {
  const ctl = useInbox()
  const { items, sel, tab } = ctl
  const showList = tab === "review"
  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0">
      <aside className="flex w-[440px] shrink-0 flex-col border-r border-line-2">
        <div className="flex h-13 items-end border-b border-line-2 px-5 pb-3">
          <Tabs ctl={ctl} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {showList ? (
            <AnimatePresence initial={false}>
              {items.map((it) => {
                const on = sel?.id === it.id
                return (
                  <motion.button
                    key={it.id}
                    layout
                    exit={{ opacity: 0, x: -40, height: 0, transition: { duration: 0.3, ease } }}
                    onClick={() => ctl.setQ({ item: it.id, confirm: null, reject: null })}
                    className={cn("relative flex w-full items-start gap-3 overflow-hidden border-b border-line-2 px-5 py-4 text-left transition-colors", on ? "bg-surface-2/60" : "hover:bg-surface/60")}
                  >
                    {on && <motion.span layoutId="inbox-sel" className="absolute top-0 bottom-0 left-0 w-0.5 bg-foreground" />}
                    <IntegrationLogo name={it.logo} mono={it.logo !== "netbird"} className="mt-0.5 size-4" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[13.5px] text-foreground">{it.title}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">{it.target}</span>
                      <span className="flex items-center gap-2 text-[11.5px] text-subtle">
                        {it.env === "prod" ? <EnvChip env="prod" className="h-4.5" /> : <span className="font-mono">{it.env}</span>}
                        {it.by} · {it.ns}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-subtle">{it.age}</span>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          ) : (
            <OtherList ctl={ctl} />
          )}
        </div>
        <div className="flex h-11 items-center border-t border-line-2 px-5 font-mono text-[11px] text-subtle">J / K move · A approve · R reject</div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        {showList && sel ? (
          <>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-9 pt-8">
              <motion.div key={sel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">{sel.title}</h1>
                  <EnvChip env={sel.env} />
                </div>
                <p className="text-[13.5px] text-muted-foreground">
                  {sel.ref} · requested by {sel.by} {sel.age} ago{sel.note && <> · &quot;{sel.note}&quot;</>}
                </p>
              </motion.div>
              <Diff item={sel} />
              <div className="flex flex-col gap-2.5 pt-2">
                <span className="text-[12.5px] text-muted-foreground">Pre-apply checks</span>
                <div className="flex flex-wrap gap-6">
                  {sel.checks.map((c, i) => (
                    <motion.span key={c.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex items-center gap-2 text-[13px] text-foreground">
                      <CircleCheck className="size-3.5 text-success" /> {c.label}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              {ctl.reject ? (
                <RejectPanel key="rej" ctl={ctl} />
              ) : (
                <motion.div key="bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-17 items-center justify-between border-t border-line-2 px-9">
                  <span className="text-[13px] text-muted-foreground">
                    Approving opens MR <span className="font-mono text-foreground">{sel.mr}</span> and applies automatically after merge.
                  </span>
                  <div className="flex gap-2.5">
                    <Btn variant="secondary" kbd="R" onClick={() => ctl.setQ({ reject: "1" })}>Reject</Btn>
                    <Btn variant="primary" kbd="A" onClick={() => ctl.approve()}>
                      {ctl.busy && <Loader className="animate-spin" />} Approve
                    </Btn>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : showList ? (
          <AllClear />
        ) : (
          <TrackedDetail ctl={ctl} />
        )}
      </section>
      <ConfirmDialog ctl={ctl} />
    </div>
  )
}

/* ================= Classic C3a / C03b–d ================= */

export function ClassicInbox() {
  const layout = useSearchParams().get("layout")
  if (layout === "pills") return <ClassicInboxPills />
  return (
    <ClassicPage bare crumbs={<span className="flex items-center gap-2 text-[14px] font-medium text-foreground"><InboxIcon className="size-4" /> Inbox</span>}>
      <InboxBody />
    </ClassicPage>
  )
}

/** C3a variant (pill tabs, compact rows) — /classic/inbox?layout=pills */
function ClassicInboxPills() {
  const ctl = useInbox()
  const { items, sel, tab } = ctl
  const showList = tab === "review"
  return (
    <ClassicPage
      bare
      crumbs={
        <span className="flex items-center gap-2 text-[14px] font-medium text-foreground">
          <InboxIcon className="size-4" /> Inbox
        </span>
      }
    >
      <div className="flex h-[calc(100vh-56px)] min-h-0">
        <aside className="flex w-[400px] shrink-0 flex-col border-r border-line-2">
          <div className="px-4 py-3.5">
            <Tabs ctl={ctl} classic />
          </div>
          <div className="flex-1 overflow-y-auto">
            {showList ? (
              <AnimatePresence initial={false}>
                {items.map((it) => {
                  const on = sel?.id === it.id
                  const m = inboxListMeta[it.id]
                  return (
                    <motion.button
                      key={it.id}
                      layout
                      exit={{ opacity: 0, x: -40, height: 0, transition: { duration: 0.3, ease } }}
                      onClick={() => ctl.setQ({ item: it.id, confirm: null, reject: null })}
                      className={cn("relative flex w-full items-start gap-3 overflow-hidden border-b border-line-2 px-4 py-4 text-left transition-colors", on ? "bg-surface" : "hover:bg-surface/60")}
                    >
                      {on && <motion.span layoutId="inbox-sel-c" className="absolute top-0 bottom-0 left-0 w-0.5 bg-foreground" />}
                      <span className="flex size-8 items-center justify-center rounded-[8px] border border-line-3 bg-surface-2">
                        <IntegrationLogo name={it.logo} mono={it.logo !== "netbird"} className="size-3.5" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[13px] text-foreground">{m?.classicTitle ?? `${it.title} to ${it.target}`}</span>
                        <span className="text-[12px] text-subtle">{m?.classicMeta ?? `${it.by} · #103 · yesterday`}</span>
                      </div>
                      <EnvChip env={it.env} />
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            ) : (
              <OtherList ctl={ctl} />
            )}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          {showList && sel ? (
            <>
              <div className="flex flex-col gap-1.5 border-b border-line-2 px-7 py-6">
                <div className="flex items-center gap-2.5">
                  <IntegrationLogo name={sel.logo} mono className="size-4" />
                  <h1 className="text-[18px] font-semibold text-foreground">{inboxListMeta[sel.id]?.classicTitle ?? `${sel.title} ${sel.target}`}</h1>
                  <EnvChip env={sel.env} />
                </div>
                <p className="text-[12.5px] text-subtle">Requested by {sel.by} · team-{sel.ns} · {sel.ref} · {sel.age} ago</p>
              </div>
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 py-6">
                <Diff item={sel} classic />
                {sel.note && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] text-subtle">Reason</span>
                    <span className="text-[13.5px] text-foreground">{sel.note}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-[12.5px]">
                  <span className="text-subtle">Checks</span>
                  {sel.checks.map((c) => (
                    <span key={c.label} className="flex items-center gap-1.5 text-success">
                      <span className="size-1.5 rounded-full bg-success" /> {c.label.split(" · ")[0]}
                    </span>
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                {ctl.reject ? (
                  <RejectPanel key="rej" ctl={ctl} />
                ) : (
                  <div className="flex h-17 items-center justify-between border-t border-line-2 px-7">
                    <Kbd>J/K move · A approve · R reject</Kbd>
                    <div className="flex gap-2">
                      <Btn variant="secondary" onClick={() => ctl.setQ({ reject: "1" })}>Reject</Btn>
                      <Btn variant="primary" onClick={() => ctl.approve()}>
                        {ctl.busy && <Loader className="animate-spin" />} {sel.env === "prod" ? "Approve on prod" : "Approve"}
                      </Btn>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </>
          ) : showList ? (
            <AllClear />
          ) : (
            <TrackedDetail ctl={ctl} />
          )}
        </section>
      </div>
      <ConfirmDialog ctl={ctl} />
    </ClassicPage>
  )
}
