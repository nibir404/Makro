"use client"

import { Suspense } from "react"
import { KafkaUsers } from "@/components/screens/kafka/users"

export default function Page() {
  return (
    <Suspense>
      <KafkaUsers />
    </Suspense>
  )
}
