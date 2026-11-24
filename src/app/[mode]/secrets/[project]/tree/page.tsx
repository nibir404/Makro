"use client"

import { Suspense } from "react"
import { TreeScreen } from "@/components/screens/secrets/tree"

export default function Page() {
  return (
    <Suspense>
      <TreeScreen />
    </Suspense>
  )
}
