"use client"

import { Suspense } from "react"
import { useMode } from "@/lib/mode"
import { AuditLog } from "@/components/screens/activity/activity"
import { ClassicPage } from "@/components/shell/classic-page"
import { Crumb } from "@/components/screens/shell-states/pages"
import { Activity as ActivityIcon } from "lucide-react"

export default function Page() {
  const body = <Suspense><AuditLog /></Suspense>
  return useMode() === "canvas" ? body : <ClassicPage bare crumbs={<Crumb icon={ActivityIcon}>Activity</Crumb>}>{body}</ClassicPage>
}
