"use client"

import { Suspense } from "react"
import { ReviewScreen } from "@/components/screens/network/review"

export default function Page() {
  return (
    <Suspense>
      <ReviewScreen />
    </Suspense>
  )
}
