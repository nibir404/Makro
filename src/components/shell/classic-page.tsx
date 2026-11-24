"use client"

import { cn } from "@/lib/utils"
import { ClassicTopbar } from "./classic-shell"

/** Standard Classic-mode page: sticky topbar (breadcrumb + mode toggle + bell) and padded content. */
export function ClassicPage({
  crumbs,
  children,
  className,
  bare,
}: {
  crumbs?: React.ReactNode
  children: React.ReactNode
  className?: string
  bare?: boolean
}) {
  return (
    <>
      <ClassicTopbar crumbs={crumbs} />
      {bare ? children : <div className={cn("flex flex-1 flex-col gap-6 px-7 py-6", className)}>{children}</div>}
    </>
  )
}
