"use client"

import { CanvasShell } from "./canvas-shell"
import { ClassicShell } from "./classic-shell"
import { CommandMenuProvider } from "./overlays"

export function AppShell({ mode, children }: { mode: "canvas" | "classic"; children: React.ReactNode }) {
  return (
    <CommandMenuProvider>
      {mode === "canvas" ? <CanvasShell>{children}</CanvasShell> : <ClassicShell>{children}</ClassicShell>}
    </CommandMenuProvider>
  )
}
