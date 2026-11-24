"use client"

import { Suspense } from "react"
import { GrantsScreen } from "@/components/screens/network/grants"

export default function Page() {
  return (
    <Suspense>
      <GrantsScreen initialRequest />
    </Suspense>
  )
}
