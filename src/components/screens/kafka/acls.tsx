"use client"

/* Kafka ACLs: platform-wide list with row select + bulk apply (confirm, sequential run, partial failure)
   and Replace ACL (immutable fields locked). Ported from the old IDP flow 06h–06n; no Paper frame in IDP V.2.
   Reviewers can link states directly: ?apply=1 · ?replace=ka-0001 · ?state=partial */

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Check, Ellipsis, Loader, Lock, Minus, Replace, RotateCw, Trash2, TriangleAlert, Wand2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Btn, EnvChip, StatusText } from "@/components/idp/kit"
import { WorkingPill } from "@/components/idp/working"
import { kAcls, type AclOp, type AclResourceType, type KAcl } from "@/lib/data-ext/kafka-postgres"
import { KafkaTabs } from "./catalog"
import { ClusterCrumb, Field, Modal, ModuleCrumbs, ModuleFrame, PageHead, SearchBox, SortHead, TableCard, inputCls, rowMotion, useQueryState } from "./ui"

/** Approved in review but not yet applied to the broker, or a failed apply. */
const APPLYABLE = (a: KAcl) => a.status === "approved" || a.status === "failed"
const STEP_MS = 450
const OPS: AclOp[] = ["READ", "WRITE", "DESCRIBE", "CREATE", "ALTER", "DELETE"]
const TYPES: AclResourceType[] = ["TOPIC", "GROUP", "CLUSTER"]

type Result = { ok: number; failed: string[] }

/** Rows as they look after a bulk run where one ACL failed (?state=partial). */
function afterPartialRun(rows: KAcl[]): KAcl[] {
  return rows.map((a) =>
    !APPLYABLE(a) ? a : a.failsOnApply ? { ...a, status: "failed", error: a.error, ago: "just now" } : { ...a, status: "live", error: undefined, ago: "just now" },
  )
}

