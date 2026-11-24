"use client"

import { Suspense } from "react"
import { AccessLogScreen } from "@/components/screens/secrets/pages"

export default function Page() {
  return (
    <Suspense>
      <AccessLogScreen />
    </Suspense>
  )
}
