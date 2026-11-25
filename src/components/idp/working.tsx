"use client"

/* "Working" indicators for operations that take a while (provisioning, applying, rollouts).
   A small LED dot-matrix in the accent colour + a label with a warm glow sweeping across it.
   Pure CSS animation (keyframes in globals.css), so it costs nothing per frame and respects
   prefers-reduced-motion. */

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"

export type PixelPattern = "ripple" | "rise" | "scan"

/** Bar heights (from the bottom) for the rising-chart pattern, per column. */
const RISE: Record<number, number[]> = {
  3: [1, 2, 3],
  5: [1, 2, 2, 4, 5],
  7: [1, 2, 2, 3, 4, 5, 7],
}

function cellDelay(p: PixelPattern, n: number, r: number, c: number) {
  const mid = (n - 1) / 2
  if (p === "ripple") return Math.hypot(r - mid, c - mid) * 0.16
  if (p === "scan") return (r + c) * 0.08
  return c * 0.14 + (n - 1 - r) * 0.05 // rise: left to right, bottom up
}

export function PixelGrid({
  pattern = "ripple",
  size = 5,
  cell = 2.5,
  gap = 1,
  paused,
  className,
}: {
  pattern?: PixelPattern
  size?: 3 | 5 | 7
  cell?: number
  gap?: number
  paused?: boolean
  className?: string
}) {
  const heights = RISE[size]
  const cells = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const off = pattern === "rise" && size - r > heights[c]
      cells.push(
        <span
          key={`${r}-${c}`}
          className={cn("px-cell", off && "px-off", paused && "px-paused")}
          style={{ width: cell, height: cell, ["--d" as string]: `${cellDelay(pattern, size, r, c).toFixed(2)}s` }}
        />,
      )
    }
  }
  return (
    <span
      role="presentation"
      className={cn("inline-grid shrink-0", className)}
      style={{ gridTemplateColumns: `repeat(${size}, ${cell}px)`, gap }}
    >
      {cells}
    </span>
  )
}

/** Text with a glow sweeping across it. */
export function WorkingText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-sweep", className)}>{children}</span>
}

/** The full pill: dot-matrix + sweeping label. Changing `label` cross-fades it, so step names can tick by. */
export function WorkingPill({
  label,
  pattern = "ripple",
  size = "md",
  className,
}: {
  label: string
  pattern?: PixelPattern
  size?: "sm" | "md"
  className?: string
}) {
  const sm = size === "sm"
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center rounded-full border border-line-2 bg-page/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] backdrop-blur",
        sm ? "h-7 gap-2 pr-3 pl-2" : "h-10 gap-3 pr-4.5 pl-3",
        className,
      )}
    >
      <PixelGrid pattern={pattern} size={sm ? 5 : 7} cell={sm ? 2 : 3} gap={sm ? 1 : 1.5} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
          transition={{ duration: 0.25 }}
          className={cn("whitespace-nowrap", sm ? "text-xs" : "text-[15px] font-medium tracking-[-0.01em]")}
        >
          <WorkingText>{label}</WorkingText>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
