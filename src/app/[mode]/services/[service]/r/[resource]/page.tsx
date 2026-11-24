"use client"

import { Suspense, use } from "react"
import { ServiceResources } from "@/components/screens/service/resources"

export default function ResourcePage({ params }: { params: Promise<{ service: string; resource: string }> }) {
  const { service, resource } = use(params)
  return (
    <Suspense>
      <ServiceResources service={service} resource={resource} />
    </Suspense>
  )
}
