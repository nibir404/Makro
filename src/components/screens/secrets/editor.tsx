"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { Boxes, Check, Copy, Eye, EyeOff, KeyRound, Loader2, MoreHorizontal, Plus, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHref } from "@/lib/mode"
import { envCounts, secretRows, secretVersions, serviceTokens, type SecretRow } from "@/lib/data-ext/network-secrets"
import { Btn, StatusDot, ease, useHotkey } from "@/components/idp/kit"
import { Crumbs, Drawer, Frame, Modal, Segmented, VaultMark } from "../network/ui"
import { logEntry, nowHHMM } from "./store"

type Env = "dev" | "qa" | "prod"

export function useProject() {
  const p = useParams<{ project?: string }>()
  return p?.project ?? "order-service"
}

export function SecretsCrumbs({ project, env = "prod", tail }: { project: string; env?: string; tail?: string }) {
  return (
    <Crumbs
      items={[
        { label: "Secrets", href: "/secrets", icon: <KeyRound className="size-[15px]" /> },
        { label: project, href: `/secrets/${project}`, icon: <Boxes className="size-[15px]" /> },
        { label: env, href: tail ? `/secrets/${project}` : undefined, icon: <StatusDot health="ok" className="size-2" /> },
        ...(tail ? [{ label: tail }] : []),
      ]}
    />
  )
}

