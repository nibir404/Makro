"use client"

import { Suspense } from "react"
import { KafkaCatalog } from "@/components/screens/kafka/catalog"

export default function Page() {
  return (
    <Suspense>
      <KafkaCatalog />
    </Suspense>
  )
}