export function KafkaAcls() {
  const [applyQ, setApplyQ] = useQueryState("apply")
  const [replaceQ, setReplaceQ] = useQueryState("replace")
  const [stateQ] = useQueryState("state")
  const partial = stateQ === "partial"

  const [rows, setRows] = React.useState<KAcl[]>(() => (partial ? afterPartialRun(kAcls) : kAcls))
  // Opening ?apply=1 directly pre-selects everything that can be applied, so the confirm frame has content.
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(applyQ ? kAcls.filter(APPLYABLE).map((a) => a.id) : []))
  const [result, setResult] = React.useState<Result | null>(() =>
    partial ? { ok: kAcls.filter((a) => APPLYABLE(a) && !a.failsOnApply).length, failed: kAcls.filter((a) => a.failsOnApply).map((a) => a.id) } : null,
  )
  const [running, setRunning] = React.useState(false)
  const [menu, setMenu] = React.useState<string | null>(null)
  const [q, setQ] = React.useState("")

  const shown = rows.filter((a) => !q || `${a.resource} ${a.principal} ${a.op} ${a.cluster}`.toLowerCase().includes(q.toLowerCase()))
  const selectable = shown.filter(APPLYABLE)
  const allOn = selectable.length > 0 && selectable.every((a) => selected.has(a.id))
  const someOn = selectable.some((a) => selected.has(a.id))
  const patch = (id: string, p: Partial<KAcl>) => setRows((rs) => rs.map((a) => (a.id === id ? { ...a, ...p } : a)))

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(selectable.map((a) => a.id)))

  /** Submits each selected ACL to the apply workflow in sequence, like the backend does. */
  const runBulk = (ids: string[]) => {
    setApplyQ(null)
    setRunning(true)
    setResult(null)
    const queue = rows.filter((a) => ids.includes(a.id))
    queue.forEach((a) => patch(a.id, { status: "applying", error: undefined }))
    let ok = 0
    const failed: string[] = []
    queue.forEach((a, i) => {
      window.setTimeout(() => {
        if (a.failsOnApply) {
          failed.push(a.id)
          // Demo: only the first attempt fails, so "Retry failed" recovers.
          patch(a.id, { status: "failed", error: "CreateAcls failed: principal not found in broker", ago: "just now", failsOnApply: false })
        } else {
          ok++
          patch(a.id, { status: "live", ago: "just now" })
        }
        if (i === queue.length - 1) {
          setRunning(false)
          setSelected(new Set())
          setResult({ ok, failed: [...failed] })
          if (failed.length) {
            toast.error("Bulk apply partial", {
              description: `${ok} succeeded, ${failed.length} failed. The failed row shows why.`,
              action: { label: "Retry failed", onClick: () => runBulk(failed) },
            })
          } else {
            toast.success(`Applied ${ok} ACL${ok === 1 ? "" : "s"}`)
          }
        }
      }, STEP_MS * (i + 1))
    })
  }

  const retryOne = (a: KAcl) => {
    patch(a.id, { status: "applying", error: undefined })
    window.setTimeout(() => {
      // Retrying after the fix succeeds; the demo failure only happens on the first bulk run.
      patch(a.id, { status: "live", ago: "just now", failsOnApply: false })
      setResult((r) => (r ? { ok: r.ok + 1, failed: r.failed.filter((x) => x !== a.id) } : r))
      toast.success("ACL applied", { description: `User:${a.principal} · ${a.op} ${a.type} ${a.resource}` })
    }, 1200)
  }

  const remove = (a: KAcl) => {
    setMenu(null)
    setRows((rs) => rs.filter((x) => x.id !== a.id))
    setSelected((s) => {
      const n = new Set(s)
      n.delete(a.id)
      return n
    })
    toast(`Deleted ACL ${a.id}`, { action: { label: "Undo", onClick: () => setRows((rs) => [...rs, a].sort((x, y) => x.id.localeCompare(y.id))) } })
  }

  const doReplace = (prev: KAcl, next: Pick<KAcl, "type" | "resource" | "op">) => {
    setReplaceQ(null)
    const prod = prev.env === "prod"
    patch(prev.id, { ...next, status: prod ? "review" : "applying", error: undefined, ago: "just now", by: "you" })
    if (prod) {
      toast.success(`Replace ${prev.id} sent for review`, { description: "PROD ACL changes need a second approver · track it in Inbox" })
    } else {
      window.setTimeout(() => {
        patch(prev.id, { status: "live" })
        toast.success(`Replaced ${prev.id}`, { description: `${next.op} on ${next.type} ${next.resource}` })
      }, 1200)
    }
  }

  const toConfirm = rows.filter((a) => selected.has(a.id))
  const replacing = rows.find((a) => a.id === replaceQ) ?? null

  return (
    <ModuleFrame module="kafka" crumbs={<ModuleCrumbs module="kafka" tail={<ClusterCrumb />} />}>
      <PageHead
        logo="kafka"
        title="Kafka ACLs"
        sub="Topic, group and cluster permissions for Kafka users · apply runs one ACL at a time"
        right={<KafkaTabs active="acls" />}
      />

      <AnimatePresence>
        {result && result.failed.length > 0 && !running && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 rounded-[10px] border border-destructive/35 bg-destructive/8 px-4 py-3"
          >
            <TriangleAlert className="size-4 shrink-0 text-destructive" />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13px] font-medium text-foreground">
                Bulk apply partial · {result.ok} succeeded, {result.failed.length} failed
              </span>
              <span className="text-xs text-muted-foreground">The applied ACLs are live. Fix the failed one below, then retry it on its own.</span>
            </div>
            <Btn size="sm" variant="outline" onClick={() => runBulk(result.failed)}>
              <RotateCw /> Retry failed
            </Btn>
            <button type="button" aria-label="Dismiss" onClick={() => setResult(null)} className="rounded-[6px] p-1 text-subtle hover:bg-surface-3 hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search resource, principal, cluster" className="h-8.5 w-80" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-subtle">{selected.size ? `${selected.size} selected` : "Select rows to apply in bulk"}</span>
          <Btn variant="primary" size="sm" className="h-8.5" disabled={!selected.size || running} onClick={() => setApplyQ("1")}>
            {running ? <Loader className="animate-spin" /> : <Wand2 />} {running ? "Applying…" : "Apply selected"}
          </Btn>
        </div>
      </div>

      <TableCard className="overflow-visible">
        <div className="flex items-center border-b border-line px-4 py-2.5">
          <span className="w-8">
            <Box on={allOn} mixed={!allOn && someOn} disabled={!selectable.length || running} onClick={toggleAll} label="Select all" />
          </span>
          <SortHead label="Resource" className="flex-1" />
          <SortHead label="Operation" className="w-28" />
          <SortHead label="Principal" className="w-44" />
          <SortHead label="Cluster" className="w-44" />
          <SortHead label="Status" className="w-56" />
          <SortHead label="Updated" className="w-28" />
          <div className="w-10" />
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((a, i) => {
            const can = APPLYABLE(a)
            return (
              <motion.div
                key={a.id}
                {...rowMotion(i)}
                className={cn(
                  "relative flex min-h-13 items-center border-b border-line px-4 py-2.5 last:border-b-0",
                  selected.has(a.id) && "bg-surface-2/70",
                  a.status === "failed" && "bg-destructive/5",
                )}
              >
                <span className="w-8">
                  <Box on={selected.has(a.id)} disabled={!can || running} onClick={() => toggle(a.id)} label={`Select ${a.id}`} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-mono text-xs text-foreground">{a.resource}</span>
                  <span className="text-[11px] text-subtle">
                    {a.type} · {a.id}
                  </span>
                </span>
                <span className="flex w-28 flex-col gap-0.5">
                  <span className="font-mono text-xs text-muted-foreground">{a.op}</span>
                  <span className="text-[11px] text-subtle">ALLOW · host *</span>
                </span>
                <span className="w-44 truncate font-mono text-xs text-muted-foreground">User:{a.principal}</span>
                <span className="flex w-44 items-center gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">{a.cluster}</span>
                  <EnvChip env={a.env} />
                </span>
                <span className="flex w-56 flex-col gap-0.5 pr-3">
                  {a.status === "applying" ? (
                    <WorkingPill size="sm" label="Applying" className="self-start" />
                  ) : (
                    <StatusText status={a.status} label={a.status === "approved" ? "Approved · not applied" : a.status === "failed" ? "Apply failed" : undefined} />
                  )}
                  {a.error && <span className="truncate text-[11px] text-destructive">{a.error}</span>}
                </span>
                <span className="flex w-28 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{a.by}</span>
                  <span className="text-[11px] text-subtle">{a.ago}</span>
                </span>
                <span className="relative flex w-10 justify-end">
                  {a.status === "failed" && !running ? (
                    <button type="button" onClick={() => retryOne(a)} className="text-xs text-foreground hover:text-primary">
                      Retry
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={a.status === "applying"}
                      onClick={() => setMenu(menu === a.id ? null : a.id)}
                      className="rounded-[6px] p-1 text-subtle hover:bg-surface-3 hover:text-foreground disabled:opacity-30"
                      aria-label={`Actions for ${a.id}`}
                    >
                      <Ellipsis className="size-3.5" />
                    </button>
                  )}
                  <AnimatePresence>
                    {menu === a.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-7 right-0 z-40 w-36 rounded-[10px] border border-line-3 bg-surface p-1 shadow-xl"
                      >
                        <MenuItem
                          onClick={() => {
                            setMenu(null)
                            setReplaceQ(a.id)
                          }}
                        >
                          <Replace className="size-3.5" /> Replace
                        </MenuItem>
                        <MenuItem danger onClick={() => remove(a)}>
                          <Trash2 className="size-3.5" /> Delete
                        </MenuItem>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {!shown.length && <p className="px-4 py-8 text-center text-[13px] text-subtle">No ACL matches “{q}”.</p>}
      </TableCard>

      <Modal open={applyQ === "1" && toConfirm.length > 0} onClose={() => setApplyQ(null)}>
        <h2 className="text-base font-semibold text-foreground">
          Apply {toConfirm.length} ACL{toConfirm.length === 1 ? "" : "s"}?
        </h2>
        <p className="mt-1.5 text-xs/4.5 text-muted-foreground">
          Each one goes to the apply workflow in turn and takes a few seconds. Rows show <span className="font-mono text-info">applying</span> until the broker
          confirms. If one fails, the rest still apply.
        </p>
        <ul className="mt-3 flex max-h-44 flex-col gap-1 overflow-y-auto rounded-[8px] border border-line-2 bg-page p-2.5 font-mono text-xs">
          {toConfirm.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-muted-foreground">
              <span className="w-18 shrink-0 text-subtle">{a.op}</span>
              <span className="truncate text-foreground">{a.resource}</span>
              <span className="ml-auto shrink-0">
                <EnvChip env={a.env} />
              </span>
            </li>
          ))}
        </ul>
        {toConfirm.some((a) => a.env === "prod") && (
          <p className="mt-2.5 text-[11px] text-warning">Includes PROD ACLs. They were already approved in review, so they apply now.</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={() => setApplyQ(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => runBulk(toConfirm.map((a) => a.id))}>
            Apply {toConfirm.length} ACL{toConfirm.length === 1 ? "" : "s"}
          </Btn>
        </div>
      </Modal>

      <Modal open={!!replacing} onClose={() => setReplaceQ(null)} className="w-[560px]">
        {replacing && <ReplaceForm key={replacing.id} acl={replacing} onCancel={() => setReplaceQ(null)} onReplace={(n) => doReplace(replacing, n)} />}
      </Modal>
    </ModuleFrame>
  )
}

function ReplaceForm({ acl, onCancel, onReplace }: { acl: KAcl; onCancel: () => void; onReplace: (n: Pick<KAcl, "type" | "resource" | "op">) => void }) {
  const [type, setType] = React.useState(acl.type)
  const [resource, setResource] = React.useState(acl.resource)
  const [op, setOp] = React.useState(acl.op)
  const [ack, setAck] = React.useState(false)
  const unchanged = type === acl.type && resource.trim() === acl.resource && op === acl.op
  const nameErr = !resource.trim() ? "Resource name is required" : type === "CLUSTER" && resource.trim() !== "kafka-cluster" ? "CLUSTER ACLs use the name kafka-cluster" : null
  const ok = ack && !unchanged && !nameErr
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onReplace({ type, resource: resource.trim(), op })
      }}
    >
      <h2 className="text-base font-semibold text-foreground">Replace ACL</h2>
      <p className="mt-1 text-xs/4.5 text-muted-foreground">
        Overwrites <span className="font-mono text-foreground">{acl.id}</span> with a new spec. Locked fields can&apos;t change: to change those, delete this ACL
        and create a new one.
      </p>
      <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-[8px] border border-line-2 bg-page px-3.5 py-3 font-mono text-xs">
        <span className="col-span-2 mb-0.5 flex items-center gap-1.5 text-[10px] tracking-[0.08em] text-subtle uppercase">
          <Lock className="size-3" /> Locked
        </span>
        <Locked k="cluster" v={acl.cluster} />
        <Locked k="env" v={acl.env} />
        <Locked k="id" v={acl.id} />
        <Locked k="principal" v={`User:${acl.principal}`} className="col-span-2" />
      </div>
      <div className="mt-3.5 grid grid-cols-[160px_1fr] gap-3">
        <Field label="Resource type">
          <select value={type} onChange={(e) => setType(e.target.value as AclResourceType)} className={inputCls}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Resource name">
          <input value={resource} onChange={(e) => setResource(e.target.value)} className={cn(inputCls, "font-mono", nameErr && "border-destructive/60")} />
        </Field>
      </div>
      {nameErr && <p className="mt-1 text-[11px] text-destructive">{nameErr}</p>}
      <div className="mt-3">
        <Field label="Operation">
          <select value={op} onChange={(e) => setOp(e.target.value as AclOp)} className={inputCls}>
            {OPS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <span className="rounded-[5px] border border-line-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ALLOW</span>
        <span className="flex items-center gap-1 rounded-[5px] border border-line-3 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <Lock className="size-2.5" /> host: *
        </span>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs/4.5 text-muted-foreground">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-[var(--color-primary)]" />
        I understand this overwrites the existing ACL.
        {acl.env === "prod" ? " On PROD it goes to review before it applies." : " It applies right away."}
      </label>
      <div className="mt-4 flex items-center justify-end gap-2">
        {unchanged && <span className="mr-auto text-[11px] text-subtle">Change the type, name or operation to replace.</span>}
        <Btn type="button" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn variant="primary" type="submit" disabled={!ok}>
          {acl.env === "prod" ? "Send for review" : "Replace"}
        </Btn>
      </div>
    </form>
  )
}

function Locked({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <span className={cn("flex gap-2 truncate", className)}>
      <span className="w-18 shrink-0 text-subtle">{k}</span>
      <span className="truncate text-foreground">{v}</span>
    </span>
  )
}

function Box({ on, mixed, disabled, onClick, label }: { on: boolean; mixed?: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-4 items-center justify-center rounded-[4px] border transition-colors disabled:opacity-25",
        on || mixed ? "border-primary bg-primary text-primary-foreground" : "border-line-3 hover:border-muted-foreground",
      )}
    >
      {on ? <Check className="size-3" strokeWidth={3} /> : mixed ? <Minus className="size-3" strokeWidth={3} /> : null}
    </button>
  )
}

function MenuItem({ danger, onClick, children }: { danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs",
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
