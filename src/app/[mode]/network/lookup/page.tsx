"use client"

import { Suspense } from "react"
import { LookupScreen } from "@/components/screens/network/lookup"

export default function Page() {
  return (
    <Suspense>
      <LookupScreen />
    </Suspense>
  )
}
