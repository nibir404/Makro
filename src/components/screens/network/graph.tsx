"use client"

import * as React from "react"
import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"

export type GTone = "default" | "warn" | "fail" | "focus"
export type GNodeData = {
  title: React.ReactNode
  sub?: React.ReactNode
  subTone?: "ok" | "warn" | "fail" | "muted"
  tone?: GTone
  dashed?: boolean
  lead?: React.ReactNode
  trail?: React.ReactNode
  mono?: boolean
  dim?: boolean
  w?: number
}

function GNode({ data, selected }: NodeProps<Node<GNodeData>>) {
  const t = data.tone ?? "default"
  return (
    <div
      style={{ width: data.w ?? 180 }}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[8px] border bg-surface px-3 py-2.5 transition-[opacity,border-color,box-shadow] duration-300",
        data.dashed && "border-dashed",
        t === "warn" && "border-warning/80 bg-warning/5",
        t === "fail" && "border-destructive/80 bg-destructive/5",
        t === "focus" && "border-foreground shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
        t === "default" && "border-line-3 hover:border-subtle",
        selected && t === "default" && "border-foreground",
        data.dim && "opacity-35",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" />
      {data.lead}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[12.5px] text-foreground", data.mono && "font-mono")}>{data.title}</div>
        {data.sub && (
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1.5 truncate text-[10.5px]",
              data.subTone === "ok" ? "text-success" : data.subTone === "warn" ? "text-warning" : data.subTone === "fail" ? "text-destructive" : "text-subtle",
            )}
          >
            {data.sub}
          </div>
        )}
      </div>
      {data.trail}
      <Handle type="source" position={Position.Right} className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" />
    </div>
  )
}

const nodeTypes = { g: GNode }

export type ETone = "default" | "warn" | "fail" | "ok"
export function edge(source: string, target: string, tone: ETone = "default", opts: { dashed?: boolean; dim?: boolean; animated?: boolean } = {}): Edge {
  const color = { default: "var(--subtle)", warn: "var(--warning)", fail: "var(--destructive)", ok: "var(--success)" }[tone]
  return {
    id: `${source}-${target}`,
    source,
    target,
    animated: opts.animated,
    style: {
      stroke: color,
      strokeWidth: 1.25,
      strokeDasharray: opts.dashed ? "4 4" : undefined,
      opacity: opts.dim ? 0.18 : tone === "default" ? 0.7 : 1,
      transition: "opacity 300ms",
    },
  }
}

export function FlowCanvas({
  nodes,
  edges,
  onNodeClick,
  onPaneClick,
  columns,
}: {
  nodes: Node<GNodeData>[]
  edges: Edge[]
  onNodeClick?: (id: string) => void
  onPaneClick?: () => void
  columns: { label: string; x: number }[]
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 24, y: 0, zoom: 1 }}
        minZoom={0.5}
        maxZoom={1.6}
        nodesConnectable={false}
        nodesDraggable
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => onNodeClick?.(n.id)}
        onPaneClick={onPaneClick}
        className="!bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--faint)" />
        {/* column headers live in flow space so they pan with the graph */}
      </ReactFlow>
      </div>
      <div className="pointer-events-none absolute top-0 left-0 flex w-full">
        {columns.map((c) => (
          <span key={c.label} className="absolute top-6 text-[11px] font-medium tracking-[0.08em] text-subtle uppercase" style={{ left: c.x + 24 }}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export type { Node, Edge }
