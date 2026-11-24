"use client"

import { Suspense, use } from "react"
import { SettingsScreen } from "@/components/screens/service-ops/settings"

export default function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = use(params)
  return (
    <Suspense>
      <SettingsScreen service={service} />
    </Suspense>
  )
}
