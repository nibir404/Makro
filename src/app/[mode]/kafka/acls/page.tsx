"use client"

import { Suspense } from "react"
import { KafkaAcls } from "@/components/screens/kafka/acls"

export default function Page() {
  return (
    <Suspense>
      <KafkaAcls />
    </Suspense>
  )
}
