"use client"

import { Suspense, use } from "react"
import { ServiceResources } from "@/components/screens/service/resources"

export default function ServicePage({ params }: { params: Promise<{ service: string }> }) {
  const { service } = use(params)
  return (
    <Suspense>
      <ServiceResources service={service} />
    </Suspense>
  )
}
