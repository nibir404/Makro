import { Suspense } from "react"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/shell/app-shell"

export function generateStaticParams() {
  return [{ mode: "canvas" }, { mode: "classic" }]
}

/** The shell is client-driven; let Next block on the tiny `mode` param instead of streaming. */
export const instant = false

type Params = Promise<{ mode: string }>

/** Reads the dynamic `mode` param inside a Suspense boundary (Next 16 instant-shell rule). */
async function ModeGate({ params, children }: { params: Params; children: React.ReactNode }) {
  const { mode } = await params
  if (mode !== "canvas" && mode !== "classic") notFound()
  return <AppShell mode={mode}>{children}</AppShell>
}

export default function ModeLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <ModeGate params={params}>{children}</ModeGate>
    </Suspense>
  )
}
