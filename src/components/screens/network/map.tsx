"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Network } from "lucide-react"
import { cn } from "@/lib/utils"
import { IntegrationLogo, StatusDot, ease } from "@/components/idp/kit"
import { Crumbs, Frame, Initials, MeAvatar, Segmented, TableCard, Th } from "./ui"
import { FlowCanvas, edge, type ETone, type GNodeData, type Node } from "./graph"

const COL = { people: 0, groups: 416, peers: 776, dest: 1096 }

type Raw = { id: string; x: number; y: number; data: GNodeData }
const RAW: Raw[] = [
  { id: "alex", x: COL.people + 76, y: 196, data: { title: "Alex Chen", lead: <MeAvatar className="size-4" /> } },
  { id: "jordan", x: COL.people + 76, y: 316, data: { title: "Jordan Lee", lead: <Initials className="size-4 text-[7px]">JL</Initials> } },
  { id: "mia", x: COL.people + 76, y: 436, data: { title: "Mia Romero", sub: "left team · still has access", subTone: "warn", tone: "warn", dashed: true, lead: <Initials className="size-4 text-[7px]">MR</Initials> } },
  { id: "sam", x: COL.people + 76, y: 556, data: { title: "Sam Kowalski", lead: <Initials className="size-4 text-[7px]">SK</Initials> } },
  { id: "commerce-order", x: COL.groups, y: 270, data: { title: "commerce-order", sub: "12 members", w: 200 } },
  { id: "dba-readonly", x: COL.groups, y: 530, data: { title: "dba-readonly", sub: "6 members", w: 200 } },
  { id: "rp-bkk-02", x: COL.peers, y: 390, data: { title: "rp-bkk-02", mono: true, sub: <><StatusDot health="ok" className="size-1.5" /> online</>, subTone: "ok", w: 200 } },
  { id: "rp-bkk-03", x: COL.peers, y: 630, data: { title: "rp-bkk-03", mono: true, sub: <><StatusDot health="fail" className="size-1.5" /> offline 40m · 1 grant failing</>, subTone: "fail", tone: "fail", w: 200 } },
  { id: "warehouse-api", x: COL.dest, y: 196, data: { title: "warehouse-api", sub: "expires in 3 days", subTone: "warn", w: 200 } },
  { id: "pg-prod-orders", x: COL.dest, y: 316, data: { title: "pg-prod-orders", sub: "reachable by 18 people", w: 200 } },
  { id: "grafana-internal", x: COL.dest, y: 436, data: { title: "grafana-internal", sub: "permanent", w: 200 } },
  { id: "redis-cache-qa", x: COL.dest, y: 596, data: { title: "redis-cache-qa", sub: "unreachable", subTone: "fail", dashed: true, tone: "fail", w: 200 } },
]

const LINKS: [string, string, ETone, boolean?][] = [
  ["alex", "commerce-order", "default"],
  ["jordan", "commerce-order", "default"],
  ["mia", "commerce-order", "warn", true],
  ["sam", "dba-readonly", "default"],
  ["commerce-order", "rp-bkk-02", "default"],
  ["dba-readonly", "rp-bkk-02", "default"],
  ["dba-readonly", "rp-bkk-03", "fail", true],
  ["rp-bkk-02", "warehouse-api", "warn"],
  ["rp-bkk-02", "pg-prod-orders", "ok"],
  ["rp-bkk-02", "grafana-internal", "default"],
  ["rp-bkk-03", "redis-cache-qa", "fail", true],
]

/** All nodes connected (upstream + downstream) to `id`. */
function reach(id: string) {
  const set = new Set([id])
  const walk = (dir: 0 | 1) => {
    let grew = true
    while (grew) {
      grew = false
      for (const l of LINKS) {
        const [from, to] = dir ? [l[1], l[0]] : [l[0], l[1]]
        if (set.has(from) && !set.has(to)) {
          // only keep walking in one direction from the focus
          set.add(to)
          grew = true
        }
      }
    }
  }
  walk(1)
  const up = new Set(set)
  set.clear()
  set.add(id)
  walk(0)
  return new Set([...up, ...set])
}

