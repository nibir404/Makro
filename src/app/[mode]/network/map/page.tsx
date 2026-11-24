"use client"

import { Suspense } from "react"
import { AccessMapScreen } from "@/components/screens/network/map"

export default function Page() {
  return (
    <Suspense>
      <AccessMapScreen />
    </Suspense>
  )
}
