"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Check, CircleCheck, Loader2, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { reviewRows, type ReviewDecision } from "@/lib/data-ext/network-secrets"
import { Btn, Stagger, StaggerItem, ease } from "@/components/idp/kit"
import { Crumbs, FilterTabs, Frame, TableCard, Th } from "./ui"

const TOTAL = 9
const DECIDED_ELSEWHERE = 5

function UsageBars({ data }: { data: number[] }) {
  return (
    <span className="flex h-4 items-end gap-[2px]">
      {data.map((v, i) => (
        <motion.span
          key={i}
          initial={{ height: 0 }}
          animate={{ height: v ? 4 + v * 2 : 2 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease }}
          className={cn("w-[5px] rounded-[1px]", v ? "bg-muted-foreground" : "bg-faint")}
        />
      ))}
    </span>
  )
}

function Check2({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn("flex size-4 items-center justify-center rounded-[4px] border transition-colors", on ? "border-foreground bg-foreground text-page" : "border-line-3 hover:border-subtle")}
    >
      {on && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}

/** 13e — Quarterly access review. */
export function ReviewScreen() {
  const href = useHref()
  const [rows, setRows] = React.useState(reviewRows)
  const [filter, setFilter] = React.useState<"all" | "undecided" | "revoke">("all")
  const [sel, setSel] = React.useState<string[]>([])
  const [phase, setPhase] = React.useState<"idle" | "submitting" | "done">("idle")
  // each visible row stands for two grants in this sample (4 rows → 9 grants)
  const undecided = rows.filter((r) => !r.decision).length * 2
  const decided = TOTAL - undecided
  const revokes = rows.filter((r) => r.decision === "revoke").length
  const shown = rows.filter((r) => (filter === "undecided" ? !r.decision : filter === "revoke" ? r.decision === "revoke" : true))

  const decide = (ids: string[], d: ReviewDecision) => setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, decision: r.decision === d && ids.length === 1 ? null : d } : r)))
  const applySuggestions = () => {
    const prev = rows
    setRows((rs) => rs.map((r) => ({ ...r, decision: r.decision ?? r.suggestion })))
    toast.success("Suggestions applied to undecided grants", { action: { label: "Undo", onClick: () => setRows(prev) } })
  }
  const bulk = (d: ReviewDecision) => {
    decide(sel, d)
    toast.success(`${sel.length} grant${sel.length > 1 ? "s" : ""} marked ${d === "keep" ? "keep · renews 90 days" : "revoke"}`)
    setSel([])
  }
  const submit = () => {
    setPhase("submitting")
    setTimeout(() => setPhase("done"), 1200)
  }
  const allSel = sel.length === shown.length && shown.length > 0

  return (
    <Frame crumbs={<Crumbs items={[{ label: "Network access", href: "/network", icon: <Network className="size-[15px]" /> }, { label: "Access review" }]} />} className="relative">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Quarterly access review</h1>
          <p className="text-sm text-muted-foreground">Q4 · due Dec 15 · you review 9 grants for commerce-order</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {decided} of {TOTAL} decided
          </span>
          <span className="h-1 w-35 overflow-hidden rounded-full bg-surface-3">
            <motion.span className="block h-full rounded-full bg-foreground" animate={{ width: `${(decided / TOTAL) * 100}%` }} transition={{ duration: 0.45, ease }} />
          </span>
        </div>
      </div>

      <div className="mt-4 mb-3 flex items-center justify-between">
        <FilterTabs
          id="review"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: TOTAL },
            { value: "undecided", label: "Undecided", count: undecided },
            { value: "revoke", label: "Revoke", count: revokes },
          ]}
        />
        <AnimatePresence mode="wait">
          {sel.length > 0 ? (
            <motion.div key="bulk" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">{sel.length} selected</span>
              <Btn size="sm" variant="secondary" onClick={() => bulk("keep")}>
                Renew 90d
              </Btn>
              <Btn size="sm" variant="destructive" onClick={() => bulk("revoke")}>
                Revoke
              </Btn>
            </motion.div>
          ) : (
            <motion.div key="sugg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Suggest: keep active users, revoke unused &gt; 30d</span>
              <Btn size="sm" variant="outline" onClick={applySuggestions}>
                Apply suggestions
              </Btn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TableCard>
        <div className="grid h-9 grid-cols-[28px_1fr_200px_180px_150px] items-center border-b border-line px-4">
          <Check2 on={allSel} label="Select all" onClick={() => setSel(allSel ? [] : shown.map((r) => r.id))} />
          <Th>Person · Destination</Th>
          <Th>Last used</Th>
          <Th>Suggestion</Th>
          <Th className="text-right">Decision</Th>
        </div>
        <Stagger>
          {shown.map((r) => (
            <StaggerItem key={r.id}>
              <div className={cn("grid h-[60px] grid-cols-[28px_1fr_200px_180px_150px] items-center border-b border-line px-4 transition-colors last:border-0", sel.includes(r.id) && "bg-surface-2/70")}>
                <Check2 on={sel.includes(r.id)} label={`Select ${r.who}`} onClick={() => setSel((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
                <div>
                  <div className="text-sm text-foreground">{r.who}</div>
                  <div className="text-[11.5px] text-subtle">{r.dest}</div>
                </div>
                <span className="flex items-center gap-2.5">
                  <UsageBars data={r.usage} />
                  <span className={cn("text-[11.5px]", r.stale ? "text-warning" : "text-subtle")}>{r.last}</span>
                </span>
                <span className={cn("text-[12.5px]", r.suggestion === "keep" ? "text-success" : "text-destructive")}>
                  {r.suggestion === "keep" ? "Keep" : "Revoke"} · {r.why}
                </span>
                <span className="flex justify-end gap-1.5">
                  {(["keep", "revoke"] as const).map((d) => {
                    const on = r.decision === d
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => decide([r.id], d)}
                        className={cn(
                          "flex h-7 items-center gap-1 rounded-[6px] border px-2.5 text-[12.5px] transition-colors",
                          on && d === "keep" && "border-success/40 bg-success/10 text-success",
                          on && d === "revoke" && "border-destructive/40 bg-destructive/10 text-destructive",
                          !on && "border-line-3 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {d === "keep" ? "Keep" : "Revoke"}
                        {on && <Check className="size-3" />}
                      </motion.button>
                    )
                  })}
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </TableCard>

      <div className="flex-1" />
      <div className="sticky bottom-6 mt-8 flex items-center justify-between rounded-[14px] border border-line-2 bg-surface px-4 py-3">
        <span className="text-sm text-foreground">
          {undecided > 0 ? `${undecided} left · revokes happen when you submit, and each person is notified` : `All decided · ${revokes} revoke${revokes === 1 ? "" : "s"} on submit`}
        </span>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => toast.success("Draft saved")}>
            Save draft
          </Btn>
          <Btn variant="primary" onClick={submit} disabled={undecided > 0 || phase !== "idle"} title={undecided > 0 ? "Decide every grant first" : undefined}>
            {phase === "submitting" && <Loader2 className="animate-spin" />}
            Submit review
          </Btn>
        </div>
      </div>

      <AnimatePresence>
        {phase === "done" && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 light:bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex w-[380px] flex-col items-center gap-3 rounded-[18px] border border-line-3 bg-surface p-7 text-center"
            >
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}>
                <CircleCheck className="size-11 text-success" />
              </motion.span>
              <div className="text-base font-semibold text-foreground">Review submitted</div>
              <p className="text-[13px] text-muted-foreground">
                {rows.filter((r) => r.decision === "keep").length + DECIDED_ELSEWHERE} grants renewed for 90 days · {revokes} revoked · each person notified
              </p>
              <Btn variant="secondary" href={href("/network")} className="mt-2">
                Back to network access
              </Btn>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  )
}