/** 13f — Access map canvas. */
export function AccessMapScreen() {
  const [view, setView] = React.useState<"canvas" | "list">("canvas")
  const [focus, setFocus] = React.useState<string | null>("pg-prod-orders")
  const [dimOn, setDimOn] = React.useState(false)
  const lit = focus && dimOn ? reach(focus) : null

  const nodes: Node<GNodeData>[] = RAW.map((r) => ({
    id: r.id,
    type: "g",
    position: { x: r.x, y: r.y },
    data: {
      ...r.data,
      tone: focus === r.id ? "focus" : r.data.tone,
      dim: lit ? !lit.has(r.id) : false,
    },
  }))
  const edges = LINKS.map(([s, t, tone, dashed]) => edge(s, t, tone, { dashed, dim: lit ? !(lit.has(s) && lit.has(t)) : false, animated: tone === "ok" && !!lit }))
  const focusTitle = RAW.find((r) => r.id === focus)?.data.title

  return (
    <Frame bare crumbs={<Crumbs items={[{ label: "Network access", href: "/network", icon: <Network className="size-[15px]" /> }, { label: "Access map" }]} />}>
      <div className="dot-grid relative flex min-h-[calc(100vh-56px)] flex-1 flex-col">
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-4">
            <Segmented id="map-view" value={view} onChange={setView} className="bg-surface" options={[{ value: "canvas", label: "Canvas" }, { value: "list", label: "List" }]} />
            <IntegrationLogo name="netbird" className="size-4" />
            <span className="text-[15px] font-semibold text-foreground">Who can reach what</span>
            <span className="text-[12.5px] text-subtle">commerce · prod</span>
          </div>
          <AnimatePresence mode="wait">
            {focus && (
              <motion.button
                key={focus}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setFocus(null)}
                className="h-8 rounded-[8px] border border-line-3 bg-surface px-3 text-[12.5px] text-foreground hover:bg-surface-2"
                title="Clear highlight"
              >
                Highlight: {focusTitle}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {view === "canvas" ? (
          <>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodeClick={(id) => (setDimOn(true), setFocus((f) => (f === id && dimOn ? null : id)))}
              onPaneClick={() => setFocus(null)}
              columns={[
                { label: "People", x: COL.people },
                { label: "Groups", x: COL.groups },
                { label: "Routing peers", x: COL.peers },
                { label: "Destinations", x: COL.dest },
              ]}
            />
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-4 rounded-[8px] border border-line-2 bg-surface px-3 py-2 text-[11.5px]">
              <span className="text-muted-foreground">— active</span>
              <span className="text-warning">┄ mismatch / expiring</span>
              <span className="text-destructive">┄ broken</span>
              <span className="text-subtle">Click a destination to see everyone who can reach it</span>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }} className="p-6">
            <TableCard>
              <div className="grid h-9 grid-cols-4 items-center border-b border-line px-4">
                <Th>Person</Th>
                <Th>Group</Th>
                <Th>Routing peer</Th>
                <Th>Destination</Th>
              </div>
              {[
                ["Alex Chen", "commerce-order", "rp-bkk-02", "warehouse-api · pg-prod-orders · grafana-internal", ""],
                ["Jordan Lee", "commerce-order", "rp-bkk-02", "warehouse-api · pg-prod-orders · grafana-internal", ""],
                ["Mia Romero", "commerce-order", "rp-bkk-02", "left team · still has access", "warn"],
                ["Sam Kowalski", "dba-readonly", "rp-bkk-02 · rp-bkk-03", "pg-prod-orders · redis-cache-qa (unreachable)", "fail"],
              ].map(([p, g, r, d, t]) => (
                <div key={p} className="grid h-11 grid-cols-4 items-center border-b border-line px-4 text-[13px] last:border-0">
                  <span className="text-foreground">{p}</span>
                  <span className="text-muted-foreground">{g}</span>
                  <span className="font-mono text-[12px] text-muted-foreground">{r}</span>
                  <span className={cn(t === "warn" ? "text-warning" : t === "fail" ? "text-destructive" : "text-muted-foreground")}>{d}</span>
                </div>
              ))}
            </TableCard>
          </motion.div>
        )}
      </div>
    </Frame>
  )
}
