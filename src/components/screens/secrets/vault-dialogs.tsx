"use client"

/* Vault dialogs ported from the old IDP (Kura 05i, 05k, 05q, 05t/05u), styled like the rest of Secrets:
   rotate SecretID (confirm → generate → shown once), create branch, delete branch, manage inheritance. */

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, GitBranch, Layers, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Btn, ease } from "@/components/idp/kit"
import { WorkingPill } from "@/components/idp/working"
import { Modal } from "../network/ui"

const inputCls =
  "h-9 w-full rounded-[8px] border border-line-3 bg-page px-3 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-foreground/50"

function Foot({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 border-t border-line-2 px-5.5 py-4">{children}</div>
}

/* ------------------------------------------------------------------ */
/* Rotate SecretID: confirm → generating → shown once                  */
/* ------------------------------------------------------------------ */

export function RotateSecretIdModal({
  open,
  project,
  env,
  onClose,
  onRotated,
}: {
  open: boolean
  project: string
  env: string
  onClose: () => void
  onRotated: () => void
}) {
  // Once the new value is on screen, the dialog can't be dismissed until it has been copied or marked stored.
  const [locked, setLocked] = React.useState(false)
  const tryClose = () => {
    if (locked) {
      toast.warning("Copy the new SecretID first", { description: "It can't be shown again after this closes" })
      return
    }
    onClose()
  }
  return (
    <Modal open={open} onClose={tryClose} className="w-[520px]">
      {open && <RotateSecretIdBody project={project} env={env} onClose={tryClose} onRotated={onRotated} onLock={setLocked} />}
    </Modal>
  )
}

function RotateSecretIdBody({
  project,
  env,
  onClose,
  onRotated,
  onLock,
}: {
  project: string
  env: string
  onClose: () => void
  onRotated: () => void
  onLock: (locked: boolean) => void
}) {
  const [step, setStep] = React.useState<"confirm" | "working" | "shown">("confirm")
  const [label, setLabel] = React.useState("Generating SecretID")
  const [show, setShow] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [stored, setStored] = React.useState(false)
  const value = "s.hvs.CAESIJ2kQf7xR9mN4pL8tV1wY6zB3cD5eF0gH"

  const rotate = () => {
    setStep("working")
    onLock(true)
    const steps = ["Generating SecretID", "Writing to Vault", "Updating AppRole", "Notifying order-service"]
    steps.forEach((s, i) => window.setTimeout(() => setLabel(s), i * 650))
    window.setTimeout(() => {
      setStep("shown")
      onLock(true)
      onRotated()
    }, steps.length * 650 + 200)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {}
    setCopied(true)
    onLock(false)
    toast.success("SecretID copied", { description: "Clipboard clears in 30s" })
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === "confirm" && (
        <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="flex flex-col gap-3 p-5.5">
            <h2 className="text-base font-semibold text-foreground">Rotate the SecretID for {project}?</h2>
            <p className="text-sm text-muted-foreground">
              Vault issues a new SecretID for the <span className="font-mono text-foreground">{project}</span> AppRole. The current one keeps working for{" "}
              <b className="font-medium text-foreground">24 hours</b>, so pods can pick up the new one on their next restart.
            </p>
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-line-2 bg-page p-3 text-[12.5px]">
              <Row k="AppRole" v={`commerce-${project}`} />
              <Row k="Environment" v={env} />
              <Row k="Current SecretID" v="expires in 3 days · issued 87d ago" warn />
              <Row k="New SecretID TTL" v="90 days" />
            </div>
            <p className="flex items-center gap-1.5 text-[12.5px] text-warning">
              <TriangleAlert className="size-3.5" /> The new value is shown once. Store it before you close this.
            </p>
          </div>
          <Foot>
            <Btn variant="secondary" onClick={onClose}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={rotate}>
              Rotate SecretID
            </Btn>
          </Foot>
        </motion.div>
      )}
      {step === "working" && (
        <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-56 flex-col items-center justify-center gap-3">
          <WorkingPill label={label} pattern="scan" />
          <p className="text-xs text-subtle">Don&apos;t close this window</p>
        </motion.div>
      )}
      {step === "shown" && (
        <motion.div key="s" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease }}>
          <div className="flex flex-col gap-3 p-5.5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Check className="size-4 text-success" /> New SecretID issued
            </h2>
            <p className="text-sm text-muted-foreground">Copy it now. After you close this, nobody can see it again — not even admins.</p>
            <div className="flex items-center gap-2 rounded-[10px] border border-primary/40 bg-primary/5 px-3 py-2.5">
              <span className={cn("flex-1 truncate font-mono text-[12.5px]", show ? "text-foreground" : "tracking-[0.2em] text-muted-foreground")}>
                {show ? value : "•".repeat(28)}
              </span>
              <button aria-label={show ? "Hide" : "Show"} onClick={() => setShow((s) => !s)} className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground">
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <Btn size="xs" variant={copied ? "secondary" : "primary"} onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Btn>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Old SecretID stays valid until <span className="text-foreground">tomorrow 14:02</span>. order-service picks up the new one on its next rollout.
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
              <input type="checkbox" checked={stored} onChange={(e) => {
                  setStored(e.target.checked)
                  onLock(!e.target.checked && !copied)
                }} className="accent-[var(--color-primary)]" />
              I&apos;ve stored the new SecretID somewhere safe
            </label>
          </div>
          <Foot>
            <Btn variant="primary" disabled={!stored && !copied} onClick={onClose}>
              Done
            </Btn>
          </Foot>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-mono", warn ? "text-warning" : "text-foreground")}>{v}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */

export type Branch = { name: string; from: "dev" | "qa" | "prod" }
const BASES = ["dev", "qa", "prod"] as const

export function CreateBranchModal({
  open,
  taken,
  counts,
  defaultFrom,
  onClose,
  onCreate,
}: {
  open: boolean
  taken: string[]
  counts: Record<string, number>
  defaultFrom: Branch["from"]
  onClose: () => void
  onCreate: (b: Branch) => void
}) {
  return (
    <Modal open={open} onClose={onClose} className="w-[480px]">
      {open && <CreateBranchBody taken={taken} counts={counts} defaultFrom={defaultFrom} onClose={onClose} onCreate={onCreate} />}
    </Modal>
  )
}

function CreateBranchBody({
  taken,
  counts,
  defaultFrom,
  onClose,
  onCreate,
}: {
  taken: string[]
  counts: Record<string, number>
  defaultFrom: Branch["from"]
  onClose: () => void
  onCreate: (b: Branch) => void
}) {
  const [from, setFrom] = React.useState<Branch["from"]>(defaultFrom)
  const [name, setName] = React.useState(`${defaultFrom}-eu`)
  const [touched, setTouched] = React.useState(false)
  const err = !/^[a-z][a-z0-9-]{1,30}$/.test(name)
    ? "Lowercase letters, digits and dashes, starting with a letter"
    : taken.includes(name)
      ? `${name} already exists`
      : !name.startsWith(`${from}-`)
        ? `Branches of ${from} are named ${from}-something`
        : null
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!err) onCreate({ name, from })
      }}
    >
      <div className="flex flex-col gap-3.5 p-5.5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <GitBranch className="size-4" /> New branch
        </h2>
        <p className="text-sm text-muted-foreground">A branch starts with every key from its source config. Override only what differs, like a region or a tenant.</p>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Branch from</span>
          <div className="flex gap-1.5">
            {BASES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setFrom(b)
                  if (!touched) setName(`${b}-eu`)
                }}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] border text-[13px] transition-colors",
                  from === b ? "border-foreground/60 bg-surface-3 text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground",
                )}
              >
                {b} <span className="font-mono text-[11px] text-subtle">{counts[b]}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Branch name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setTouched(true)
              setName(e.target.value.toLowerCase())
            }}
            className={cn(inputCls, touched && err && "border-destructive/60")}
          />
          {touched && err ? <span className="text-[11.5px] text-destructive">{err}</span> : <span className="text-[11.5px] text-subtle">e.g. prod-eu, prod-tenant-b</span>}
        </label>
        <div className="rounded-[10px] border border-line-2 bg-page px-3 py-2.5 text-[12.5px] text-muted-foreground">
          <span className="text-foreground">{counts[from]} keys</span> inherited from {from} · 0 overrides · same access as {from}
        </div>
      </div>
      <Foot>
        <Btn type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn type="submit" variant="primary" disabled={touched && !!err}>
          Create branch
        </Btn>
      </Foot>
    </form>
  )
}

