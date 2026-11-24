"use client"

import { Suspense } from "react"
import { SecretsIndex } from "@/components/screens/secrets/pages"

export default function Page() {
  return (
    <Suspense>
      <SecretsIndex />
    </Suspense>
  )
}
