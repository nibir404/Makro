"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { useHref } from "@/lib/mode"
import { Btn, ease } from "@/components/idp/kit"
import { Frame, Segmented, TableCard, Th, VaultMark } from "../network/ui"
import { FlowCanvas, edge, type GNodeData, type Node } from "../network/graph"
import { SecretsCrumbs, useProject } from "./editor"

const KEYS = ["FEATURE_NEW_CHECKOUT", "DATABASE_URL", "REDIS_URL"] as const
type K = (typeof KEYS)[number]

const COL = { shared: 0, services: 446, envs: 806 }

function Val({ v, tone }: { v: string; tone?: "ok" | "fail" | "muted" }) {
  return <span className={tone === "fail" ? "text-[10.5px] text-destructive" : tone === "muted" ? "text-[10.5px] text-subtle" : "font-mono text-[10.5px] text-success"}>{v}</span>
}

/** 14f — inheritance tree canvas. */
export function TreeScreen() {
  const project = useProject()
  const href = useHref()
  const [view, setView] = React.useState<"canvas" | "list">("canvas")
  const [key, setKey] = React.useState<K>("FEATURE_NEW_CHECKOUT")
  const [fixed, setFixed] = React.useState(false)
  const [focus, setFocus] = React.useState<string | null>("prod")
  const missing = key === "FEATURE_NEW_CHECKOUT" && !fixed

  const nodes: Node<GNodeData>[] = [
    { id: "shared", position: { x: COL.shared + 86, y: 380 }, data: { title: "shared/commerce", mono: true, sub: "6 keys · used by 3 services", lead: <VaultMark className="size-3.5" />, w: 220 } },
    { id: "order", position: { x: COL.services, y: 196 }, data: { title: project, sub: "11 keys · 2 overrides", tone: "focus", w: 220 } },
    { id: "checkout", position: { x: COL.services, y: 386 }, data: { title: "checkout-api", sub: "9 keys", w: 220 } },
    { id: "fulfilment", position: { x: COL.services, y: 576 }, data: { title: "fulfilment", sub: "7 keys", w: 220 } },
    { id: "dev", position: { x: COL.envs, y: 136 }, data: { title: "dev", trail: <Val v="a91f" />, w: 200 } },
    { id: "qa", position: { x: COL.envs, y: 202 }, data: { title: "qa", trail: <Val v="a91f" />, w: 200 } },
    {
      id: "prod",
      position: { x: COL.envs, y: 282 },
      data: { title: "prod", trail: missing ? <Val v="missing" tone="fail" /> : <Val v="a91f" />, tone: missing ? "fail" : undefined, dashed: missing, w: 200 },
    },
    { id: "co-envs", position: { x: COL.envs, y: 392 }, data: { title: "dev · qa · prod", trail: <Val v="not used" tone="muted" />, w: 200 } },
    { id: "fu-a", position: { x: COL.envs, y: 532 }, data: { title: "dev · qa", trail: <Val v="not used" tone="muted" />, w: 200 } },
    { id: "fu-b", position: { x: COL.envs, y: 632 }, data: { title: "prod", trail: <Val v="not used" tone="muted" />, w: 200 } },
  ].map((n) => ({ ...n, type: "g", data: { ...n.data, dim: focus && focus !== n.id && !["order", "shared"].includes(n.id) && focus !== "prod" ? true : false } }) as Node<GNodeData>)

  const edges = [
    edge("shared", "order"),
    edge("shared", "checkout"),
    edge("shared", "fulfilment"),
    edge("order", "dev"),
    edge("order", "qa"),
    edge("order", "prod", missing ? "fail" : "ok", { dashed: missing, animated: !missing }),
    edge("checkout", "co-envs"),
    edge("fulfilment", "fu-a"),
    edge("fulfilment", "fu-b"),
  ]

  const copy = () => {
    setFixed(true)
    toast.success("FEATURE_NEW_CHECKOUT copied qa → prod", { description: "v1.42 health check will pass", action: { label: "Undo", onClick: () => setFixed(false) } })
  }

  return (
    <Frame bare crumbs={<SecretsCrumbs project={project} tail="Inheritance" />}>
      <div className="dot-grid relative flex min-h-[calc(100vh-56px)] flex-1 flex-col">
        <div className="relative z-10 flex items-center gap-4 px-6 pt-5">
          <Segmented id="tree-view" value={view} onChange={setView} className="bg-surface" options={[{ value: "canvas", label: "Canvas" }, { value: "list", label: "List" }]} />
          <VaultMark className="size-4" />
          <span className="text-[15px] font-semibold text-foreground">Secret inheritance</span>
          <span className="text-[12.5px] text-subtle">commerce · tracing</span>
          <select
            value={key}
            onChange={(e) => setKey(e.target.value as K)}
            className="h-7 rounded-[6px] border border-line-3 bg-surface px-2 font-mono text-[12px] text-foreground outline-none"
            aria-label="Key to trace"
          >
            {KEYS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>

        {view === "canvas" ? (
          <>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodeClick={(id) => setFocus(id)}
              onPaneClick={() => setFocus(null)}
              columns={[
                { label: "Shared", x: COL.shared },
                { label: "Services", x: COL.services },
                { label: "Environments", x: COL.envs },
              ]}
            />
            <AnimatePresence>
              {missing && focus === "prod" && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3, ease }}
                  className="absolute top-[250px] right-10 z-10 w-80 rounded-[14px] border border-line-3 bg-surface p-4 shadow-2xl"
                >
                  <div className="text-sm font-medium text-foreground">Missing in {project} · prod</div>
                  <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">
                    qa has it, prod doesn&apos;t. The new checkout flow is behind this flag, so v1.42 will fail its health check when promoted.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Btn size="sm" variant="primary" onClick={copy}>
                      Copy qa → prod
                    </Btn>
                    <Btn size="sm" variant="secondary" href={href(`/secrets/${project}?env=prod&edit=none`)}>
                      Set value
                    </Btn>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-4 rounded-[8px] border border-line-2 bg-surface px-3 py-2 text-[11.5px]">
              <span className="text-muted-foreground">— inherits</span>
              <span className="text-destructive">┄ missing</span>
              <span className="text-subtle">Pick any key to trace where it comes from and where it&apos;s missing</span>
            </div>
          </>
        ) : (
          <div className="p-6">
            <TableCard>
              <div className="grid h-9 grid-cols-4 items-center border-b border-line px-4">
                <Th>Service</Th>
                <Th>Dev</Th>
                <Th>QA</Th>
                <Th>Prod</Th>
              </div>
              {[
                [project, "a91f", "a91f", missing ? "missing" : "a91f"],
                ["checkout-api", "not used", "not used", "not used"],
                ["fulfilment", "not used", "not used", "not used"],
              ].map(([s, ...v]) => (
                <div key={s} className="grid h-11 grid-cols-4 items-center border-b border-line px-4 text-[13px] last:border-0">
                  <span className="text-foreground">{s}</span>
                  {v.map((x, i) => (
                    <span key={i} className={x === "missing" ? "text-destructive" : x === "not used" ? "text-subtle" : "font-mono text-success"}>
                      {x}
                    </span>
                  ))}
                </div>
              ))}
            </TableCard>
          </div>
        )}
      </div>
    </Frame>
  )
}