export function DeleteBranchModal({ branch, onClose, onDelete }: { branch: Branch | null; onClose: () => void; onDelete: (b: Branch) => void }) {
  return (
    <Modal open={!!branch} onClose={onClose} className="w-[460px]">
      {branch && <DeleteBranchBody key={branch.name} branch={branch} onClose={onClose} onDelete={onDelete} />}
    </Modal>
  )
}

function DeleteBranchBody({ branch, onClose, onDelete }: { branch: Branch; onClose: () => void; onDelete: (b: Branch) => void }) {
  const [typed, setTyped] = React.useState("")
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (typed === branch.name) onDelete(branch)
      }}
    >
      <div className="flex flex-col gap-3 p-5.5">
        <h2 className="text-base font-semibold text-foreground">Delete branch {branch.name}?</h2>
        <p className="text-sm text-muted-foreground">
          Its overrides are deleted. Anything reading <span className="font-mono text-foreground">{branch.name}</span> falls back to nothing and will fail to start, so move those
          services to <span className="font-mono text-foreground">{branch.from}</span> first.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            Type <span className="font-mono text-foreground">{branch.name}</span> to confirm
          </span>
          <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className={cn(inputCls, "focus:border-destructive/60")} />
        </label>
      </div>
      <Foot>
        <Btn type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn type="submit" variant="destructive" disabled={typed !== branch.name}>
          Delete branch
        </Btn>
      </Foot>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Manage inheritance                                                  */
