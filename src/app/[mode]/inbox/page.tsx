"use client"

import { Suspense } from "react"
import { useMode } from "@/lib/mode"
import { CanvasInbox, ClassicInbox } from "@/components/screens/inbox/inbox"

export default function InboxPage() {
  const mode = useMode()
  return <Suspense>{mode === "canvas" ? <CanvasInbox /> : <ClassicInbox />}</Suspense>
}
