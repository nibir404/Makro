"use client"

import { Suspense, use } from "react"
import { DeploysScreen } from "@/components/screens/service-ops/deploys"

export default function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = use(params)
  return (
    <Suspense>
      <DeploysScreen service={service} />
    </Suspense>
  )
}