/* ------------------------------------------------------------------ */

type Parent = { path: string; keys: string[] }
export const PARENTS: Parent[] = [
  { path: "shared/commerce", keys: ["DATABASE_URL", "KAFKA_BOOTSTRAP", "REDIS_URL"] },
  { path: "platform/observability", keys: ["SENTRY_DSN", "DATADOG_API_KEY"] },
  { path: "platform/auth", keys: ["JWT_PUBLIC_KEY", "OIDC_ISSUER"] },
  { path: "commerce/payments-common", keys: ["STRIPE_API_VERSION", "STRIPE_WEBHOOK_SECRET"] },
]

export function InheritanceModal({
  open,
  env,
  own,
  current,
  onClose,
  onSave,
}: {
  open: boolean
  env: string
  own: string[]
  current: string[]
  onClose: () => void
  onSave: (next: string[]) => void
}) {
  return (
    <Modal open={open} onClose={onClose} className="w-[580px]">
      {open && <InheritanceBody env={env} own={own} current={current} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function InheritanceBody({ env, own, current, onClose, onSave }: { env: string; own: string[]; current: string[]; onClose: () => void; onSave: (next: string[]) => void }) {
  const [list, setList] = React.useState<string[]>(current)
  const on = (p: string) => list.includes(p)
  const toggle = (p: string) => setList((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))
  const move = (p: string, d: -1 | 1) =>
    setList((l) => {
      const i = l.indexOf(p)
      const j = i + d
      if (i < 0 || j < 0 || j >= l.length) return l
      const n = [...l]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  // Effective view: own keys win, then parents top to bottom (first match wins).
  const seen = new Set(own)
  const resolved = list.map((p) => {
    const keys = PARENTS.find((x) => x.path === p)?.keys ?? []
    const gives = keys.filter((k) => !seen.has(k))
    const shadowed = keys.filter((k) => seen.has(k))
    gives.forEach((k) => seen.add(k))
    return { p, gives, shadowed }
  })
  const removed = current.filter((p) => !list.includes(p))
  const lost = removed.flatMap((p) => PARENTS.find((x) => x.path === p)?.keys.filter((k) => !own.includes(k)) ?? [])
  const changed = list.join() !== current.join()

  return (
    <>
      <div className="flex flex-col gap-3 p-5.5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Layers className="size-4" /> Inheritance · {env}
        </h2>
        <p className="text-sm text-muted-foreground">Keys set here always win. Then parents are read top to bottom — the first parent that has a key wins.</p>
        <div className="flex flex-col gap-1.5">
          {[...list, ...PARENTS.map((p) => p.path).filter((p) => !list.includes(p))].map((p) => {
            const r = resolved.find((x) => x.p === p)
            const idx = list.indexOf(p)
            return (
              <motion.div
                key={p}
                layout
                transition={{ duration: 0.2, ease }}
                className={cn("flex items-center gap-3 rounded-[10px] border px-3 py-2.5", on(p) ? "border-line-3 bg-surface-2" : "border-dashed border-line-2")}
              >
                <input type="checkbox" checked={on(p)} onChange={() => toggle(p)} aria-label={`Inherit from ${p}`} className="accent-[var(--color-primary)]" />
                <span className="w-5 font-mono text-[11px] text-subtle">{on(p) ? idx + 1 : ""}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("font-mono text-[12.5px]", on(p) ? "text-foreground" : "text-muted-foreground")}>{p}</span>
                  {r && (
                    <span className="truncate text-[11px] text-subtle">
                      gives {r.gives.length} key{r.gives.length === 1 ? "" : "s"}
                      {r.shadowed.length > 0 && <span className="text-warning"> · overridden: {r.shadowed.join(", ")}</span>}
                    </span>
                  )}
                </span>
                {on(p) && (
                  <span className="flex gap-0.5">
                    <button aria-label="Move up" disabled={idx === 0} onClick={() => move(p, -1)} className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button aria-label="Move down" disabled={idx === list.length - 1} onClick={() => move(p, 1)} className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="size-3.5" />
                    </button>
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
        <AnimatePresence>
          {lost.length > 0 && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-1.5 text-[12.5px] text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {env} stops receiving <span className="font-mono">{lost.join(", ")}</span>. Set them here first if the service still needs them.
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <Foot>
        <Btn variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="primary" disabled={!changed} onClick={() => onSave(list)}>
          {env === "prod" ? "Save to prod" : "Save"}
        </Btn>
      </Foot>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* New Vault project (old 05b, redesigned: one sheet, sensible defaults) */
/* ------------------------------------------------------------------ */

const NAMESPACES = ["commerce", "pricing", "inventory", "payments", "platform"] as const
const ENVS = ["dev", "qa", "prod"] as const

export function NewVaultProjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: { ns: string; name: string; envs: string[]; inherit: string[] }) => void }) {
  return (
    <Modal open={open} onClose={onClose} className="w-[540px]">
      {open && <NewVaultProjectBody onClose={onClose} onCreate={onCreate} />}
    </Modal>
  )
}

function NewVaultProjectBody({ onClose, onCreate }: { onClose: () => void; onCreate: (p: { ns: string; name: string; envs: string[]; inherit: string[] }) => void }) {
  const [ns, setNs] = React.useState<string>("commerce")
  const [name, setName] = React.useState("")
  const [envs, setEnvs] = React.useState<string[]>([...ENVS])
  const [inherit, setInherit] = React.useState<string[]>(["shared/commerce"])
  const [tried, setTried] = React.useState(false)
  const taken = ["order-service", "cart-api", "price-api", "stock-sync", "gateway"]
  const err = !name
    ? "Give it a name, usually the service it holds secrets for"
    : !/^[a-z][a-z0-9-]{1,40}$/.test(name)
      ? "Lowercase letters, digits and dashes"
      : taken.includes(name)
        ? `${name} already exists in ${ns}`
        : !envs.length
          ? "Pick at least one environment"
          : null
  const parents = [`shared/${ns}`, "platform/observability", "platform/auth"]
  const pickNs = (n: string) => {
    setNs(n)
    setInherit((cur) => [`shared/${n}`, ...cur.filter((p) => !p.startsWith("shared/"))])
  }
  const toggle = (list: string[], v: string, set: (x: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (!err) onCreate({ ns, name, envs, inherit })
      }}
    >
      <div className="flex flex-col gap-4 p-5.5">
        <div>
          <h2 className="text-base font-semibold text-foreground">New Vault project</h2>
          <p className="mt-1 text-sm text-muted-foreground">For secrets that don&apos;t belong to one service. Services get their own project automatically when they&apos;re created.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Namespace</span>
          <div className="flex flex-wrap gap-1.5">
            {NAMESPACES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pickNs(n)}
                className={cn("h-8 rounded-[8px] border px-3 text-[13px] transition-colors", ns === n ? "border-foreground/60 bg-surface-3 text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="checkout-bff"
            className={cn(inputCls, tried && err && "border-destructive/60")}
          />
          <span className="flex items-center justify-between text-[11.5px]">
            <span className="font-mono text-subtle">
              secret/{ns}/<span className="text-foreground">{name || "…"}</span>
            </span>
            {tried && err && <span className="text-destructive">{err}</span>}
          </span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Environments · one config each</span>
          <div className="flex gap-1.5">
            {ENVS.map((e) => (
              <Chip key={e} on={envs.includes(e)} onClick={() => toggle(envs, e, setEnvs)}>
                {e}
              </Chip>
            ))}
          </div>
          <span className="text-[11.5px] text-subtle">Need something like dev-perf or a tenant config? Add it later as a branch of an environment.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Inherit shared keys from</span>
          <div className="flex flex-wrap gap-1.5">
            {parents.map((p) => (
              <Chip key={p} mono on={inherit.includes(p)} onClick={() => toggle(inherit, p, setInherit)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <Foot>
        <Btn type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn type="submit" variant="primary" disabled={tried && !!err}>
          Create project
        </Btn>
      </Foot>
    </form>
  )
}

function Chip({ on, onClick, mono, children }: { on: boolean; onClick: () => void; mono?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12.5px] transition-colors",
        mono && "font-mono text-[12px]",
        on ? "border-primary/50 bg-primary/10 text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={cn("grid size-3.5 place-items-center rounded-[3px] border", on ? "border-primary bg-primary text-primary-foreground" : "border-line-3")}>{on && <Check className="size-2.5" strokeWidth={3} />}</span>
      {children}
    </button>
  )
}
