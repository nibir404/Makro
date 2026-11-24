"use client"

import { Suspense, use } from "react"
import { MetricsScreen } from "@/components/screens/service-ops/metrics"

export default function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = use(params)
  return (
    <Suspense>
      <MetricsScreen service={service} />
    </Suspense>
  )
}
