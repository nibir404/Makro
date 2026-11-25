"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Ellipsis, Loader, RotateCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Btn, EnvChip, ease, useHotkey } from "@/components/idp/kit"
import { useHref } from "@/lib/mode"
import { ROTATE_DAYS, kUsers, type KUser } from "@/lib/data-ext/kafka-postgres"
import { KafkaTabs } from "./catalog"
import {
  ClusterCrumb,
  ConfirmCard,
  Field,
  Modal,
  ModuleCrumbs,
  ModuleFrame,
  PageHead,
  SortHead,
  TableCard,
  inputCls,
  rowMotion,
  useQueryState,
  useSort,
} from "./ui"

type Row = KUser & { busy?: boolean }

function AgeBar({ age }: { age: number }) {
  const pct = Math.min(1, age / ROTATE_DAYS)
  const color = age > ROTATE_DAYS ? "bg-destructive" : age >= 45 ? "bg-warning" : "bg-success"
  return (
    <div className="flex w-27.5 flex-col gap-1">
      <span className={cn("text-xs/4", age > ROTATE_DAYS ? "text-destructive" : "text-muted-foreground")}>
        {age} days{age > ROTATE_DAYS && " · overdue"}
      </span>
      <div className="h-0.75 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease }}
        />
      </div>
    </div>
  )
}

export function KafkaUsers() {
  const href = useHref()
  const [rows, setRows] = React.useState<Row[]>(kUsers)
  const [rotate, setRotate] = useQueryState("rotate")
  const [newQ, setNew] = useQueryState("new")
  const [del, setDel] = useQueryState("delete")
  const [menu, setMenu] = React.useState<string | null>(null)
  const { sorted, sort, onSort } = useSort<Row>(rows, { key: "none", dir: "asc" }, (r, k) =>
    k === "name" ? r.name : k === "service" ? r.service : k === "acls" ? r.acls : k === "age" ? (r.age ?? -1) : rows.indexOf(r),
  )
  useHotkey("n", () => setNew("1"))

  const patch = (name: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.name === name ? { ...r, ...p } : r)))

  const doRotate = (name: string) => {
    const prev = rows.find((r) => r.name === name)?.age ?? 0
    setRotate(null)
    patch(name, { busy: true })
    window.setTimeout(() => {
      patch(name, { busy: false, age: 0 })
      toast.success(`Rotated ${name}`, {
        description: "New password written to Vault · old one valid for 1 hour",
        action: { label: "Undo", onClick: () => patch(name, { age: prev }) },
      })
    }, 1400)
  }
  const doCreate = (name: string) => {
    patch(name, { busy: true })
    window.setTimeout(() => {
      patch(name, { busy: false, age: 0, acls: 2, aclFailed: false })
      toast.success(`${name} created in broker`, { description: "2 ACLs applied on makro-prod-core" })
    }, 1600)
  }

  const rotating = rows.find((r) => r.name === rotate)

  return (
    <ModuleFrame module="kafka" crumbs={<ModuleCrumbs module="kafka" tail={<ClusterCrumb />} />}>
      <PageHead
        logo="kafka"
        title="Kafka users"
        sub={`Service accounts that produce or consume · ${33 + rows.length}`}
        right={
          <>
            <KafkaTabs active="users" />
            <Btn size="sm" className="h-8.5 px-3.5 text-sm" onClick={() => setNew("1")}>
              New user
            </Btn>
          </>
        }
      />
      <div className="relative">
        <TableCard className="overflow-visible">
          <div className="flex border-b border-line px-4 py-2.5">
            <SortHead label="User" k="name" sort={sort} onSort={onSort} className="flex-1" />
            <SortHead label="Service" k="service" sort={sort} onSort={onSort} className="w-37.5" />
            <SortHead label="ACLs" k="acls" sort={sort} onSort={onSort} className="w-30" />
            <SortHead label="Credential age" k="age" sort={sort} onSort={onSort} className="w-50" />
            <div className="w-12" />
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {sorted.map((u, i) => {
              const overdue = (u.age ?? 0) > ROTATE_DAYS
              return (
                <motion.div
                  key={u.name}
                  {...rowMotion(i)}
                  className={cn(
                    "relative flex min-h-11.5 items-center border-b border-line px-4 py-2.5 last:border-b-0",
                    u.age === null && "bg-surface-2/50",
                    rotate === u.name && "bg-surface-2",
                  )}
                >
                  <span className="flex-1 font-mono text-xs/4 text-foreground">{u.name}</span>
                  <span className="w-37.5 text-[13px]/4 text-muted-foreground">{u.service}</span>
                  <Link
                    href={href("/kafka/acls")}
                    className={cn("w-30 text-[13px]/4 underline-offset-2 hover:underline", u.aclFailed ? "text-destructive" : "text-muted-foreground hover:text-foreground")}
                  >
                    {u.aclFailed ? `${u.acls} · ACL failed` : u.acls}
                  </Link>
                  <span className="w-50">
                    {u.busy ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-info">
                        <Loader className="size-3 animate-spin" /> applying…
                      </span>
                    ) : u.age === null ? (
                      <span className="text-xs/4 text-warning">not created in broker</span>
                    ) : (
                      <AgeBar age={u.age} />
                    )}
                  </span>
                  <span className="relative flex w-12 justify-end">
                    {u.age === null ? (
                      <button type="button" disabled={u.busy} onClick={() => doCreate(u.name)} className="text-xs text-foreground hover:text-primary disabled:opacity-40">
                        Create
                      </button>
                    ) : overdue ? (
                      <button type="button" disabled={u.busy} onClick={() => setRotate(u.name)} className="text-xs text-foreground hover:text-primary disabled:opacity-40">
                        Rotate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMenu(menu === u.name ? null : u.name)}
                        className="rounded-[6px] p-1 text-subtle hover:bg-surface-3 hover:text-foreground"
                        aria-label="More"
                      >
                        <Ellipsis className="size-3.5" />
                      </button>
                    )}
                    <AnimatePresence>
                      {menu === u.name && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-7 right-0 z-40 w-40 rounded-[10px] border border-line-3 bg-surface p-1 shadow-xl"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenu(null)
                              setRotate(u.name)
                            }}
                            className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                          >
                            <RotateCw className="size-3.5" /> Rotate password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenu(null)
                              setDel(u.name)
                            }}
                            className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" /> Delete user
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </TableCard>
        <AnimatePresence>
          {rotating && (
            <div className="absolute top-[calc(100%-6px)] right-0 z-30">
              <ConfirmCard>
                <p className="text-sm font-semibold text-foreground">Rotate {rotating.name}?</p>
                <p className="mt-2 text-xs/4.5 text-muted-foreground">
                  A new password goes to Vault. The old one keeps working for 1 hour so {rotating.name.replace(/^svc-/, "")} can restart
                  without dropping messages.
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <EnvChip env="prod" />
                  <div className="flex gap-2">
                    <Btn size="md" onClick={() => setRotate(null)}>
                      Cancel
                    </Btn>
                    <Btn size="md" variant="primary" onClick={() => doRotate(rotating.name)} autoFocus>
                      Rotate
                    </Btn>
                  </div>
                </div>
              </ConfirmCard>
            </div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-xs/4 text-subtle">Deleting a user asks you to type its name and shows which topics lose a producer or consumer.</p>

      <NewUserDialog
        open={newQ === "1"}
        onClose={() => setNew(null)}
        onCreate={(u) => {
          setRows((rs) => [...rs, { ...u, busy: true }])
          setNew(null)
          toast("Request submitted", { description: `${u.name} · waiting for platform approval` })
          window.setTimeout(() => setRows((rs) => rs.map((r) => (r.name === u.name ? { ...r, busy: false, age: 0 } : r))), 1800)
        }}
      />
      <DeleteDialog
        name={del}
        onClose={() => setDel(null)}
        onDelete={(n) => {
          const removed = rows.find((r) => r.name === n)
          setRows((rs) => rs.filter((r) => r.name !== n))
          setDel(null)
          toast(`Deleted ${n}`, {
            action: removed ? { label: "Undo", onClick: () => setRows((rs) => [...rs, removed]) } : undefined,
          })
        }}
      />
    </ModuleFrame>
  )
}

function NewUserDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (u: KUser) => void }) {
  const [name, setName] = React.useState("svc-")
  const [service, setService] = React.useState("order-service")
  const [ops, setOps] = React.useState<string[]>(["READ"])
  const valid = /^svc-[a-z0-9-]{3,}$/.test(name)
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-base font-semibold text-foreground">New Kafka user</h2>
      <p className="mt-1 text-xs text-subtle">A SASL/SCRAM account on makro-prod-core. Its password is written to Vault.</p>
      <form
        className="mt-4 flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onCreate({ name, service, acls: ops.length, age: null })
        }}
      >
        <Field label="Username" hint={valid ? undefined : "Must start with svc- and use lowercase letters, numbers, dashes"}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={cn(inputCls, "font-mono")} />
        </Field>
        <Field label="Service">
          <select value={service} onChange={(e) => setService(e.target.value)} className={inputCls}>
            {["order-service", "fulfilment", "analytics", "loyalty-gateway"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Permissions on orders.created.v1</span>
          <div className="flex gap-2">
            {["READ", "WRITE", "DESCRIBE"].map((o) => {
              const on = ops.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOps((s) => (on ? s.filter((x) => x !== o) : [...s, o]))}
                  className={cn(
                    "h-7.5 rounded-[7px] border px-2.5 font-mono text-[11px] transition-colors",
                    on ? "border-primary/60 bg-primary/10 text-foreground" : "border-line-3 text-subtle hover:text-foreground",
                  )}
                >
                  {o}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <EnvChip env="prod" />
          <div className="flex gap-2">
            <Btn type="button" onClick={onClose}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={!valid}>
              Request user
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function DeleteDialog({ name, onClose, onDelete }: { name: string | null; onClose: () => void; onDelete: (n: string) => void }) {
  const [typed, setTyped] = React.useState("")
  const [prevName, setPrevName] = React.useState(name)
  if (name !== prevName) {
    setPrevName(name)
    setTyped("")
  }
  return (
    <Modal open={!!name} onClose={onClose}>
      <h2 className="text-base font-semibold text-foreground">Delete {name}?</h2>
      <p className="mt-1 text-xs/4.5 text-muted-foreground">These topics lose a producer or consumer:</p>
      <ul className="mt-2 flex flex-col gap-1 rounded-[8px] border border-destructive/30 bg-destructive/5 p-2.5 font-mono text-xs text-foreground">
        <li>orders.created.v1 · READ</li>
        <li>payments.captured.v2 · READ</li>
      </ul>
      <Field label={`Type ${name ?? ""} to confirm`}>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={cn(inputCls, "mt-3 font-mono")} autoFocus />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="destructive" disabled={typed !== name} onClick={() => name && onDelete(name)}>
          Delete user
        </Btn>
      </div>
    </Modal>
  )
}