/** 14a — inline edit (+ 14b versions drawer, + 16f tokens drawer). */
export function SecretsEditor({ panel }: { panel?: "versions" | "tokens" }) {
  const project = useProject()
  const href = useHref()
  const router = useRouter()
  const sp = useSearchParams()
  const base = href(`/secrets/${project}`)
  const [env, setEnv] = React.useState<Env>((sp.get("env") as Env) ?? "prod")
  const [rows, setRows] = React.useState<SecretRow[]>(secretRows)
  const [staged, setStaged] = React.useState<Record<string, string>>({})
  const [added, setAdded] = React.useState<string[]>([])
  const [editing, setEditing] = React.useState<string | null>(sp.get("edit") === "none" ? null : "STRIPE_WEBHOOK_SECRET")
  const [draft, setDraft] = React.useState("whsec_9fK2…new")
  const [showDraft, setShowDraft] = React.useState(true)
  const [revealed, setRevealed] = React.useState<Record<string, number>>({})
  const [expanded, setExpanded] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [bulk, setBulk] = React.useState(false)
  const [bulkText, setBulkText] = React.useState("")

  const nStaged = Object.keys(staged).length
  const visible = expanded ? rows : rows.slice(0, 5 + added.length)

  // reveal countdown
  React.useEffect(() => {
    if (!Object.keys(revealed).length) return
    const t = setInterval(() => {
      setRevealed((r) => {
        const next: Record<string, number> = {}
        for (const [k, v] of Object.entries(r)) if (v > 1) next[k] = v - 1
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [revealed])

  const startEdit = (r: SecretRow) => {
    setEditing(r.key)
    setDraft(staged[r.key] ?? (r.secret ? "" : r.value))
    setShowDraft(!r.secret)
  }
  const stage = () => {
    if (!editing) return
    const orig = rows.find((r) => r.key === editing)
    if (orig && draft !== orig.value && draft.trim()) setStaged((s) => ({ ...s, [editing]: draft }))
    setEditing(null)
  }
  const cancel = () => {
    if (editing && added.includes(editing) && !staged[editing]) {
      setRows((rs) => rs.filter((r) => r.key !== editing))
      setAdded((a) => a.filter((k) => k !== editing))
    }
    setEditing(null)
  }
  useHotkey("enter", () => (editing ? stage() : nStaged && setConfirm(true)), { meta: true })

  const reveal = (r: SecretRow) => {
    setRevealed((x) => ({ ...x, [r.key]: 30 }))
    logEntry({ when: nowHHMM(), who: "Alex", kind: "reveal", verb: "revealed", key: r.key, rest: ` · from editor (${env})` })
    toast(`${r.key} visible for 30s`, { description: "Logged · owner notified" })
  }
  const copy = async (r: SecretRow) => {
    try {
      await navigator.clipboard.writeText(r.value)
    } catch {}
    logEntry({ when: nowHHMM(), who: "Alex", kind: "reveal", verb: "copied", key: r.key, rest: ` · ${env}` })
    toast.success(`Copied ${r.key}`, { description: "Clipboard clears in 30s · logged" })
  }
  const addKey = () => {
    const key = `NEW_KEY_${added.length + 1}`
    setRows((rs) => [{ key, value: "", masked: "", secret: true, updated: "new" }, ...rs])
    setAdded((a) => [...a, key])
    setEditing(key)
    setDraft("")
    setShowDraft(true)
  }
  const rotate = (r: SecretRow) => {
    setStaged((s) => ({ ...s, [r.key]: "s.new…(rotated)" }))
    toast("New SecretID staged", { description: "Old one stays valid 24h after save" })
  }
  const save = () => {
    setSaving(true)
    setTimeout(() => {
      const prevRows = rows
      setRows((rs) => rs.map((r) => (staged[r.key] !== undefined ? { ...r, value: staged[r.key], updated: "just now · Alex", note: r.key === "SECRET_ID" ? undefined : r.note } : r)))
      Object.keys(staged).forEach((k) => logEntry({ when: nowHHMM(), who: "Alex", kind: "change", verb: "changed", key: k, rest: ` · ${env}` }))
      const n = nStaged
      setStaged({})
      setAdded([])
      setSaving(false)
      setConfirm(false)
      toast.success(`${n} change${n > 1 ? "s" : ""} saved to ${env}`, {
        description: env === "prod" ? "3 pods restarting · rolling" : "pods restart once",
        action: { label: "Undo", onClick: () => setRows(prevRows) },
      })
    }, 1100)
  }
  const applyBulk = () => {
    const next: Record<string, string> = { ...staged }
    bulkText.split("\n").forEach((line) => {
      const i = line.indexOf("=")
      if (i < 1) return
      const k = line.slice(0, i).trim()
      const v = line.slice(i + 1).trim()
      const r = rows.find((x) => x.key === k)
      if (r && r.value !== v) next[k] = v
    })
    const changed = Object.keys(next).length - nStaged
    setStaged(next)
    setBulk(false)
    toast(changed > 0 ? `${changed} change${changed > 1 ? "s" : ""} staged from bulk edit` : "No changes found")
  }

  const versionsKey = sp.get("key") ?? "DATABASE_URL"

  return (
    <Frame crumbs={<SecretsCrumbs project={project} env={env} />} className="pb-28">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3.5">
          <VaultMark className="mt-1.5" />
          <div>
            <h1 className="text-[20px] leading-7 font-semibold tracking-[-0.01em] text-foreground">{project} secrets</h1>
            <p className="text-sm text-muted-foreground">
              secret/commerce/{project} · {rows.length} keys
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => (setBulkText(rows.filter((r) => !r.inherited).map((r) => `${r.key}=${staged[r.key] ?? r.value}`).join("\n")), setBulk(true))}>
            Bulk edit
          </Btn>
          <Btn variant="secondary" href={`${base}/upload`}>
            Upload .env
          </Btn>
          <Btn variant="secondary" href={`${base}/compare`}>
            Compare
          </Btn>
          <Btn variant="secondary" onClick={addKey}>
            <Plus /> Add key
          </Btn>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-b border-line-2">
        <div className="flex">
          {(["dev", "qa", "prod"] as Env[]).map((e) => (
            <button key={e} onClick={() => setEnv(e)} className={cn("relative px-3 pb-2.5 text-sm", env === e ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {e} · {envCounts[e]}
              {env === e && <motion.span layoutId="env-tab" transition={{ duration: 0.3, ease }} className="absolute right-0 bottom-[-1px] left-0 h-0.5 bg-foreground" />}
            </button>
          ))}
          <Link href={`${base}/tokens`} className="px-3 pb-2.5 text-sm text-muted-foreground hover:text-foreground">
            + branch
          </Link>
        </div>
        <div className="pb-2.5 text-[12.5px] text-muted-foreground">
          <Link href={`${base}/access-log`} className="hover:text-foreground">Logs</Link> ·{" "}
          <Link href={`${base}/tree`} className="hover:text-foreground">Access</Link> ·{" "}
          <Link href={`${base}/tokens`} className="hover:text-foreground">Service tokens</Link>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-line-2 bg-surface">
        <div className="grid h-9 grid-cols-[260px_1fr_220px] items-center border-b border-line px-4">
          <span className="text-[11px] tracking-[0.08em] text-subtle uppercase">Key</span>
          <span className="text-[11px] tracking-[0.08em] text-subtle uppercase">Value</span>
          <span className="text-[11px] tracking-[0.08em] text-subtle uppercase">Updated</span>
        </div>
        <AnimatePresence initial={false}>
          {visible.map((r) => {
            const isEdit = editing === r.key
            const isStaged = staged[r.key] !== undefined
            const secs = revealed[r.key]
            return (
              <motion.div
                key={r.key}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease }}
                className={cn(
                  "group relative border-b border-line last:border-0",
                  (isEdit || isStaged) && "bg-surface-2/60",
                )}
              >
                {(isEdit || isStaged) && <motion.span layoutId={`bar-${r.key}`} className={cn("absolute top-0 bottom-0 left-0 w-0.5", isEdit ? "bg-info" : "bg-primary")} />}
                <div className={cn("grid grid-cols-[260px_1fr_220px] items-center px-4", isEdit ? "py-3" : "h-[41px]")}>
                  {added.includes(r.key) && isEdit ? (
                    <input
                      defaultValue={r.key}
                      onBlur={(e) => {
                        const k = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
                        if (k && k !== r.key) {
                          setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, key: k } : x)))
                          setAdded((a) => a.map((x) => (x === r.key ? k : x)))
                          setEditing(k)
                        }
                      }}
                      className="mr-4 h-8 rounded-[7px] border border-line-3 bg-page px-2 font-mono text-[12.5px] text-foreground outline-none"
                    />
                  ) : (
                    <span className="font-mono text-[12.5px] text-foreground">{r.key}</span>
                  )}

                  {isEdit ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 flex-1 items-center rounded-[7px] border border-info/80 bg-page px-2.5 ring-2 ring-info/10">
                        <input
                          autoFocus
                          type={showDraft ? "text" : "password"}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              stage()
                            }
                            if (e.key === "Escape") cancel()
                          }}
                          placeholder={r.secret ? "Paste new value" : ""}
                          className="flex-1 bg-transparent font-mono text-[12.5px] text-foreground outline-none"
                        />
                        <button onClick={() => setShowDraft((s) => !s)} className="text-[11px] text-subtle hover:text-foreground">
                          {showDraft ? "Hide" : "Show"}
                        </button>
                      </div>
                      <span className="text-[12.5px] text-info">editing</span>
                    </div>
                  ) : (
                    <button onClick={() => !r.inherited && startEdit(r)} className="flex min-w-0 items-center gap-2 text-left" title={r.inherited ? "Inherited — open versions to override" : "Click to edit"}>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={secs ? "plain" : isStaged ? "staged" : "mask"}
                          initial={{ opacity: 0, filter: "blur(4px)" }}
                          animate={{ opacity: 1, filter: "blur(0px)" }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn("truncate font-mono text-[12.5px]", r.secret && !secs && !isStaged ? "tracking-[0.2em] text-muted-foreground" : "text-foreground")}
                        >
                          {secs ? r.value : isStaged ? (r.secret ? "•••••••• (new)" : staged[r.key]) : r.masked || "—"}
                        </motion.span>
                      </AnimatePresence>
                      {secs ? (
                        <span className="text-[11px] text-warning tabular-nums">hides in {secs}s</span>
                      ) : isStaged ? (
                        <span className="text-[11px] text-primary">staged</span>
                      ) : (
                        r.note && <span className={cn("text-[11px]", r.noteTone === "warn" ? "text-warning" : "text-subtle")}>{r.note.startsWith("from") || r.noteTone === "warn" ? r.note : `· ${r.note}`}</span>
                      )}
                    </button>
                  )}

                  {isEdit ? (
                    <span />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] text-muted-foreground">{r.updated}</span>
                      <span className="flex items-center gap-1">
                        {r.secret && (
                          <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              aria-label={secs ? "Hide" : "Reveal"}
                              onClick={() => (secs ? setRevealed((x) => ({ ...x, [r.key]: 0 })) : reveal(r))}
                              className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground"
                            >
                              {secs ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                            <button aria-label="Copy" onClick={() => copy(r)} className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground">
                              <Copy className="size-3.5" />
                            </button>
                          </span>
                        )}
                        {r.action === "Rotate" && !isStaged ? (
                          <button onClick={() => rotate(r)} className="rounded px-1.5 py-0.5 text-[12.5px] text-foreground hover:bg-surface-3">
                            Rotate
                          </button>
                        ) : (
                          <Link href={`${base}/versions?key=${r.key}`} aria-label="Versions" className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-foreground">
                            <MoreHorizontal className="size-4" />
                          </Link>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {isEdit && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-[260px_1fr] px-4 pb-3">
                    <span />
                    <div className="flex items-center justify-between">
                      {env === "prod" ? (
                        <span className="flex items-center gap-1.5 text-[12.5px] text-warning">
                          <TriangleAlert className="size-3.5" /> prod · 3 pods restart on save
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-subtle">{env} · pods restart once on save</span>
                      )}
                      <span className="flex items-center gap-2">
                        <span className="text-[12px] text-subtle">Esc to cancel</span>
                        <Btn size="xs" variant="secondary" onClick={cancel}>
                          Cancel
                        </Btn>
                        <Btn size="xs" variant="primary" onClick={stage}>
                          Save · ⌘↵
                        </Btn>
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        <button onClick={() => setExpanded((e) => !e)} className="flex h-10 w-full items-center px-4 font-mono text-[12px] text-subtle hover:text-foreground">
          {expanded ? "− show fewer" : `+ ${rows.length - 5 - added.length} more keys`}
        </button>
      </div>
      <p className="mt-6 text-[13px] text-subtle">Click any value to edit in place. Revealing a value is logged.</p>

      {/* staged changes bar */}
      <AnimatePresence>
        {nStaged > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-6 left-1/2 z-30 flex w-[min(720px,calc(100%-48px))] -translate-x-1/2 items-center justify-between rounded-[14px] border border-line-3 bg-surface px-4 py-3 shadow-2xl"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white tabular-nums">{nStaged}</span>
              staged change{nStaged > 1 ? "s" : ""} on <b className={env === "prod" ? "text-warning" : ""}>{env}</b>
            </span>
            <span className="flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => setStaged({})}>
                Discard
              </Btn>
              <Btn size="sm" variant="primary" onClick={() => (env === "prod" ? setConfirm(true) : save())}>
                {saving && <Loader2 className="animate-spin" />}
                Save {nStaged} change{nStaged > 1 ? "s" : ""}
              </Btn>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* tier-2 prod confirm with diff */}
      <Modal open={confirm} onClose={() => !saving && setConfirm(false)} className="w-[540px]">
        <div className="flex flex-col gap-3 p-5.5">
          <h2 className="text-base font-semibold text-foreground">Save {nStaged} change{nStaged > 1 ? "s" : ""} to prod?</h2>
          <p className="text-sm text-muted-foreground">order-service restarts 3 pods (rolling). Previous values stay as versions — you can restore them.</p>
          <div className="flex flex-col gap-1 rounded-[10px] border border-line-2 bg-page p-3 font-mono text-[12px]">
            {Object.keys(staged).map((k) => (
              <div key={k} className="flex justify-between">
                <span className="text-foreground">~ {k}</span>
                <span className="text-subtle">v{14 + Object.keys(staged).indexOf(k)} → new</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-warning">
            <TriangleAlert className="size-3.5" /> Blast radius: order-service · prod · 3 pods
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line-2 px-5.5 py-4">
          <Btn variant="secondary" onClick={() => setConfirm(false)} disabled={saving}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {saving ? "Saving…" : "Save to prod"}
          </Btn>
        </div>
      </Modal>

      {/* bulk edit */}
      <Modal open={bulk} onClose={() => setBulk(false)} className="w-[640px]">
        <div className="flex flex-col gap-3 p-5.5">
          <h2 className="text-base font-semibold text-foreground">Bulk edit · {env}</h2>
          <p className="text-[13px] text-muted-foreground">One KEY=value per line. Changed lines are staged — nothing saves until you confirm.</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={10}
            className="resize-none rounded-[10px] border border-line-3 bg-page p-3 font-mono text-[12px] text-foreground outline-none focus:border-foreground/50"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-line-2 px-5.5 py-4">
          <Btn variant="secondary" onClick={() => setBulk(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={applyBulk}>
            Stage changes
          </Btn>
        </div>
      </Modal>

      <VersionsDrawer open={panel === "versions"} keyName={versionsKey} onClose={() => router.replace(base, { scroll: false })} />
      <TokensDrawer open={panel === "tokens"} onClose={() => router.replace(base, { scroll: false })} />
    </Frame>
  )
}

/** 14b — versions & inheritance. */
function VersionsDrawer({ open, onClose, keyName }: { open: boolean; onClose: () => void; keyName: string }) {
  const [older, setOlder] = React.useState(false)
  const [overridden, setOverridden] = React.useState(false)
  const restore = () => {
    toast.success("v13 restored as v15 on prod", { description: "3 pods restarting", action: { label: "Undo", onClick: () => toast("Restore undone") } })
    onClose()
  }
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={<span className="font-mono text-[14px]">{keyName}</span>}
      right={<span className="rounded-[5px] border border-warning/60 bg-warning/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-warning">PROD</span>}
      footer={
        <>
          <Btn variant="secondary" size="lg" className="flex-1" onClick={() => (setOverridden(true), toast("Now overriding in order-service · prod"))}>
            Override
          </Btn>
          <Btn
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => {
              logEntry({ when: nowHHMM(), who: "Alex", kind: "reveal", verb: "revealed", key: keyName, rest: " · from versions" })
              toast(`${keyName} visible for 30s`, { description: "postgres://orders:9xF…@pg-prodban0x000:5432/orders" })
            }}
          >
            Reveal (logged)
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-2 border-b border-line-2 p-5">
        <div className="text-[11px] tracking-[0.08em] text-subtle uppercase">Where the value comes from</div>
        <div className={cn("flex h-8.5 items-center justify-between rounded-[8px] border px-3 font-mono text-[12px]", overridden ? "border-line-2 text-subtle line-through" : "border-line-3 text-foreground")}>
          shared/commerce <span className="font-sans text-[11px] text-success no-underline">{overridden ? "" : "defines it"}</span>
        </div>
        <div className="ml-3 h-2 w-px bg-line-3" />
        <div className="flex h-8.5 items-center justify-between rounded-[8px] border border-foreground px-3 font-mono text-[12px] text-foreground">
          order-service · prod <span className={cn("font-sans text-[11px]", overridden ? "text-warning" : "text-subtle")}>{overridden ? "overrides" : "inherits"}</span>
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Override here to stop inheriting. 3 other services use the shared value.</p>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="text-[11px] tracking-[0.08em] text-subtle uppercase">Versions</div>
        {secretVersions.map((v, i) => (
          <motion.div key={v.v} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08, ease }} className="relative flex gap-3">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", v.current ? "bg-foreground" : "bg-subtle")} />
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm text-foreground">{v.label}</span>
                <span className="text-[11.5px] text-subtle">{v.when}</span>
              </div>
              {v.note && <div className="text-[11.5px] text-subtle">{v.note}</div>}
              {v.diff && (
                <>
                  <div className="mt-2 rounded-[6px] border border-line-2 bg-page p-2 font-mono text-[11px]">
                    <div className="text-destructive">- {v.diff[0]}</div>
                    <div className="text-success">+ {v.diff[1]}</div>
                  </div>
                  <div className="mt-2 flex gap-3 text-[12.5px]">
                    <button onClick={restore} className="text-foreground underline underline-offset-4">
                      Restore {v.v}
                    </button>
                    <Link href="compare" className="text-muted-foreground hover:text-foreground">
                      Compare
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
        <button onClick={() => setOlder((o) => !o)} className="flex items-center gap-3 text-left">
          <span className="size-2 rounded-full bg-faint" />
          <span className="flex-1 text-sm text-subtle">v12 and 11 older</span>
          <span className="text-[11px] text-subtle">{older ? "hide" : "show"}</span>
        </button>
        <AnimatePresence>
          {older && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="ml-5 flex flex-col gap-2 overflow-hidden text-[12.5px] text-muted-foreground">
              {["v12 · Aug 2 · Sam", "v11 · Jul 9 · auto-rotated", "v10 · Jun 3 · Alex"].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Drawer>
  )
}

/** 16f — branch + service tokens; token shown once. */
function TokensDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tokens, setTokens] = React.useState(serviceTokens)
  const [name, setName] = React.useState("datadog-agent")
  const [envs, setEnvs] = React.useState<string[]>(["prod"])
  const [exp, setExp] = React.useState("90d")
  const [created, setCreated] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const create = () => {
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      setCreated(`hvs.CAESIJ${name.length}x8Qk2mP0vT4rLz9sWb_${envs.join("")}`)
      setTokens((t) => [...t, { id: name, name, sub: `${envs.join(", ")} · never used` }])
    }, 900)
  }
  const revoke = (id: string) => {
    const prev = tokens
    setTokens((t) => t.filter((x) => x.id !== id))
    toast(`${id} token revoked`, { action: { label: "Undo", onClick: () => setTokens(prev) } })
  }
  const close = () => {
    setCreated(null)
    setCopied(false)
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Service tokens"
      footer={
        created ? (
          <Btn variant="primary" size="lg" className="flex-1" onClick={close} disabled={!copied}>
            {copied ? "I've stored it — done" : "Copy the token first"}
          </Btn>
        ) : (
          <>
            <Btn variant="secondary" size="lg" className="flex-1" onClick={close}>
              Cancel
            </Btn>
            <Btn variant="primary" size="lg" className="flex-1" onClick={create} disabled={!name.trim() || !envs.length || busy}>
              {busy && <Loader2 className="animate-spin" />}
              Create token
            </Btn>
          </>
        )
      }
    >
      <div className="flex flex-col border-b border-line-2 p-5 pb-3">
        <p className="mb-3 text-[12.5px] text-muted-foreground">Read-only tokens for CI or other services to pull these secrets.</p>
        <AnimatePresence initial={false}>
          {tokens.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between border-b border-line py-3 last:border-0">
              <div>
                <div className="text-sm text-foreground">{t.name}</div>
                <div className="text-[11.5px] text-subtle">{t.sub}</div>
              </div>
              <button onClick={() => revoke(t.id)} className="text-[12.5px] text-muted-foreground hover:text-destructive">
                Revoke
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {created ? (
          <motion.div key="once" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="size-4" /> {name} created
            </div>
            <div className="rounded-[10px] border border-warning/30 bg-warning/6 p-3 text-[12.5px] text-warning">Shown once. Copy it now — you won&apos;t see it again.</div>
            <div className="flex items-center gap-2 rounded-[10px] border border-line-3 bg-page p-3">
              <code className="flex-1 truncate font-mono text-[12px] text-foreground">{created}</code>
              <Btn
                size="xs"
                variant={copied ? "secondary" : "primary"}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(created)
                  } catch {}
                  setCopied(true)
                  toast.success("Token copied")
                }}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Btn>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 p-5">
            <div className="text-[11px] tracking-[0.08em] text-subtle uppercase">New token</div>
            <label className="mt-1 text-[13px] text-muted-foreground">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-[9px] border border-foreground/80 bg-page px-3 font-mono text-sm text-foreground outline-none" />
            <label className="mt-2 text-[13px] text-muted-foreground">Environments</label>
            <div className="flex gap-1.5">
              {["prod", "qa", "dev"].map((e) => {
                const on = envs.includes(e)
                return (
                  <button
                    key={e}
                    onClick={() => setEnvs((s) => (on ? s.filter((x) => x !== e) : [...s, e]))}
                    className={cn("flex h-7.5 items-center gap-1 rounded-[7px] border px-2.5 text-[12.5px] transition-colors", on ? "border-foreground text-foreground" : "border-line-3 text-muted-foreground hover:text-foreground")}
                  >
                    {on && <Check className="size-3" />}
                    {e}
                  </button>
                )
              })}
            </div>
            <label className="mt-2 text-[13px] text-muted-foreground">Expires</label>
            <Segmented id="tok-exp" stretch value={exp} onChange={setExp} options={["30d", "90d", "1 year"].map((v) => ({ value: v, label: v }))} />
            <div className="mt-4 flex flex-col gap-1.5 rounded-[10px] border border-line-2 p-3">
              <div className="text-[11px] tracking-[0.08em] text-subtle uppercase">Or add a branch</div>
              <div className="text-[12.5px] text-muted-foreground">prod-eu · inherits all prod keys, override only what differs</div>
              <button onClick={() => toast.success("Branch prod-eu created from prod", { description: "11 keys inherited · 0 overrides" })} className="self-start text-[12.5px] text-foreground underline underline-offset-4">
                Create branch from prod
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  )
}
