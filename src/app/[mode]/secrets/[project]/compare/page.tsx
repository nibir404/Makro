"use client"

import { Suspense } from "react"
import { CompareScreen } from "@/components/screens/secrets/pages"

export default function Page() {
  return (
    <Suspense>
      <CompareScreen />
    </Suspense>
  )
}
