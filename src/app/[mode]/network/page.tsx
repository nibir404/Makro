"use client"

import { Suspense } from "react"
import { NetworkPageSwitch } from "@/components/screens/network/grants"

export default function Page() {
  return (
    <Suspense>
      <NetworkPageSwitch />
    </Suspense>
  )
}
